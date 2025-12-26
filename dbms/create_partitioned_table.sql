-- ============================================================
-- PM Internship Scheme Portal - Table Partitioning Migration
-- ============================================================
-- This script converts the candidates table to a partitioned table
-- organized by geographic zones (North, South, East, West)
--
-- IMPORTANT: Run this during a maintenance window
-- ============================================================

-- Step 1: Create the new partitioned table structure
CREATE TABLE candidates_partitioned (
    student_id TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    gpa REAL NOT NULL,
    skills TEXT NOT NULL,
    reservation TEXT NOT NULL,
    rural BOOLEAN NOT NULL DEFAULT FALSE,
    gender TEXT NOT NULL,
    name TEXT,
    email TEXT,
    state TEXT NOT NULL,
    pref_1 TEXT,
    pref_2 TEXT,
    pref_3 TEXT,
    pref_4 TEXT,
    pref_5 TEXT,
    pref_6 TEXT,
    PRIMARY KEY (student_id, state)
) PARTITION BY LIST (state);

-- Step 2: Create zone partitions
-- North Zone (12 states/UTs)
CREATE TABLE candidates_north PARTITION OF candidates_partitioned
    FOR VALUES IN ('UP', 'UK', 'HR', 'DL', 'PB', 'HP', 'JK', 'CH', 'RJ', 'BR', 'JH', 'MP');

-- South Zone (6 states/UTs)
CREATE TABLE candidates_south PARTITION OF candidates_partitioned
    FOR VALUES IN ('TN', 'KA', 'KL', 'AP', 'TG', 'PY');

-- East Zone (8 states/UTs)
CREATE TABLE candidates_east PARTITION OF candidates_partitioned
    FOR VALUES IN ('WB', 'OR', 'AS', 'SK', 'MN', 'NL', 'TR', 'ML', 'MZ', 'AR');

-- West Zone (4 states/UTs)
CREATE TABLE candidates_west PARTITION OF candidates_partitioned
    FOR VALUES IN ('MH', 'GJ', 'GA', 'CG');

-- Step 3: Create indexes on each partition for better query performance
CREATE INDEX idx_north_gpa ON candidates_north(gpa);
CREATE INDEX idx_north_skills ON candidates_north USING gin(to_tsvector('english', skills));
CREATE INDEX idx_north_user_id ON candidates_north(user_id);

CREATE INDEX idx_south_gpa ON candidates_south(gpa);
CREATE INDEX idx_south_skills ON candidates_south USING gin(to_tsvector('english', skills));
CREATE INDEX idx_south_user_id ON candidates_south(user_id);

CREATE INDEX idx_east_gpa ON candidates_east(gpa);
CREATE INDEX idx_east_skills ON candidates_east USING gin(to_tsvector('english', skills));
CREATE INDEX idx_east_user_id ON candidates_east(user_id);

CREATE INDEX idx_west_gpa ON candidates_west(gpa);
CREATE INDEX idx_west_skills ON candidates_west USING gin(to_tsvector('english', skills));
CREATE INDEX idx_west_user_id ON candidates_west(user_id);

-- Step 4: Migrate data from old table to new partitioned table
INSERT INTO candidates_partitioned (
    student_id, user_id, gpa, skills, reservation, rural, gender,
    name, email, state, pref_1, pref_2, pref_3, pref_4, pref_5, pref_6
)
SELECT 
    student_id, user_id, gpa, skills, reservation, rural, gender,
    name, email, 
    COALESCE(state, 'DL') as state,  -- Default to Delhi if null
    pref_1, pref_2, pref_3, pref_4, pref_5, pref_6
FROM candidates
WHERE state IS NOT NULL;

-- Step 5: Verify migration
SELECT 'Original count' as source, COUNT(*) as count FROM candidates
UNION ALL
SELECT 'Partitioned count', COUNT(*) FROM candidates_partitioned
UNION ALL
SELECT 'North partition', COUNT(*) FROM candidates_north
UNION ALL
SELECT 'South partition', COUNT(*) FROM candidates_south
UNION ALL
SELECT 'East partition', COUNT(*) FROM candidates_east
UNION ALL
SELECT 'West partition', COUNT(*) FROM candidates_west;

-- Step 6: Swap tables (optional - do this when ready to go live)
-- ALTER TABLE candidates RENAME TO candidates_old;
-- ALTER TABLE candidates_partitioned RENAME TO candidates;

-- ============================================================
-- QUERY EXAMPLES - Demonstrating Partition Pruning
-- ============================================================

-- Query 1: Get candidates from Maharashtra (only scans West partition)
EXPLAIN ANALYZE
SELECT * FROM candidates_partitioned WHERE state = 'MH';

-- Query 2: Get all candidates (scans all partitions, like before)
EXPLAIN ANALYZE
SELECT * FROM candidates_partitioned;

-- Query 3: Get candidates from South zone only
EXPLAIN ANALYZE
SELECT * FROM candidates_partitioned 
WHERE state IN ('TN', 'KA', 'KL', 'AP', 'TG');

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================
-- DROP TABLE IF EXISTS candidates_partitioned CASCADE;
-- DROP TABLE IF EXISTS candidates_north CASCADE;
-- DROP TABLE IF EXISTS candidates_south CASCADE;
-- DROP TABLE IF EXISTS candidates_east CASCADE;
-- DROP TABLE IF EXISTS candidates_west CASCADE;
