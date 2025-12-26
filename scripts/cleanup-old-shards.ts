import { pool } from "./server/db";

async function cleanupOldShards() {
    const client = await pool.connect();

    try {
        console.log("🧹 Cleaning up old shard tables from public schema...\n");

        // Drop old triggers first (if exists)
        console.log("Dropping old sync triggers...");
        await client.query(`DROP TRIGGER IF EXISTS sync_to_shards ON public.internships`);
        await client.query(`DROP TRIGGER IF EXISTS sync_internships_to_shard ON public.internships`);
        await client.query(`DROP FUNCTION IF EXISTS sync_internship_to_shard() CASCADE`);
        console.log("✓ Old triggers removed\n");

        // Drop the redundant shard tables
        const tables = ['internships_tier1', 'internships_tier2', 'internships_tier3'];

        for (const table of tables) {
            const checkResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [table]);

            if (checkResult.rows[0].exists) {
                await client.query(`DROP TABLE public.${table}`);
                console.log(`✓ Dropped public.${table}`);
            } else {
                console.log(`⚠ Table public.${table} doesn't exist (already removed)`);
            }
        }

        console.log("\n✅ Cleanup complete!");
        console.log("\n📊 Current architecture:");
        console.log("   public.internships (MASTER)");
        console.log("   tier1_db.internships (Maharashtra, Karnataka)");
        console.log("   tier2_db.internships (Gujarat, Telangana)");
        console.log("   tier3_db.internships (Uttar Pradesh, Rajasthan)");

    } catch (error) {
        console.error("Error during cleanup:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupOldShards();
