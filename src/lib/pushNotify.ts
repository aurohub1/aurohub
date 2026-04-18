/**
 * Helper server-side pra disparar push notifications.
 * Chama /api/push/send internamente. Silencia erros (push é best-effort).
 */

interface NotifyOpts {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

function baseUrl(): string {
  // Prefere URL pública (produção). Local/dev cai em localhost:3000.
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";
  return envUrl;
}

export async function notifyPush(opts: NotifyOpts): Promise<void> {
  try {
    const res = await fetch(`${baseUrl()}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[pushNotify] falhou:", res.status, detail);
    }
  } catch (err) {
    console.warn("[pushNotify] erro:", err);
  }
}
