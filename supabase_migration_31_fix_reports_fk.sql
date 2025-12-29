-- Fix: Add Foreign Key relationship between reports and users
-- Includes DATA CLEANUP for orphaned records

-- 1. CLEANUP: Set reporter_id to NULL if the user no longer exists
-- (This prevents "violates foreign key constraint" error on existing dirty data)
UPDATE reports
SET reporter_id = NULL
WHERE reporter_id IS NOT NULL 
AND reporter_id NOT IN (SELECT id FROM users);

-- 2. Add FK to reports.reporter_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_reports_users'
    ) THEN
        ALTER TABLE reports
        ADD CONSTRAINT fk_reports_users
        FOREIGN KEY (reporter_id)
        REFERENCES users(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
