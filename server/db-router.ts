import { db } from './db.js';
import { sql } from 'drizzle-orm';

/**
 * Multi-Database Router for Internship Sharding
 * 
 * Routes queries to separate database schemas based on tier/state.
 * Each tier has its own isolated database (schema):
 *   - tier1_db: MH, KA (Metro Hubs)
 *   - tier2_db: GJ, TG (Growing Cities)
 *   - tier3_db: UP, RJ (Emerging Regions)
 */

// Shard mapping: State -> Database
const STATE_TO_DATABASE: Record<string, string> = {
    'MH': 'tier1_db', 'KA': 'tier1_db',  // Metro hubs
    'GJ': 'tier2_db', 'TG': 'tier2_db',  // Growing cities
    'UP': 'tier3_db', 'RJ': 'tier3_db',  // Emerging regions
};

// Tier to database mapping
const TIER_TO_DATABASE: Record<string, string> = {
    'Tier1': 'tier1_db',
    'Tier2': 'tier2_db',
    'Tier3': 'tier3_db',
};

// Database metadata for display
const DATABASE_INFO: Record<string, { name: string; states: string; description: string }> = {
    'tier1_db': { name: 'Tier 1 Database', states: 'MH, KA', description: 'Metro Hubs' },
    'tier2_db': { name: 'Tier 2 Database', states: 'GJ, TG', description: 'Growing Cities' },
    'tier3_db': { name: 'Tier 3 Database', states: 'UP, RJ', description: 'Emerging Regions' },
};

/**
 * Get the appropriate database for a given state
 */
export function getDatabaseForState(state: string): string {
    return STATE_TO_DATABASE[state] || 'public';
}

/**
 * Get the appropriate database for a given tier
 */
export function getDatabaseForTier(tier: string): string {
    return TIER_TO_DATABASE[tier] || 'public';
}

/**
 * Query internships from a SPECIFIC DATABASE (by state)
 * - Only queries the relevant database, not all
 * - Reduces load on other databases
 */
export async function getInternshipsFromDatabase(state: string): Promise<any[]> {
    const database = STATE_TO_DATABASE[state];

    if (!database) {
        console.log(`[DB Router] Unknown state: ${state}, querying master database`);
        const result = await db.execute(sql`SELECT * FROM public.internships WHERE state = ${state}`);
        return result.rows as any[];
    }

    console.log(`[DB Router] State: ${state} → Database: ${database}`);

    // Query the specific database (schema)
    const result = await db.execute(sql.raw(`SELECT * FROM ${database}.internships WHERE state = '${state}'`));

    console.log(`[DB Router] Retrieved ${result.rows.length} internships from ${database}`);
    return result.rows as any[];
}

/**
 * Query ALL internships from a specific tier's database
 */
export async function getInternshipsFromTierDatabase(tier: string): Promise<any[]> {
    const database = TIER_TO_DATABASE[tier];

    if (!database) {
        console.log(`[DB Router] Unknown tier: ${tier}`);
        return [];
    }

    console.log(`[DB Router] Querying database: ${database} for tier: ${tier}`);
    const result = await db.execute(sql.raw(`SELECT * FROM ${database}.internships`));

    console.log(`[DB Router] Retrieved ${result.rows.length} internships from ${database}`);
    return result.rows as any[];
}

/**
 * Query ALL internships from ALL databases
 * - Used by ML model which needs complete dataset
 * - Queries from master (public) for unified view
 */
export async function getAllInternshipsUnified(): Promise<any[]> {
    console.log(`[DB Router] Querying unified view from MASTER DATABASE`);

    const result = await db.execute(sql`SELECT * FROM public.internships`);

    console.log(`[DB Router] Retrieved ${result.rows.length} total internships from master`);
    return result.rows as any[];
}

/**
 * Get statistics from all databases
 */
export async function getDatabaseStats(): Promise<{
    master: number;
    tier1_db: number;
    tier2_db: number;
    tier3_db: number;
}> {
    const master = await db.execute(sql`SELECT COUNT(*) as count FROM public.internships`);
    const db1 = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM tier1_db.internships`));
    const db2 = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM tier2_db.internships`));
    const db3 = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM tier3_db.internships`));

    return {
        master: parseInt((master.rows[0] as any).count) || 0,
        tier1_db: parseInt((db1.rows[0] as any).count) || 0,
        tier2_db: parseInt((db2.rows[0] as any).count) || 0,
        tier3_db: parseInt((db3.rows[0] as any).count) || 0,
    };
}

/**
 * Explain which database will handle a query (for demo)
 */
export function explainDatabaseRouting(state?: string, tier?: string): string {
    if (state) {
        const database = STATE_TO_DATABASE[state];
        const info = database ? DATABASE_INFO[database] : null;
        return `Query for state=${state} routes to: ${database || 'public'} (${info?.description || 'Master'})`;
    }

    if (tier) {
        const database = TIER_TO_DATABASE[tier];
        const info = database ? DATABASE_INFO[database] : null;
        return `Query for tier=${tier} routes to: ${database || 'public'} (${info?.description || 'Master'})`;
    }

    return 'Query without state/tier filter uses Master Database (public)';
}

/**
 * Get list of all databases
 */
export function getDatabaseList(): { name: string; states: string; description: string }[] {
    return Object.entries(DATABASE_INFO).map(([key, value]) => ({
        schemaName: key,
        ...value
    }));
}
