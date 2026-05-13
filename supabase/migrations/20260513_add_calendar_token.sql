ALTER TABLE stores ADD COLUMN IF NOT EXISTS calendar_token TEXT DEFAULT gen_random_uuid()::text;

UPDATE stores SET calendar_token = gen_random_uuid()::text WHERE calendar_token IS NULL;
