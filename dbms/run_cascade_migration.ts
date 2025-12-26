// Script to add CASCADE DELETE constraints to the database
// Run with: npx tsx dbms/run_cascade_migration.ts

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('Starting CASCADE DELETE migration...\n');

        // Step 1: Drop existing foreign key constraints
        console.log('Step 1: Dropping existing foreign key constraints...');

        const dropStatements = [
            `ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_user_id_users_id_fk`,
            `ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_user_id_users_id_fk`,
            `ALTER TABLE internships DROP CONSTRAINT IF EXISTS internships_company_id_companies_id_fk`,
            `ALTER TABLE allocations DROP CONSTRAINT IF EXISTS allocations_student_id_candidates_student_id_fk`,
            `ALTER TABLE allocations DROP CONSTRAINT IF EXISTS allocations_internship_id_internships_internship_id_fk`,
        ];

        for (const sql of dropStatements) {
            try {
                await client.query(sql);
                console.log(`  ✓ ${sql.split(' ')[2]}`);
            } catch (e: any) {
                console.log(`  ⚠ Skipped (may not exist): ${sql.split(' ')[4]}`);
            }
        }

        // Step 2: Add constraints with ON DELETE CASCADE
        console.log('\nStep 2: Adding CASCADE DELETE constraints...');

        const addStatements = [
            {
                name: 'candidates.user_id → users.id',
                sql: `ALTER TABLE candidates ADD CONSTRAINT candidates_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
            },
            {
                name: 'companies.user_id → users.id',
                sql: `ALTER TABLE companies ADD CONSTRAINT companies_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
            },
            {
                name: 'internships.company_id → companies.id',
                sql: `ALTER TABLE internships ADD CONSTRAINT internships_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE`
            },
            {
                name: 'allocations.student_id → candidates.student_id',
                sql: `ALTER TABLE allocations ADD CONSTRAINT allocations_student_id_candidates_student_id_fk FOREIGN KEY (student_id) REFERENCES candidates(student_id) ON DELETE CASCADE`
            },
            {
                name: 'allocations.internship_id → internships.internship_id',
                sql: `ALTER TABLE allocations ADD CONSTRAINT allocations_internship_id_internships_internship_id_fk FOREIGN KEY (internship_id) REFERENCES internships(internship_id) ON DELETE CASCADE`
            },
        ];

        for (const stmt of addStatements) {
            try {
                await client.query(stmt.sql);
                console.log(`  ✓ ${stmt.name} [CASCADE]`);
            } catch (e: any) {
                console.log(`  ✗ Failed: ${stmt.name} - ${e.message}`);
            }
        }

        // Step 3: Verify
        console.log('\nStep 3: Verifying constraints...');
        const verifyResult = await client.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `);

        console.log('\nForeign Key Constraints:');
        console.log('─'.repeat(60));
        for (const row of verifyResult.rows) {
            const status = row.delete_rule === 'CASCADE' ? '✓ CASCADE' : '✗ ' + row.delete_rule;
            console.log(`  ${row.table_name}.${row.column_name} → ${row.foreign_table} [${status}]`);
        }

        console.log('\n✅ Migration complete!');

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(console.error);
