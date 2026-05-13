import { createClient } from "@supabase/supabase-js";
import { notifyPush } from "@/lib/pushNotify";
import { Resend } from "resend";

const METRIC_LABELS: Record<string, string> = {
  feed_reels: "Feed + Reels",
  stories:    "Stories",
  roteiros:   "Roteiros",
  usuarios:   "Usuários",
  lojas:      "Lojas",
};

export async function triggerAlert80(
  licenseeId: string,
  metric: string,
  count: number,
  limit: number,
): Promise<void> {
  const label = METRIC_LABELS[metric] ?? metric;
  const msg   = `Você atingiu 80% do limite de ${label} — ${count}/${limit}`;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // ── Busca usuários gerente/cliente do licensee para push e email ──────────
  const { data: targets } = await admin
    .from("profiles")
    .select("id, email, name")
    .eq("licensee_id", licenseeId)
    .in("role", ["cliente", "gerente"]);

  const userIds = (targets ?? []).map((t: { id: string }) => t.id);

  // ── In-app (notificacoes) — best-effort ───────────────────────────────────
  if (userIds.length > 0) {
    try {
      await admin.from("notificacoes").insert(
        userIds.map((uid) => ({
          usuario: uid,
          titulo: `⚠️ 80% do limite de ${label}`,
          mensagem: msg,
          tipo: "usage_alert",
          lida: false,
        }))
      );
    } catch { /* tabela pode não existir — falha silenciosa */ }
  }

  // ── Push notification ─────────────────────────────────────────────────────
  if (userIds.length > 0) {
    notifyPush({
      userIds,
      title: `⚠️ Aurohub — 80% do limite`,
      body: msg,
      tag: `usage-alert-${metric}`,
      url: "/cliente/inicio",
    }).catch(() => {});
  }

  // ── Email via Resend ──────────────────────────────────────────────────────
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const emailTargets = (targets ?? []) as { id: string; email: string | null; name: string | null }[];
  await Promise.allSettled(
    emailTargets
      .filter((t) => !!t.email)
      .map((t) =>
        resend.emails.send({
          from: "Aurohub <noreply@aurovista.com.br>",
          to: t.email!,
          subject: `⚠️ Aurohub — 80% do limite de ${label} atingido`,
          html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#FF7A1A;margin:0 0 12px">⚠️ Limite próximo</h2>
  <p style="color:#333;font-size:15px">Olá${t.name ? `, ${t.name.split(" ")[0]}` : ""}!</p>
  <p style="color:#333;font-size:15px">
    ${msg}
  </p>
  <p style="color:#777;font-size:13px;margin-top:20px">
    Acesse o <a href="https://app.aurovista.com.br" style="color:#FF7A1A">Aurohub</a>
    para verificar seu uso ou entre em contato com o suporte para ampliar seu plano.
  </p>
</div>`,
        })
      )
  );
}
