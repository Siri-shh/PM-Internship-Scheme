-- ============================================================
-- INTERNSHIP DATABASE SHARDING BY TIER/LOCATION
-- ============================================================
-- This creates separate tables for each tier that act like
-- separate "databases" for load distribution
-- ============================================================

-- Step 1: Create the master partitioned table
CREATE TABLE IF NOT EXISTS internships_sharded (
    internship_id TEXT NOT NULL,
    company_id INTEGER,
    sector TEXT NOT NULL,
    tier TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    required_skills TEXT NOT NULL,
    stipend INTEGER NOT NULL,
    location_type TEXT NOT NULL,
    state TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (internship_id, tier)
) PARTITION BY LIST (tier);

-- Step 2: Create shard tables (these act as separate databases)
-- Tier 1 Shard: Maharashtra, Karnataka (Metro Hubs)
CREATE TABLE IF NOT EXISTS internships_tier1 PARTITION OF internships_sharded
    FOR VALUES IN ('Tier1');

-- Tier 2 Shard: Gujarat, Telangana (Growing Cities)
CREATE TABLE IF NOT EXISTS internships_tier2 PARTITION OF internships_sharded
    FOR VALUES IN ('Tier2');

-- Tier 3 Shard: UP, Rajasthan (Emerging Regions)
CREATE TABLE IF NOT EXISTS internships_tier3 PARTITION OF internships_sharded
    FOR VALUES IN ('Tier3');

-- Step 3: Create indexes for each shard
CREATE INDEX IF NOT EXISTS idx_tier1_state ON internships_tier1(state);
CREATE INDEX IF NOT EXISTS idx_tier1_sector ON internships_tier1(sector);

CREATE INDEX IF NOT EXISTS idx_tier2_state ON internships_tier2(state);
CREATE INDEX IF NOT EXISTS idx_tier2_sector ON internships_tier2(sector);

CREATE INDEX IF NOT EXISTS idx_tier3_state ON internships_tier3(state);
CREATE INDEX IF NOT EXISTS idx_tier3_sector ON internships_tier3(sector);

-- Step 4: Create sync trigger from master table to sharded table
CREATE OR REPLACE FUNCTION sync_internship_to_shard()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into sharded table (auto-routes to correct partition)
    INSERT INTO internships_sharded (
        internship_id, company_id, sector, tier, capacity,
        required_skills, stipend, location_type, state
    ) VALUES (
        NEW.internship_id, NEW.company_id, NEW.sector, 
        COALESCE(NEW.tier, 'Tier2'),
        NEW.capacity, NEW.required_skills, NEW.stipend, 
        NEW.location_type, NEW.state
    )
    ON CONFLICT (internship_id, tier) DO UPDATE SET
        company_id = EXCLUDED.company_id,
        sector = EXCLUDED.sector,
        capacity = EXCLUDED.capacity,
        required_skills = EXCLUDED.required_skills,
        stipend = EXCLUDED.stipend,
        location_type = EXCLUDED.location_type,
        state = EXCLUDED.state;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Attach trigger to master internships table
DROP TRIGGER IF EXISTS sync_internships_to_shard ON internships;
CREATE TRIGGER sync_internships_to_shard
AFTER INSERT OR UPDATE ON internships
FOR EACH ROW
EXECUTE FUNCTION sync_internship_to_shard();

-- Step 6: Migrate existing internships to sharded tables
INSERT INTO internships_sharded (
    internship_id, company_id, sector, tier, capacity,
    required_skills, stipend, location_type, state
)
SELECT 
    internship_id, company_id, sector, 
    COALESCE(tier, 'Tier2'),
    capacity, required_skills, stipend, location_type, state
FROM internships
WHERE tier IS NOT NULL
ON CONFLICT (internship_id, tier) DO NOTHING;

-- Step 7: Verify shard distribution
SELECT 'Tier1 (MH, KA)' as shard, COUNT(*) as count FROM internships_tier1
UNION ALL
SELECT 'Tier2 (GJ, TG)', COUNT(*) FROM internships_tier2
UNION ALL
SELECT 'Tier3 (UP, RJ)', COUNT(*) FROM internships_tier3;
