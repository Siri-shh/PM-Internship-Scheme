/**
 * Migration script to create audit tables manually
 * Run with: npx tsx server/migrate-audit.ts
 */

import "dotenv/config";
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL must be set");
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAuditTables() {
    const client = await pool.connect();

    try {
        console.log("Creating audit tables...\n");

        // Create audit_sessions table
        console.log("1. Creating audit_sessions table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                login_at TIMESTAMP DEFAULT NOW(),
                logout_at TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            );
        `);
        console.log("   ✓ audit_sessions created");

        // Create audit_user_events table
        console.log("2. Creating audit_user_events table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_user_events (
                id SERIAL PRIMARY KEY,
                event_type TEXT NOT NULL,
                user_id INTEGER,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                performed_by INTEGER,
                performed_by_username TEXT,
                event_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("   ✓ audit_user_events created");

        // Create audit_allocation_runs table
        console.log("3. Creating audit_allocation_runs table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_allocation_runs (
                id SERIAL PRIMARY KEY,
                run_number INTEGER NOT NULL,
                run_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                run_by_username TEXT,
                run_at TIMESTAMP DEFAULT NOW(),
                completed_at TIMESTAMP,
                status TEXT NOT NULL,
                students_processed INTEGER,
                allocations_created INTEGER,
                duration_ms INTEGER,
                error_message TEXT
            );
        `);
        console.log("   ✓ audit_allocation_runs created");

        console.log("\n✅ All audit tables created successfully!");
        console.log("\nYour audit system is now ready. Log out and log back in to start tracking sessions.");

    } catch (error) {
        console.error("\n❌ Error creating tables:", error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createAuditTables();
