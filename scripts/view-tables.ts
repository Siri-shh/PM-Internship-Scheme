import { pool } from "./server/db";

async function viewAllTables() {
    const client = await pool.connect();

    try {
        console.log("╔══════════════════════════════════════════════════════════════╗");
        console.log("║                    NEON DATABASE TABLES                      ║");
        console.log("╚══════════════════════════════════════════════════════════════╝\n");

        // List all tables with their schemas
        const tables = await client.query(`
      SELECT table_schema, table_name, 
             (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = t.table_schema) as columns
      FROM information_schema.tables t
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `);

        console.log("📋 ALL TABLES:");
        console.table(tables.rows);

        // Count rows in main tables
        console.log("\n📊 ROW COUNTS:");

        const counts = [
            { table: 'public.users', query: 'SELECT COUNT(*) FROM public.users' },
            { table: 'public.candidates', query: 'SELECT COUNT(*) FROM public.candidates' },
            { table: 'public.companies', query: 'SELECT COUNT(*) FROM public.companies' },
            { table: 'public.internships', query: 'SELECT COUNT(*) FROM public.internships' },
            { table: 'public.allocations', query: 'SELECT COUNT(*) FROM public.allocations' },
            { table: 'tier1_db.internships', query: 'SELECT COUNT(*) FROM tier1_db.internships' },
            { table: 'tier2_db.internships', query: 'SELECT COUNT(*) FROM tier2_db.internships' },
            { table: 'tier3_db.internships', query: 'SELECT COUNT(*) FROM tier3_db.internships' },
        ];

        for (const { table, query } of counts) {
            try {
                const result = await client.query(query);
                console.log(`  ${table}: ${result.rows[0].count} rows`);
            } catch {
                console.log(`  ${table}: (table not found)`);
            }
        }

        // Show internships sample
        console.log("\n\n📝 INTERNSHIPS TABLE (recent 10):");
        const internships = await client.query(`
      SELECT internship_id, company_id, sector, tier, state, capacity 
      FROM public.internships 
      ORDER BY internship_id DESC 
      LIMIT 10
    `);
        console.table(internships.rows);

        // Show candidates sample
        console.log("\n👥 CANDIDATES TABLE (sample 5):");
        const candidates = await client.query(`
      SELECT student_id, name, gpa, state, reservation 
      FROM public.candidates 
      LIMIT 5
    `);
        console.table(candidates.rows);

        // Show companies
        console.log("\n🏢 COMPANIES TABLE:");
        const companies = await client.query(`SELECT * FROM public.companies`);
        console.table(companies.rows);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

viewAllTables();
