// Check partition structure
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    const result = await pool.query(`
    SELECT 
      inhrelid::regclass AS partition_name,
      pg_get_expr(c.relpartbound, c.oid) AS partition_bounds
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE inhparent = 'candidates_partitioned'::regclass
    ORDER BY 1
  `);

    console.log('Partitions of candidates_partitioned:');
    result.rows.forEach(r => console.log(`  ${r.partition_name}: ${r.partition_bounds}`));

    await pool.end();
}

main();
