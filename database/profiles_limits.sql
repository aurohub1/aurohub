-- Migration: limites por formato no profile do usuário
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stories_limit integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS feed_limit integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reels_limit integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tv_limit integer DEFAULT 0;
