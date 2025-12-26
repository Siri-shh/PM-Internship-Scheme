// Sync candidates to all partitioned tables and update preference_count
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// State to region mapping
const STATE_REGION: Record<string, string> = {
    'KA': 'south',  // Karnataka
    'TN': 'south',  // Tamil Nadu
    'KL': 'south',  // Kerala
    'AP': 'south',  // Andhra Pradesh
    'TG': 'south',  // Telangana
    'MH': 'west',   // Maharashtra
    'GJ': 'west',   // Gujarat
    'RJ': 'west',   // Rajasthan
    'DL': 'north',  // Delhi
    'UP': 'north',  // Uttar Pradesh
    'HR': 'north',  // Haryana
    'PB': 'north',  // Punjab
    'WB': 'east',   // West Bengal
    'OR': 'east',   // Odisha
    'BH': 'east',   // Bihar
    'JH': 'east',   // Jharkhand
};

async function main() {
    const client = await pool.connect();

    try {
        console.log('=== Syncing candidates to regional partitioned tables ===\n');

        // Get current candidates from main table
        const candidates = await client.query('SELECT * FROM candidates');
        console.log(`Main candidates table: ${candidates.rows.length} rows`);

        // Group by region
        const byRegion: Record<string, any[]> = { north: [], south: [], east: [], west: [] };

        for (const c of candidates.rows) {
            const region = STATE_REGION[c.state] || 'north'; // Default to north if unknown
            byRegion[region].push(c);
        }

        console.log('\nDistribution by region:');
        for (const [region, rows] of Object.entries(byRegion)) {
            console.log(`  ${region}: ${rows.length}`);
        }

        // Sync each regional table
        for (const [region, rows] of Object.entries(byRegion)) {
            const tableName = `candidates_${region}`;

            // Check if table exists
            const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [tableName]);

            if (!tableCheck.rows[0].exists) {
                console.log(`\n⚠️  Table ${tableName} does not exist, skipping...`);
                continue;
            }

            console.log(`\n📋 Syncing ${tableName}...`);

            // Clear and insert
            await client.query(`DELETE FROM ${tableName}`);

            if (rows.length === 0) {
                console.log(`  No rows to insert`);
                continue;
            }

            // Batch insert
            const BATCH_SIZE = 100;
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);

                const values: any[] = [];
                const placeholders = batch.map((c, idx) => {
                    const offset = idx * 13;
                    values.push(
                        c.student_id, c.gpa, c.skills, c.reservation, c.rural, c.gender,
                        c.state, c.pref_1, c.pref_2, c.pref_3, c.pref_4, c.pref_5, c.pref_6
                    );
                    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`;
                }).join(', ');

                await client.query(`
          INSERT INTO ${tableName} (student_id, gpa, skills, reservation, rural, gender, state, pref_1, pref_2, pref_3, pref_4, pref_5, pref_6)
          VALUES ${placeholders}
        `, values);
            }

            console.log(`  ✅ Inserted ${rows.length} rows`);
        }

        // Update preference_count in internships table
        console.log('\n=== Updating preference_count in internships ===');

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

        for (const row of prefCounts.rows) {
            await client.query(
                'UPDATE internships SET preference_count = $1 WHERE internship_id = $2',
                [row.total_prefs, row.internship_id]
            );
        }
        console.log(`Updated preference_count for ${prefCounts.rows.length} internships`);

        // Show summary
        console.log('\n=== SYNC COMPLETE ===');
        for (const [region, rows] of Object.entries(byRegion)) {
            const count = await client.query(`SELECT COUNT(*) FROM candidates_${region}`);
            console.log(`  candidates_${region}: ${count.rows[0].count} rows`);
        }

        const mainCount = await client.query('SELECT COUNT(*) FROM candidates');
        console.log(`  candidates (main): ${mainCount.rows[0].count} rows`);

    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(console.error);
