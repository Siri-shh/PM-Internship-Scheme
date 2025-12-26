// Check and update preference counts in internships table
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    const client = await pool.connect();

    try {
        // Check internship table columns
        console.log('=== Checking internship table structure ===');
        const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'internships'
      ORDER BY ordinal_position
    `);
        console.log('Internship columns:');
        cols.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

        // Check if preference_count exists
        const hasPrefCount = cols.rows.some(r => r.column_name === 'preference_count');
        console.log(`\npreference_count column exists: ${hasPrefCount}`);

        // Count preferences for each internship
        console.log('\n=== Counting preferences per internship ===');
        const prefCounts = await client.query(`
      SELECT internship_id, COUNT(*) as total_prefs FROM (
        SELECT pref_1 as internship_id FROM candidates WHERE pref_1 IS NOT NULL
        UNION ALL SELECT pref_2 FROM candidates WHERE pref_2 IS NOT NULL
        UNION ALL SELECT pref_3 FROM candidates WHERE pref_3 IS NOT NULL
        UNION ALL SELECT pref_4 FROM candidates WHERE pref_4 IS NOT NULL
        UNION ALL SELECT pref_5 FROM candidates WHERE pref_5 IS NOT NULL
        UNION ALL SELECT pref_6 FROM candidates WHERE pref_6 IS NOT NULL
      ) prefs
      GROUP BY internship_id
      ORDER BY internship_id
    `);

        console.log('Top 10 most preferred internships:');
        const sorted = [...prefCounts.rows].sort((a, b) => Number(b.total_prefs) - Number(a.total_prefs));
        sorted.slice(0, 10).forEach(r => console.log(`  ${r.internship_id}: ${r.total_prefs} preferences`));

        // If preference_count column exists, update it
        if (hasPrefCount) {
            console.log('\n=== Updating preference_count in internships table ===');
            for (const row of prefCounts.rows) {
                await client.query(
                    'UPDATE internships SET preference_count = $1 WHERE internship_id = $2',
                    [row.total_prefs, row.internship_id]
                );
            }
            console.log(`Updated ${prefCounts.rows.length} internship preference counts`);
        } else {
            console.log('\n⚠️  preference_count column does not exist in internships table');
            console.log('If you need it, run: ALTER TABLE internships ADD COLUMN preference_count INTEGER DEFAULT 0;');
        }

        // Check partitioned candidate tables
        console.log('\n=== Checking for partitioned candidate tables ===');
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'candidates%'
      ORDER BY table_name
    `);
        console.log('Candidate-related tables:');
        tables.rows.forEach(r => console.log(`  - ${r.table_name}`));

    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(console.error);
