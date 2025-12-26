import { pool } from "./server/db";

async function checkInternshipState() {
    const client = await pool.connect();

    try {
        console.log("🔍 Checking internship state column...\n");

        // First check the actual columns in internships table
        const columnsCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'internships'
      ORDER BY ordinal_position
    `);

        console.log("📋 Columns in internships table:");
        console.table(columnsCheck.rows);

        // Check if state column exists
        const stateExists = columnsCheck.rows.some((r: any) => r.column_name === 'state');
        console.log("\n✓ State column exists:", stateExists);

        // Check some internship records
        const internships = await client.query(`
      SELECT * 
      FROM internships 
      LIMIT 5
    `);

        console.log("\n📊 Sample internships:");
        internships.rows.forEach((row: any, i: number) => {
            console.log(`\n--- Internship ${i + 1} ---`);
            console.log("Title:", row.title);
            console.log("Tier:", row.tier);
            console.log("State:", row.state);
        });

        // Count by state
        const stateCounts = await client.query(`
      SELECT state, COUNT(*) as count 
      FROM internships 
      GROUP BY state 
      ORDER BY count DESC
    `);

        console.log("\n\n📍 Internships by state:");
        console.table(stateCounts.rows);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkInternshipState();
