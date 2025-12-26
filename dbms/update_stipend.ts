/**
 * Update all internship stipends to 5000
 */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updateStipends() {
    const client = await pool.connect();
    try {
        // Update all internships to have stipend = 5000
        const result = await client.query('UPDATE internships SET stipend = 5000');
        console.log(`✅ Updated ${result.rowCount} internships to stipend = 5000`);

        // Also update the CSV file
        console.log('\n📊 Verifying update:');
        const verify = await client.query('SELECT internship_id, stipend FROM internships LIMIT 5');
        verify.rows.forEach(row => {
            console.log(`   ${row.internship_id}: ₹${row.stipend}`);
        });
    } finally {
        client.release();
        await pool.end();
    }
}

updateStipends();
