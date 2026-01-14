-- Add source column to toilets table
ALTER TABLE toilets ADD COLUMN IF NOT EXISTS source text CHECK (source IN ('admin', 'user'));

-- Set default for existing rows (optional, but good for consistency)
UPDATE toilets SET source = 'user' WHERE source IS NULL;
