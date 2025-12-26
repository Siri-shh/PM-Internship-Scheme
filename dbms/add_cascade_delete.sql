-- Migration: Add CASCADE DELETE constraints
-- This ensures that deleting from master tables cascades to related records

-- ============================================================================
-- STEP 1: Drop existing foreign key constraints
-- ============================================================================

-- Drop candidates.user_id foreign key
ALTER TABLE candidates 
DROP CONSTRAINT IF EXISTS candidates_user_id_users_id_fk;

-- Drop companies.user_id foreign key
ALTER TABLE companies 
DROP CONSTRAINT IF EXISTS companies_user_id_users_id_fk;

-- Drop internships.company_id foreign key
ALTER TABLE internships 
DROP CONSTRAINT IF EXISTS internships_company_id_companies_id_fk;

-- Drop allocations.student_id foreign key
ALTER TABLE allocations 
DROP CONSTRAINT IF EXISTS allocations_student_id_candidates_student_id_fk;

-- Drop allocations.internship_id foreign key
ALTER TABLE allocations 
DROP CONSTRAINT IF EXISTS allocations_internship_id_internships_internship_id_fk;

-- ============================================================================
-- STEP 2: Re-create foreign keys WITH ON DELETE CASCADE
-- ============================================================================

-- When a user is deleted, delete their candidate profile
ALTER TABLE candidates
ADD CONSTRAINT candidates_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- When a user is deleted, delete their company profile
ALTER TABLE companies
ADD CONSTRAINT companies_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- When a company is deleted, delete their internships
ALTER TABLE internships
ADD CONSTRAINT internships_company_id_companies_id_fk 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- When a candidate is deleted, delete their allocations
ALTER TABLE allocations 
ADD CONSTRAINT allocations_student_id_candidates_student_id_fk 
FOREIGN KEY (student_id) REFERENCES candidates(student_id) ON DELETE CASCADE;

-- When an internship is deleted, delete related allocations
ALTER TABLE allocations 
ADD CONSTRAINT allocations_internship_id_internships_internship_id_fk 
FOREIGN KEY (internship_id) REFERENCES internships(internship_id) ON DELETE CASCADE;

-- ============================================================================
-- VERIFICATION: Show all foreign keys with their ON DELETE behavior
-- ============================================================================
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- ============================================================================
-- CASCADE DELETE CHAIN:
-- ============================================================================
-- 
-- DELETE FROM users WHERE id = X;
--   └── Automatically deletes:
--       ├── candidates WHERE user_id = X
--       │   └── allocations WHERE student_id = (deleted candidate's student_id)
--       └── companies WHERE user_id = X
--           └── internships WHERE company_id = (deleted company's id)
--               └── allocations WHERE internship_id = (deleted internship's id)
--
-- ============================================================================
