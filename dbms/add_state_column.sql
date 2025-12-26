-- Add state column and populate with random states for partitioning
-- Run this in your PostgreSQL database

-- Step 1: Add the state column
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS state TEXT;

-- Step 2: Create array of Indian states for even distribution
-- Using 28 states + 8 UTs = 36 total, but we'll focus on major ones for simplicity
DO $$
DECLARE
    states TEXT[] := ARRAY[
        'UP', 'MH', 'BR', 'WB', 'MP', 'TN', 'RJ', 'KA', 'GJ', 'AP',
        'OR', 'TG', 'KL', 'JH', 'AS', 'PB', 'HR', 'CG', 'UK', 'DL',
        'JK', 'HP', 'TR', 'ML', 'MN', 'NL', 'GA', 'AR', 'MZ', 'SK'
    ];
    state_count INTEGER := array_length(states, 1);
    row_num INTEGER := 0;
BEGIN
    -- Update each candidate with a state based on row number for even distribution
    UPDATE candidates 
    SET state = states[1 + (ROW_NUMBER() OVER (ORDER BY student_id) - 1) % state_count]
    FROM (
        SELECT student_id, ROW_NUMBER() OVER (ORDER BY student_id) as rn
        FROM candidates
    ) AS numbered
    WHERE candidates.student_id = numbered.student_id;
END $$;

-- Alternative simpler approach using random:
UPDATE candidates 
SET state = (
    ARRAY['UP', 'MH', 'BR', 'WB', 'MP', 'TN', 'RJ', 'KA', 'GJ', 'AP',
          'OR', 'TG', 'KL', 'JH', 'AS', 'PB', 'HR', 'CG', 'UK', 'DL',
          'JK', 'HP', 'TR', 'ML', 'MN', 'NL', 'GA', 'AR', 'MZ', 'SK']
)[1 + floor(random() * 30)::int]
WHERE state IS NULL;

-- Verify distribution
SELECT state, COUNT(*) as count 
FROM candidates 
GROUP BY state 
ORDER BY count DESC;
