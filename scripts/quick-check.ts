import { pool } from "./server/db";

async function quickCheck() {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM internships');
        console.log("✅ Database OK! Internships count:", result.rows[0].count);

        // Check most recent
        const recent = await pool.query('SELECT internship_id, tier, state FROM internships ORDER BY internship_id DESC LIMIT 3');
        console.log("\n📊 Recent internships:");
        console.table(recent.rows);
    } catch (e: any) {
        console.error("❌ Database error:", e.message);
    } finally {
        await pool.end();
    }
}

quickCheck();
