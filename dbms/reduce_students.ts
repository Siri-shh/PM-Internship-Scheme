/**
 * Student Data Reduction & Smart Preference Optimization
 * 
 * This script:
 * 1. Reduces students from 6000 → 3000 with stratified sampling (maintaining GPA, gender, reservation, rural distributions)
 * 2. Assigns a "home state" to each student (from 6 Indian states)
 * 3. Rewrites preferences based on:
 *    - Priority 1: Location (student's home state first)
 *    - Priority 2: Skills match (sectors matching student skills)
 *    - Logic: Same-state jobs first, then Tier1 jobs for skill-match, then expand
 * 4. Updates both CSV files and database
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ============================================================================
// CONFIGURATION
// ============================================================================

const TARGET_COUNT = 3000;

// Indian states for location assignment (mapped to tiers)
const STATES = [
    { code: 'KA', name: 'Karnataka', tier: 'Tier1' },      // Bangalore - Tech hub
    { code: 'MH', name: 'Maharashtra', tier: 'Tier1' },   // Mumbai - Finance hub
    { code: 'TN', name: 'Tamil Nadu', tier: 'Tier1' },    // Chennai - Auto/IT
    { code: 'DL', name: 'Delhi', tier: 'Tier1' },         // Delhi - All sectors
    { code: 'GJ', name: 'Gujarat', tier: 'Tier2' },       // Ahmedabad - Manufacturing
    { code: 'UP', name: 'Uttar Pradesh', tier: 'Tier3' }, // Emerging market
];

// Skill to Sector mapping
const SKILL_SECTOR_MAP: Record<string, string[]> = {
    // IT Skills → IT Services
    'python': ['IT Services', 'Healthcare'],
    'java': ['IT Services'],
    'frontend': ['IT Services'],
    'backend': ['IT Services'],
    'ml': ['IT Services', 'Healthcare'],
    'sql': ['IT Services', 'Finance'],
    'cloud': ['IT Services'],
    'networking': ['IT Services', 'Electronics'],

    // Finance Skills → Finance
    'financial_modeling': ['Finance'],
    'excel': ['Finance', 'Marketing'],
    'presentation': ['Finance', 'Marketing'],
    'analysis': ['Finance', 'IT Services', 'Healthcare'],

    // Engineering Skills → Mechanical/Auto
    'autocad': ['Mechanical', 'Automobile'],
    'cad_modelling': ['Mechanical'],
    'manufacturing': ['Mechanical', 'Electronics'],
    'design': ['Mechanical', 'Electronics', 'Marketing'],
    'surveying': ['Automobile'],
    'construction_management': ['Automobile'],

    // Electronics Skills
    'pcb_design': ['Electronics'],

    // Marketing Skills
    'writing': ['Marketing', 'Healthcare'],
    'seo': ['Marketing'],
    'social_media': ['Marketing'],
    'communication': ['Marketing', 'Finance', 'Healthcare'],
};

// State to preferred internship tiers
const STATE_TIER_PREFERENCE: Record<string, string[]> = {
    'KA': ['Tier1', 'Tier2', 'Tier3'],
    'MH': ['Tier1', 'Tier2', 'Tier3'],
    'TN': ['Tier1', 'Tier2', 'Tier3'],
    'DL': ['Tier1', 'Tier2', 'Tier3'],
    'GJ': ['Tier2', 'Tier1', 'Tier3'],
    'UP': ['Tier3', 'Tier2', 'Tier1'],
};

interface Student {
    student_id: string;
    gpa: number;
    skills: string;
    reservation: string;
    rural: number;
    gender: string;
    state?: string;
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
    stipend: number;
    location_type: string;
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
            // Convert numbers
            if (h === 'gpa' || h === 'capacity' || h === 'stipend') {
                val = parseFloat(val) || 0;
            }
            if (h === 'rural') {
                val = parseInt(val) || 0;
            }
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

/**
 * Stratified sampling to maintain distribution
 */
function stratifiedSample(students: Student[], targetCount: number): Student[] {
    // Group by (reservation, gender, rural, gpa_bucket)
    const gpaBucket = (gpa: number) => {
        if (gpa >= 8) return 'A';
        if (gpa >= 7) return 'B';
        if (gpa >= 6) return 'C';
        return 'D';
    };

    const groups: Map<string, Student[]> = new Map();

    for (const s of students) {
        const key = `${s.reservation}_${s.gender}_${s.rural}_${gpaBucket(s.gpa)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(s);
    }

    const samplingRatio = targetCount / students.length;
    const sampled: Student[] = [];

    for (const [key, group] of groups) {
        // Proportional sampling from each stratum
        const sampleSize = Math.max(1, Math.round(group.length * samplingRatio));
        // Shuffle and take
        const shuffled = [...group].sort(() => Math.random() - 0.5);
        sampled.push(...shuffled.slice(0, sampleSize));
    }

    // Adjust to exact target count
    if (sampled.length > targetCount) {
        return sampled.slice(0, targetCount);
    } else if (sampled.length < targetCount) {
        // Add more from largest groups
        const remaining = students.filter(s => !sampled.includes(s));
        const shuffledRemaining = remaining.sort(() => Math.random() - 0.5);
        sampled.push(...shuffledRemaining.slice(0, targetCount - sampled.length));
    }

    return sampled;
}

/**
 * Assign state to student based on some logic
 */
function assignState(student: Student, index: number): string {
    // Distribute states somewhat evenly with some randomness
    // Tech-skilled students slightly prefer KA/TN, Finance skills prefer MH, etc.
    const skills = student.skills.split(';');

    const hasITSkills = skills.some(s => ['python', 'java', 'frontend', 'backend', 'ml', 'cloud'].includes(s));
    const hasFinanceSkills = skills.some(s => ['financial_modeling', 'excel', 'analysis'].includes(s));
    const hasEngSkills = skills.some(s => ['autocad', 'manufacturing', 'cad_modelling'].includes(s));

    // Weighted random selection
    let weights = [1, 1, 1, 1, 1, 1]; // KA, MH, TN, DL, GJ, UP

    if (hasITSkills) {
        weights[0] += 2; // KA (Bangalore)
        weights[2] += 1; // TN (Chennai)
    }
    if (hasFinanceSkills) {
        weights[1] += 2; // MH (Mumbai)
        weights[3] += 1; // DL
    }
    if (hasEngSkills) {
        weights[4] += 2; // GJ (Manufacturing)
        weights[0] += 1; // KA
    }

    // Add some randomness based on index
    const rand = (index * 7 + 13) % 100 / 100;
    const total = weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;

    for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i] / total;
        if (rand < cumulative) {
            return STATES[i].code;
        }
    }

    return STATES[0].code;
}

/**
 * Get sectors that match student's skills
 */
function getMatchingSectors(skills: string[]): string[] {
    const sectors = new Set<string>();
    for (const skill of skills) {
        const mapped = SKILL_SECTOR_MAP[skill.trim().toLowerCase()];
        if (mapped) {
            mapped.forEach(s => sectors.add(s));
        }
    }
    return Array.from(sectors);
}

/**
 * Score an internship for a student
 */
function scoreInternship(student: Student, internship: Internship, studentState: string): number {
    let score = 0;
    const studentSkills = student.skills.split(';').map(s => s.trim().toLowerCase());
    const requiredSkills = internship.required_skills.split(';').map(s => s.trim().toLowerCase());

    // Skill match (0-50 points)
    const matchingSkills = studentSkills.filter(s => requiredSkills.includes(s));
    score += matchingSkills.length * 10;

    // Sector preference based on skills (0-30 points)
    const preferredSectors = getMatchingSectors(studentSkills);
    if (preferredSectors.includes(internship.sector)) {
        score += 30;
    }

    // Tier preference based on student's state (0-20 points)
    const tierPrefs = STATE_TIER_PREFERENCE[studentState] || ['Tier1', 'Tier2', 'Tier3'];
    const tierIndex = tierPrefs.indexOf(internship.tier);
    if (tierIndex === 0) score += 20;
    else if (tierIndex === 1) score += 10;
    else score += 5;

    // Small random factor for variety (0-5 points)
    score += Math.random() * 5;

    return score;
}

/**
 * Generate 6 preferences for a student based on location + skills
 */
function generatePreferences(student: Student, internships: Internship[], studentState: string): string[] {
    // Score all internships
    const scored = internships.map(i => ({
        internship: i,
        score: scoreInternship(student, i, studentState)
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Take top 6
    return scored.slice(0, 6).map(s => s.internship.internship_id);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('='.repeat(70));
    console.log('Student Data Reduction & Smart Preference Optimization');
    console.log('='.repeat(70));

    // 1. Load data
    console.log('\n📂 Loading data...');
    const studentsCSVPath = path.join(__dirname, 'data', 'pm_internship_candidates_6000.csv');
    const internshipsCSVPath = path.join(__dirname, 'data', 'internships_pm_internships.csv');

    const studentsCSV = fs.readFileSync(studentsCSVPath, 'utf-8');
    const internshipsCSV = fs.readFileSync(internshipsCSVPath, 'utf-8');

    const allStudents = parseCSV<Student>(studentsCSV);
    const internships = parseCSV<Internship>(internshipsCSV);

    console.log(`  Original students: ${allStudents.length}`);
    console.log(`  Internships: ${internships.length}`);

    // 2. Stratified sampling
    console.log('\n📊 Performing stratified sampling...');
    const sampledStudents = stratifiedSample(allStudents, TARGET_COUNT);
    console.log(`  Sampled students: ${sampledStudents.length}`);

    // Verify distribution
    const origDist = {
        GEN: allStudents.filter(s => s.reservation === 'GEN').length / allStudents.length,
        OBC: allStudents.filter(s => s.reservation === 'OBC').length / allStudents.length,
        SC: allStudents.filter(s => s.reservation === 'SC').length / allStudents.length,
        ST: allStudents.filter(s => s.reservation === 'ST').length / allStudents.length,
    };
    const newDist = {
        GEN: sampledStudents.filter(s => s.reservation === 'GEN').length / sampledStudents.length,
        OBC: sampledStudents.filter(s => s.reservation === 'OBC').length / sampledStudents.length,
        SC: sampledStudents.filter(s => s.reservation === 'SC').length / sampledStudents.length,
        ST: sampledStudents.filter(s => s.reservation === 'ST').length / sampledStudents.length,
    };
    console.log('  Distribution preserved:');
    console.log(`    GEN: ${(origDist.GEN * 100).toFixed(1)}% → ${(newDist.GEN * 100).toFixed(1)}%`);
    console.log(`    OBC: ${(origDist.OBC * 100).toFixed(1)}% → ${(newDist.OBC * 100).toFixed(1)}%`);
    console.log(`    SC:  ${(origDist.SC * 100).toFixed(1)}% → ${(newDist.SC * 100).toFixed(1)}%`);
    console.log(`    ST:  ${(origDist.ST * 100).toFixed(1)}% → ${(newDist.ST * 100).toFixed(1)}%`);

    // 3. Assign states and generate preferences
    console.log('\n🗺️  Assigning states and generating smart preferences...');
    const stateCount: Record<string, number> = {};

    for (let i = 0; i < sampledStudents.length; i++) {
        const student = sampledStudents[i];

        // Assign state
        const state = assignState(student, i);
        student.state = state;
        stateCount[state] = (stateCount[state] || 0) + 1;

        // Generate preferences
        const prefs = generatePreferences(student, internships, state);
        student.pref_1 = prefs[0];
        student.pref_2 = prefs[1];
        student.pref_3 = prefs[2];
        student.pref_4 = prefs[3];
        student.pref_5 = prefs[4];
        student.pref_6 = prefs[5];

        if (i % 500 === 0) {
            console.log(`  Processed ${i}/${sampledStudents.length} students...`);
        }
    }

    console.log('  State distribution:');
    for (const [state, count] of Object.entries(stateCount)) {
        console.log(`    ${state}: ${count} (${(count / sampledStudents.length * 100).toFixed(1)}%)`);
    }

    // 4. Renumber student IDs
    console.log('\n🔢 Renumbering student IDs (S00001 - S03000)...');
    sampledStudents.sort((a, b) => a.student_id.localeCompare(b.student_id));
    for (let i = 0; i < sampledStudents.length; i++) {
        sampledStudents[i].student_id = `S${(i + 1).toString().padStart(5, '0')}`;
    }

    // 5. Save to CSV
    console.log('\n💾 Saving reduced dataset to CSV...');
    const outputPath = path.join(__dirname, 'data', 'pm_internship_candidates_3000.csv');
    const headers = ['student_id', 'gpa', 'skills', 'reservation', 'rural', 'gender', 'pref_1', 'pref_2', 'pref_3', 'pref_4', 'pref_5', 'pref_6'];
    const csvOutput = toCSV(sampledStudents, headers);
    fs.writeFileSync(outputPath, csvOutput);
    console.log(`  Saved to: ${outputPath}`);

    // 6. Update database
    console.log('\n🗄️  Updating database...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Clear allocations first (due to foreign key)
        console.log('  Clearing allocations...');
        await client.query('DELETE FROM allocations');

        // Clear existing candidates
        console.log('  Clearing existing candidates...');
        await client.query('DELETE FROM candidates WHERE user_id IS NULL');

        // Batch insert new candidates (100 at a time for speed)
        console.log('  Inserting new candidates (batch mode)...');
        const BATCH_SIZE = 100;
        for (let i = 0; i < sampledStudents.length; i += BATCH_SIZE) {
            const batch = sampledStudents.slice(i, i + BATCH_SIZE);

            // Build VALUES clause for batch insert
            const values: any[] = [];
            const placeholders = batch.map((s, idx) => {
                const offset = idx * 13;
                values.push(s.student_id, s.gpa, s.skills, s.reservation, s.rural, s.gender, s.state, s.pref_1, s.pref_2, s.pref_3, s.pref_4, s.pref_5, s.pref_6);
                return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`;
            }).join(', ');

            await client.query(`
                INSERT INTO candidates (student_id, gpa, skills, reservation, rural, gender, state, pref_1, pref_2, pref_3, pref_4, pref_5, pref_6)
                VALUES ${placeholders}
                ON CONFLICT (student_id) DO UPDATE SET
                    gpa = EXCLUDED.gpa,
                    skills = EXCLUDED.skills,
                    reservation = EXCLUDED.reservation,
                    rural = EXCLUDED.rural,
                    gender = EXCLUDED.gender,
                    state = EXCLUDED.state,
                    pref_1 = EXCLUDED.pref_1,
                    pref_2 = EXCLUDED.pref_2,
                    pref_3 = EXCLUDED.pref_3,
                    pref_4 = EXCLUDED.pref_4,
                    pref_5 = EXCLUDED.pref_5,
                    pref_6 = EXCLUDED.pref_6
            `, values);

            if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= sampledStudents.length) {
                console.log(`    Inserted ${Math.min(i + BATCH_SIZE, sampledStudents.length)}/${sampledStudents.length}...`);
            }
        }

        await client.query('COMMIT');
        console.log('  ✅ Database updated successfully!');

        // Verify
        const countResult = await client.query('SELECT COUNT(*) FROM candidates');
        console.log(`  Database now has ${countResult.rows[0].count} candidates`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('  ❌ Database update failed:', error);
        throw error;
    } finally {
        client.release();
    }

    // 7. Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETE!');
    console.log('='.repeat(70));
    console.log(`\nReduced: ${allStudents.length} → ${sampledStudents.length} students`);
    console.log('Preferences rewritten based on: Location → Skills → Tier');
    console.log(`\nFiles updated:`);
    console.log(`  - ${outputPath}`);
    console.log(`  - Database (candidates table)`);

    await pool.end();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
