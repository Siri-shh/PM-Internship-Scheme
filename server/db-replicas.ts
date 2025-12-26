import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

/**
 * Database Connection Manager with Read Replica Support
 * 
 * This module provides connection routing for:
 * - Primary DB (all writes)
 * - Read Replicas (read queries, geographically distributed)
 */

// Connection configuration
const PRIMARY_URL = process.env.DATABASE_URL!;
const REPLICA_NORTH_URL = process.env.DATABASE_REPLICA_NORTH_URL || PRIMARY_URL;
const REPLICA_SOUTH_URL = process.env.DATABASE_REPLICA_SOUTH_URL || PRIMARY_URL;

// Connection pools
let primaryPool: Pool | null = null;
let replicaNorthPool: Pool | null = null;
let replicaSouthPool: Pool | null = null;

// Get primary database pool (for writes)
export function getPrimaryPool(): Pool {
    if (!primaryPool) {
        primaryPool = new Pool({
            connectionString: PRIMARY_URL,
            max: 20, // Maximum connections
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        console.log('Primary DB pool initialized');
    }
    return primaryPool;
}

// Get read replica pool based on user's region
export function getReplicaPool(region?: string): Pool {
    // Default to primary if replicas not configured
    if (REPLICA_NORTH_URL === PRIMARY_URL && REPLICA_SOUTH_URL === PRIMARY_URL) {
        return getPrimaryPool();
    }

    switch (region?.toLowerCase()) {
        case 'north':
        case 'up':
        case 'hr':
        case 'dl':
        case 'pb':
            if (!replicaNorthPool) {
                replicaNorthPool = new Pool({
                    connectionString: REPLICA_NORTH_URL,
                    max: 30, // Higher for reads
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                });
                console.log('North replica pool initialized');
            }
            return replicaNorthPool;

        case 'south':
        case 'tn':
        case 'ka':
        case 'kl':
        case 'ap':
            if (!replicaSouthPool) {
                replicaSouthPool = new Pool({
                    connectionString: REPLICA_SOUTH_URL,
                    max: 30,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                });
                console.log('South replica pool initialized');
            }
            return replicaSouthPool;

        default:
            // Fallback to primary for unknown regions
            return getPrimaryPool();
    }
}

// Determine query type and route to appropriate database
export type QueryType = 'read' | 'write';

export function getDbForQuery(queryType: QueryType, userRegion?: string) {
    if (queryType === 'write') {
        // All writes go to primary
        return drizzle(getPrimaryPool());
    }

    // Reads can go to replicas
    return drizzle(getReplicaPool(userRegion));
}

// Connection health check
export async function checkDbHealth(): Promise<{
    primary: boolean;
    replicaNorth: boolean;
    replicaSouth: boolean;
}> {
    const checkPool = async (pool: Pool | null): Promise<boolean> => {
        if (!pool) return false;
        try {
            const client = await pool.connect();
            await client.query('SELECT 1');
            client.release();
            return true;
        } catch {
            return false;
        }
    };

    return {
        primary: await checkPool(primaryPool),
        replicaNorth: await checkPool(replicaNorthPool),
        replicaSouth: await checkPool(replicaSouthPool),
    };
}

// Graceful shutdown
export async function closeAllPools(): Promise<void> {
    const pools = [primaryPool, replicaNorthPool, replicaSouthPool];
    await Promise.all(
        pools.filter(Boolean).map(pool => pool!.end())
    );
    console.log('All database pools closed');
}

/**
 * INFRASTRUCTURE SETUP NOTES:
 * 
 * To enable read replicas:
 * 
 * 1. PostgreSQL Streaming Replication:
 *    - Configure primary: postgresql.conf -> wal_level = replica
 *    - Create replication user: CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'xxx'
 *    - Configure pg_hba.conf for replication connections
 * 
 * 2. Create replica server:
 *    - pg_basebackup from primary
 *    - Configure recovery.conf / standby.signal
 * 
 * 3. Set environment variables:
 *    - DATABASE_URL=primary_connection_string
 *    - DATABASE_REPLICA_NORTH_URL=north_replica_connection_string
 *    - DATABASE_REPLICA_SOUTH_URL=south_replica_connection_string
 * 
 * 4. Cloud providers simplify this:
 *    - AWS RDS: Enable Multi-AZ, create read replicas
 *    - Railway: Not natively supported, use external replication
 *    - Supabase: Read replicas available on Pro plan
 */
