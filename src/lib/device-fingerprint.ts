/**
 * Gera um fingerprint simples do dispositivo baseado em:
 * user agent, screen resolution, timezone, language.
 * Não é perfeito — é uma heurística leve para detectar novos dispositivos.
 */
export function generateFingerprint(): { fingerprint: string; userAgent: string } {
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language;

  const raw = `${ua}|${screen}|${tz}|${lang}`;

  // Simple hash (djb2)
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  }

  return {
    fingerprint: hash.toString(36),
    userAgent: ua,
  };
}
