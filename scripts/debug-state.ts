import { pool } from "./server/db";

async function debugInternshipData() {
    const client = await pool.connect();

    try {
        console.log("🔍 Debugging internship data flow...\n");

        // Get raw data from database
        const result = await client.query(`
      SELECT internship_id, sector, tier, state, company_id
      FROM internships 
      LIMIT 5
    `);

        console.log("📊 Raw database data:");
        console.table(result.rows);

        // Check if state values exist
        const stateCount = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(state) as with_state,
        COUNT(*) - COUNT(state) as without_state
      FROM internships
    `);

        console.log("\n📍 State field status:");
        console.table(stateCount.rows);

        // Show distinct states
        const states = await client.query(`
      SELECT DISTINCT state, COUNT(*) as count 
      FROM internships 
      GROUP BY state
      ORDER BY count DESC
    `);

        console.log("\n📍 States in database:");
        console.table(states.rows);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

debugInternshipData();
