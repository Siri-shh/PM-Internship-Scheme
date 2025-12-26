/**
 * Database Integrity Verification Script
 * Checks all tables, foreign keys, and data connections
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyDatabaseIntegrity() {
    const client = await pool.connect();

    console.log('======================================================================');
    console.log('DATABASE INTEGRITY VERIFICATION');
    console.log('======================================================================\n');

    try {
        // 1. Check all tables exist
        console.log('📋 1. CHECKING TABLES EXIST');
        console.log('----------------------------------------------------------------------');
        const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
        const tables = await client.query(tablesQuery);
        console.log('   Tables found:', tables.rows.length);
        tables.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));
        console.log();

        // 2. Check foreign key constraints
        console.log('🔗 2. CHECKING FOREIGN KEY CONSTRAINTS');
        console.log('----------------------------------------------------------------------');
        const fkQuery = `
      SELECT 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `;
        const fks = await client.query(fkQuery);
        console.log(`   Foreign keys found: ${fks.rows.length}`);
        fks.rows.forEach(row => {
            const cascadeIcon = row.delete_rule === 'CASCADE' ? '✅' : '⚠️';
            console.log(`   ${cascadeIcon} ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name} [ON DELETE ${row.delete_rule}]`);
        });
        console.log();

        // 3. Check row counts in all tables
        console.log('📊 3. TABLE ROW COUNTS');
        console.log('----------------------------------------------------------------------');
        const countQueries = [
            { name: 'users', query: 'SELECT COUNT(*) as count FROM users' },
            { name: 'companies', query: 'SELECT COUNT(*) as count FROM companies' },
            { name: 'candidates', query: 'SELECT COUNT(*) as count FROM candidates' },
            { name: 'internships', query: 'SELECT COUNT(*) as count FROM internships' },
            { name: 'allocations', query: 'SELECT COUNT(*) as count FROM allocations' },
            { name: 'candidates_north', query: 'SELECT COUNT(*) as count FROM candidates_north' },
            { name: 'candidates_south', query: 'SELECT COUNT(*) as count FROM candidates_south' },
            { name: 'candidates_east', query: 'SELECT COUNT(*) as count FROM candidates_east' },
            { name: 'candidates_west', query: 'SELECT COUNT(*) as count FROM candidates_west' },
        ];

        for (const cq of countQueries) {
            try {
                const result = await client.query(cq.query);
                console.log(`   ${cq.name}: ${result.rows[0].count} rows`);
            } catch (e: any) {
                console.log(`   ${cq.name}: ⚠️ Table not found or error`);
            }
        }
        console.log();

        // 4. Check data integrity - orphan records
        console.log('🔍 4. CHECKING FOR ORPHAN RECORDS');
        console.log('----------------------------------------------------------------------');

        // Check companies without valid users
        const orphanCompanies = await client.query(`
      SELECT COUNT(*) as count FROM companies c
      WHERE c.user_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = c.user_id)
    `);
        console.log(`   Companies with invalid user_id: ${orphanCompanies.rows[0].count}`);

        // Check allocations without valid students
        const orphanAllocStudents = await client.query(`
      SELECT COUNT(*) as count FROM allocations a
      WHERE NOT EXISTS (SELECT 1 FROM candidates c WHERE c.student_id = a.student_id)
    `);
        console.log(`   Allocations with invalid student_id: ${orphanAllocStudents.rows[0].count}`);

        // Check allocations without valid internships
        const orphanAllocInternships = await client.query(`
      SELECT COUNT(*) as count FROM allocations a
      WHERE NOT EXISTS (SELECT 1 FROM internships i WHERE i.internship_id = a.internship_id)
    `);
        console.log(`   Allocations with invalid internship_id: ${orphanAllocInternships.rows[0].count}`);
        console.log();

        // 5. Check preference integrity - all preferences point to valid internships
        console.log('🎯 5. CHECKING PREFERENCE INTEGRITY');
        console.log('----------------------------------------------------------------------');
        const prefChecks = ['pref_1', 'pref_2', 'pref_3', 'pref_4', 'pref_5', 'pref_6'];

        for (const pref of prefChecks) {
            const invalidPrefs = await client.query(`
        SELECT COUNT(*) as count FROM candidates c
        WHERE c.${pref} IS NOT NULL 
        AND c.${pref} != ''
        AND NOT EXISTS (SELECT 1 FROM internships i WHERE i.internship_id = c.${pref})
      `);
            const status = invalidPrefs.rows[0].count === '0' ? '✅' : '⚠️';
            console.log(`   ${status} ${pref}: ${invalidPrefs.rows[0].count} invalid references`);
        }
        console.log();

        // 6. Check regional table sync
        console.log('🗺️  6. CHECKING REGIONAL TABLE SYNC');
        console.log('----------------------------------------------------------------------');
        const mainCount = await client.query('SELECT COUNT(*) as count FROM candidates WHERE state IS NOT NULL');
        const northCount = await client.query('SELECT COUNT(*) as count FROM candidates_north');
        const southCount = await client.query('SELECT COUNT(*) as count FROM candidates_south');
        const eastCount = await client.query('SELECT COUNT(*) as count FROM candidates_east');
        const westCount = await client.query('SELECT COUNT(*) as count FROM candidates_west');

        const regionalTotal =
            parseInt(northCount.rows[0].count) +
            parseInt(southCount.rows[0].count) +
            parseInt(eastCount.rows[0].count) +
            parseInt(westCount.rows[0].count);

        console.log(`   Main candidates (with state): ${mainCount.rows[0].count}`);
        console.log(`   Regional tables total: ${regionalTotal}`);
        console.log(`   North: ${northCount.rows[0].count} | South: ${southCount.rows[0].count} | East: ${eastCount.rows[0].count} | West: ${westCount.rows[0].count}`);

        const syncStatus = parseInt(mainCount.rows[0].count) === regionalTotal ? '✅ SYNCED' : '⚠️ OUT OF SYNC';
        console.log(`   Status: ${syncStatus}`);
        console.log();

        // 7. Check internship capacity vs allocations
        console.log('📈 7. CHECKING CAPACITY vs ALLOCATIONS');
        console.log('----------------------------------------------------------------------');
        const capacityCheck = await client.query(`
      SELECT 
        i.internship_id,
        i.sector,
        i.capacity,
        COUNT(a.id) as allocated,
        i.capacity - COUNT(a.id) as remaining
      FROM internships i
      LEFT JOIN allocations a ON i.internship_id = a.internship_id
      GROUP BY i.internship_id, i.sector, i.capacity
      ORDER BY allocated DESC
      LIMIT 10
    `);
        console.log('   Top 10 internships by allocation:');
        capacityCheck.rows.forEach(row => {
            const status = row.allocated <= row.capacity ? '✅' : '❌';
            console.log(`   ${status} ${row.internship_id} (${row.sector}): ${row.allocated}/${row.capacity}`);
        });

        const overCapacity = await client.query(`
      SELECT COUNT(*) as count FROM (
        SELECT i.internship_id, i.capacity, COUNT(a.id) as allocated
        FROM internships i
        LEFT JOIN allocations a ON i.internship_id = a.internship_id
        GROUP BY i.internship_id, i.capacity
        HAVING COUNT(a.id) > i.capacity
      ) overcap
    `);
        console.log(`   Internships over capacity: ${overCapacity.rows[0].count}`);
        console.log();

        // 8. Check indexes for performance
        console.log('⚡ 8. CHECKING INDEXES');
        console.log('----------------------------------------------------------------------');
        const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
        const indexes = await client.query(indexQuery);
        console.log(`   Total indexes: ${indexes.rows.length}`);
        indexes.rows.forEach(row => {
            console.log(`   ✓ ${row.tablename}: ${row.indexname}`);
        });
        console.log();

        // 9. Summary
        console.log('======================================================================');
        console.log('✅ VERIFICATION COMPLETE');
        console.log('======================================================================');

        // Calculate overall status
        const issues = [];
        if (parseInt(orphanCompanies.rows[0].count) > 0) issues.push('Orphan companies');
        if (parseInt(orphanAllocStudents.rows[0].count) > 0) issues.push('Orphan allocations (students)');
        if (parseInt(orphanAllocInternships.rows[0].count) > 0) issues.push('Orphan allocations (internships)');
        if (parseInt(overCapacity.rows[0].count) > 0) issues.push('Over-capacity internships');

        if (issues.length === 0) {
            console.log('\n🎉 All checks passed! Database integrity is GOOD.');
        } else {
            console.log(`\n⚠️ Issues found: ${issues.join(', ')}`);
        }

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyDatabaseIntegrity();
