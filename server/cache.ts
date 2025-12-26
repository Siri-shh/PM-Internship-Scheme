import Redis from 'ioredis';

// Redis connection configuration
// For production, use environment variables for REDIS_URL
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
    if (!redis) {
        try {
            redis = new Redis(REDIS_URL, {
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                // Reconnect on error
                retryStrategy(times) {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
            });

            redis.on('error', (err) => {
                console.warn('Redis connection error:', err.message);
                // Don't crash the app if Redis is unavailable
            });

            redis.on('connect', () => {
                console.log('Redis connected successfully');
            });
        } catch (err) {
            console.warn('Redis initialization failed, continuing without cache');
            return null;
        }
    }
    return redis;
}

// Cache TTL values in seconds
export const CACHE_TTL = {
    INTERNSHIPS_ALL: 600,       // 10 minutes
    INTERNSHIPS_BY_TIER: 600,   // 10 minutes
    DASHBOARD_STATS: 300,       // 5 minutes
    CANDIDATES_COUNT: 300,      // 5 minutes
};

// Cache key generators
export const CACHE_KEYS = {
    internshipsAll: () => 'internships:all',
    internshipsByTier: (tier: string) => `internships:tier:${tier}`,
    internshipsByState: (state: string) => `internships:state:${state}`,
    dashboardStats: () => 'stats:dashboard',
    candidatesCount: () => 'candidates:count',
    candidatesByState: (state: string) => `candidates:state:${state}:count`,
};

// Generic cache wrapper
export async function cacheGet<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
        const cached = await client.get(key);
        if (cached) {
            console.log(`Cache HIT: ${key}`);
            return JSON.parse(cached) as T;
        }
        console.log(`Cache MISS: ${key}`);
        return null;
    } catch (err) {
        console.warn('Cache get error:', err);
        return null;
    }
}

export async function cacheSet(key: string, value: any, ttlSeconds: number): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    try {
        await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        console.log(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (err) {
        console.warn('Cache set error:', err);
    }
}

export async function cacheDelete(key: string): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    try {
        await client.del(key);
        console.log(`Cache DELETE: ${key}`);
    } catch (err) {
        console.warn('Cache delete error:', err);
    }
}

// Invalidate all internship-related cache
export async function invalidateInternshipsCache(): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    try {
        const keys = await client.keys('internships:*');
        if (keys.length > 0) {
            await client.del(...keys);
            console.log(`Cache INVALIDATED: ${keys.length} internship keys`);
        }
    } catch (err) {
        console.warn('Cache invalidation error:', err);
    }
}

// Check if Redis is available
export async function isRedisAvailable(): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
        await client.ping();
        return true;
    } catch {
        return false;
    }
}
