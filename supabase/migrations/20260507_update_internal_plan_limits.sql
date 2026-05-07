-- Atualiza limites do plano interno: stories ilimitado, feed/reels = 25
UPDATE plans
SET
  max_stories_day    = 99999,
  max_feed_reels_day = 25
WHERE is_internal = true;
