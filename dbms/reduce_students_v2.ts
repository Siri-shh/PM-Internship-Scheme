/**
 * Student Data Reduction & Smart Preference Optimization v2
 * 
 * FIXED: Now properly distributes students across ALL zones
 * 
 * Logic:
 * 1. Each student has a HOME STATE (where they live) - distributed across ALL Indian zones
 * 2. Each student has a PREFERRED WORK STATE (random from 6 internship states)
 * 3. Preferences are based on: Preferred State Tier + Skills → Sector matching
 */

import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ============================================================================
// CONFIGURATION
// ============================================================================

const TARGET_COUNT = 3000;

// 6 INTERNSHIP STATES (where internships are offered)
const INTERNSHIP_STATES = ['KA', 'MH', 'TN', 'DL', 'GJ', 'UP'];

// ALL INDIAN STATES for home location - MUST match partition definitions!
// Partitions: north=('UP','UK','HR','DL','PB','HP','JK','CH','RJ','BR','JH','MP'), south=('TN','KA','KL','AP','TG','PY'), 
//             east=('WB','OR','AS','SK','MN','NL','TR','ML','MZ','AR'), west=('MH','GJ','GA','CG')
const HOME_STATES_BY_ZONE: Record<string, string[]> = {
    north: ['UP', 'UK', 'HR', 'DL', 'PB', 'HP', 'RJ'],  // Valid partition states
    south: ['TN', 'KA', 'KL', 'AP', 'TG'],              // Valid partition states
    east: ['WB', 'OR', 'AS', 'SK', 'MN'],               // Valid partition states (NOT BH, JH)
    west: ['MH', 'GJ', 'GA', 'CG'],                     // Valid partition states (NOT MP)
};

// Flatten all home states
const ALL_HOME_STATES = Object.values(HOME_STATES_BY_ZONE).flat();

// Zone lookup
const STATE_TO_ZONE: Record<string, string> = {};
for (const [zone, states] of Object.entries(HOME_STATES_BY_ZONE)) {
    for (const state of states) {
        STATE_TO_ZONE[state] = zone;
    }
}

// Tier by preferred internship state
const STATE_TIER: Record<string, string> = {
    'KA': 'Tier1',
    'MH': 'Tier1',
    'TN': 'Tier1',
    'DL': 'Tier1',
    'GJ': 'Tier2',
    'UP': 'Tier3',
};

// Skill to Sector mapping
const SKILL_SECTOR_MAP: Record<string, string[]> = {
    'python': ['IT Services', 'Healthcare'],
    'java': ['IT Services'],
    'frontend': ['IT Services'],
    'backend': ['IT Services'],
    'ml': ['IT Services', 'Healthcare'],
    'sql': ['IT Services', 'Finance'],
    'cloud': ['IT Services'],
    'networking': ['IT Services', 'Electronics'],
    'financial_modeling': ['Finance'],
    'excel': ['Finance', 'Marketing'],
    'presentation': ['Finance', 'Marketing'],
    'analysis': ['Finance', 'IT Services', 'Healthcare'],
    'autocad': ['Mechanical', 'Automobile'],
    'cad_modelling': ['Mechanical'],
    'manufacturing': ['Mechanical', 'Electronics'],
    'design': ['Mechanical', 'Electronics', 'Marketing'],
    'surveying': ['Automobile'],
    'construction_management': ['Automobile'],
    'pcb_design': ['Electronics'],
    'writing': ['Marketing', 'Healthcare'],
    'seo': ['Marketing'],
    'social_media': ['Marketing'],
    'communication': ['Marketing', 'Finance', 'Healthcare'],
};

interface Student {
    student_id: string;
    gpa: number;
    skills: string;
    reservation: string;
    rural: number;
    gender: string;
    state: string;           // HOME state (where student lives)
    preferred_state?: string; // PREFERRED work location (for preferences)
    pref_1?: string;
    pref_2?: string;
    pref_3?: string;
    pref_4?: string;
    pref_5?: string;
    pref_6?: string;
}

interface Internship {
    internship_id: string;
    sector: string;
    tier: string;
    capacity: number;
    required_skills: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseCSV<T>(content: string): T[] {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((h, i) => {
            let val: any = values[i]?.trim() || '';
            if (h === 'gpa' || h === 'capacity' || h === 'stipend') val = parseFloat(val) || 0;
            if (h === 'rural') val = parseInt(val) || 0;
            obj[h] = val;
        });
        return obj as T;
    });
}

function toCSV(data: any[], headers: string[]): string {
    const lines = [headers.join(',')];
    for (const row of data) {
        lines.push(headers.map(h => row[h] ?? '').join(','));
    }
    return lines.join('\n');
}

function stratifiedSample(students: Student[], targetCount: number): Student[] {
    const gpaBucket = (gpa: number) => gpa >= 8 ? 'A' : gpa >= 7 ? 'B' : gpa >= 6 ? 'C' : 'D';
    const groups: Map<string, Student[]> = new Map();

    for (const s of students) {
        const key = `${s.reservation}_${s.gender}_${s.rural}_${gpaBucket(s.gpa)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(s);
    }

    const samplingRatio = targetCount / students.length;
    const sampled: Student[] = [];

    for (const [, group] of groups) {
        const sampleSize = Math.max(1, Math.round(group.length * samplingRatio));
        const shuffled = [...group].sort(() => Math.random() - 0.5);
        sampled.push(...shuffled.slice(0, sampleSize));
    }

    if (sampled.length > targetCount) return sampled.slice(0, targetCount);
    if (sampled.length < targetCount) {
        const remaining = students.filter(s => !sampled.includes(s)).sort(() => Math.random() - 0.5);
        sampled.push(...remaining.slice(0, targetCount - sampled.length));
    }
    return sampled;
}

function getMatchingSectors(skills: string[]): string[] {
    const sectors = new Set<string>();
    for (const skill of skills) {
        const mapped = SKILL_SECTOR_MAP[skill.trim().toLowerCase()];
        if (mapped) mapped.forEach(s => sectors.add(s));
    }
    return Array.from(sectors);
}

function scoreInternship(student: Student, internship: Internship, preferredState: string): number {
    let score = 0;
    const studentSkills = student.skills.split(';').map(s => s.trim().toLowerCase());
    const requiredSkills = internship.required_skills.split(';').map(s => s.trim().toLowerCase());

    // Skill match (0-50)
    score += studentSkills.filter(s => requiredSkills.includes(s)).length * 10;

    // Sector preference (0-30)
    if (getMatchingSectors(studentSkills).includes(internship.sector)) score += 30;

    // Tier preference based on preferred state (0-20)
    const preferredTier = STATE_TIER[preferredState] || 'Tier1';
    if (internship.tier === preferredTier) score += 20;
    else if (internship.tier === 'Tier1') score += 15;
    else if (internship.tier === 'Tier2') score += 10;
    else score += 5;

    // Randomness for variety
    score += Math.random() * 5;

    return score;
}

function generatePreferences(student: Student, internships: Internship[], preferredState: string): string[] {
    const scored = internships.map(i => ({
        internship: i,
        score: scoreInternship(student, i, preferredState)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map(s => s.internship.internship_id);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('='.repeat(70));
    console.log('Student Data Reduction & Preference Optimization v2');
    console.log('='.repeat(70));

    // Load data
    console.log('\n📂 Loading data...');
    const studentsCSV = fs.readFileSync(path.join(__dirname, 'data', 'pm_internship_candidates_6000.csv'), 'utf-8');
    const internshipsCSV = fs.readFileSync(path.join(__dirname, 'data', 'internships_pm_internships.csv'), 'utf-8');

    const allStudents = parseCSV<Student>(studentsCSV);
    const internships = parseCSV<Internship>(internshipsCSV);

    console.log(`  Original: ${allStudents.length} students, ${internships.length} internships`);

    // Stratified sampling
    console.log('\n📊 Stratified sampling...');
    const sampledStudents = stratifiedSample(allStudents, TARGET_COUNT);
    console.log(`  Sampled: ${sampledStudents.length} students`);

    // Assign home states UNIFORMLY across zones
    console.log('\n🗺️  Assigning home states uniformly across ALL zones...');
    const zoneCount: Record<string, number> = { north: 0, south: 0, east: 0, west: 0 };
    const prefStateCount: Record<string, number> = {};

    for (let i = 0; i < sampledStudents.length; i++) {
        const student = sampledStudents[i];

        // Assign HOME state uniformly across zones
        const zoneIndex = i % 4;
        const zones = ['north', 'south', 'east', 'west'];
        const zone = zones[zoneIndex];
        const zoneStates = HOME_STATES_BY_ZONE[zone];
        const homeState = zoneStates[Math.floor(Math.random() * zoneStates.length)];
        student.state = homeState;
        zoneCount[zone]++;

        // Assign PREFERRED internship state randomly from 6 states
        const preferredState = INTERNSHIP_STATES[Math.floor(Math.random() * INTERNSHIP_STATES.length)];
        student.preferred_state = preferredState;
        prefStateCount[preferredState] = (prefStateCount[preferredState] || 0) + 1;

        // Generate preferences based on preferred state + skills
        const prefs = generatePreferences(student, internships, preferredState);
        student.pref_1 = prefs[0];
        student.pref_2 = prefs[1];
        student.pref_3 = prefs[2];
        student.pref_4 = prefs[3];
        student.pref_5 = prefs[4];
        student.pref_6 = prefs[5];

        if (i % 500 === 0) console.log(`  Processed ${i}/${sampledStudents.length}...`);
    }

    console.log('\n  Zone distribution (home states):');
    for (const [zone, count] of Object.entries(zoneCount)) {
        console.log(`    ${zone}: ${count} (${(count / sampledStudents.length * 100).toFixed(1)}%)`);
    }

    console.log('\n  Preferred work state distribution:');
    for (const [state, count] of Object.entries(prefStateCount).sort()) {
        console.log(`    ${state}: ${count} (${(count / sampledStudents.length * 100).toFixed(1)}%)`);
    }

    // Renumber IDs
    console.log('\n🔢 Renumbering student IDs...');
    sampledStudents.sort((a, b) => a.student_id.localeCompare(b.student_id));
    for (let i = 0; i < sampledStudents.length; i++) {
        sampledStudents[i].student_id = `S${(i + 1).toString().padStart(5, '0')}`;
    }

    // Save CSV (state column = home state)
    console.log('\n💾 Saving CSV...');
    const outputPath = path.join(__dirname, 'data', 'pm_internship_candidates_3000.csv');
    const headers = ['student_id', 'gpa', 'skills', 'reservation', 'rural', 'gender', 'pref_1', 'pref_2', 'pref_3', 'pref_4', 'pref_5', 'pref_6'];
    fs.writeFileSync(outputPath, toCSV(sampledStudents, headers));
    console.log(`  Saved: ${outputPath}`);

    // Update database
    console.log('\n🗄️  Updating database...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM allocations');
        await client.query('DELETE FROM candidates WHERE user_id IS NULL');

        // Batch insert to main table
        console.log('  Inserting to candidates table (batch)...');
        const BATCH_SIZE = 100;
        for (let i = 0; i < sampledStudents.length; i += BATCH_SIZE) {
            const batch = sampledStudents.slice(i, i + BATCH_SIZE);
            const values: any[] = [];
            const placeholders = batch.map((s, idx) => {
                const o = idx * 13;
                values.push(s.student_id, s.gpa, s.skills, s.reservation, s.rural, s.gender, s.state, s.pref_1, s.pref_2, s.pref_3, s.pref_4, s.pref_5, s.pref_6);
                return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9},$${o + 10},$${o + 11},$${o + 12},$${o + 13})`;
            }).join(',');

            await client.query(`
        INSERT INTO candidates (student_id,gpa,skills,reservation,rural,gender,state,pref_1,pref_2,pref_3,pref_4,pref_5,pref_6)
        VALUES ${placeholders}
        ON CONFLICT (student_id) DO UPDATE SET gpa=EXCLUDED.gpa,skills=EXCLUDED.skills,reservation=EXCLUDED.reservation,rural=EXCLUDED.rural,gender=EXCLUDED.gender,state=EXCLUDED.state,pref_1=EXCLUDED.pref_1,pref_2=EXCLUDED.pref_2,pref_3=EXCLUDED.pref_3,pref_4=EXCLUDED.pref_4,pref_5=EXCLUDED.pref_5,pref_6=EXCLUDED.pref_6
      `, values);
        }

        await client.query('COMMIT');

        // Update regional tables
        console.log('\n  Syncing regional tables...');
        const byZone: Record<string, Student[]> = { north: [], south: [], east: [], west: [] };
        for (const s of sampledStudents) {
            const zone = STATE_TO_ZONE[s.state] || 'north';
            byZone[zone].push(s);
        }

        for (const [zone, students] of Object.entries(byZone)) {
            const tableName = `candidates_${zone}`;
            await client.query(`DELETE FROM ${tableName}`);

            for (let i = 0; i < students.length; i += BATCH_SIZE) {
                const batch = students.slice(i, i + BATCH_SIZE);
                const values: any[] = [];
                const placeholders = batch.map((s, idx) => {
                    const o = idx * 13;
                    values.push(s.student_id, s.gpa, s.skills, s.reservation, s.rural, s.gender, s.state, s.pref_1, s.pref_2, s.pref_3, s.pref_4, s.pref_5, s.pref_6);
                    return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9},$${o + 10},$${o + 11},$${o + 12},$${o + 13})`;
                }).join(',');

                if (batch.length > 0) {
                    await client.query(`INSERT INTO ${tableName} (student_id,gpa,skills,reservation,rural,gender,state,pref_1,pref_2,pref_3,pref_4,pref_5,pref_6) VALUES ${placeholders}`, values);
                }
            }
            console.log(`    ${tableName}: ${students.length} rows`);
        }

        // Update preference counts
        console.log('\n  Updating preference_count...');
        const prefCounts = await client.query(`
      SELECT internship_id, COUNT(*) as total FROM (
        SELECT pref_1 as internship_id FROM candidates UNION ALL
        SELECT pref_2 FROM candidates UNION ALL
        SELECT pref_3 FROM candidates UNION ALL
        SELECT pref_4 FROM candidates UNION ALL
        SELECT pref_5 FROM candidates UNION ALL
        SELECT pref_6 FROM candidates
      ) p WHERE internship_id IS NOT NULL GROUP BY internship_id
    `);

        for (const r of prefCounts.rows) {
            await client.query('UPDATE internships SET preference_count = $1 WHERE internship_id = $2', [r.total, r.internship_id]);
        }
        console.log(`    Updated ${prefCounts.rows.length} internships`);

    } finally {
        client.release();
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETE!');
    console.log('='.repeat(70));

    await pool.end();
}

main().catch(console.error);
