-- Migration: sessão única + fingerprint de dispositivo

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_session_id text;

CREATE TABLE IF NOT EXISTS user_devices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  user_agent text,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  trusted boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fp ON user_devices(user_id, fingerprint);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_user_devices" ON user_devices FOR ALL USING (true);
