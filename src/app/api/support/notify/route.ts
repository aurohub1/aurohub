import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type NotifyType = "new_ticket" | "escalated";

interface NotifyPayload {
  type?: NotifyType;
  userName?: string | null;
  userRole?: string | null;
  licenseeNome?: string | null;
  firstMessage?: string | null;
}

const ADM_URL = "https://aurohub-v2.vercel.app/adm/suporte";

function buildMessage(type: NotifyType, p: NotifyPayload): string {
  const nome = p.userName?.trim() || "(desconhecido)";
  const empresa = p.licenseeNome?.trim() || "(sem empresa)";
  const role = p.userRole?.trim();
  const msg = p.firstMessage?.trim() || "(sem mensagem)";

  if (type === "escalated") {
    return (
      `🔔 Ticket escalado - Aurohub\n` +
      `Cliente: ${nome}${role ? ` (${role})` : ""}\n` +
      `Empresa: ${empresa}\n` +
      `Última mensagem: ${msg}\n` +
      `Acesse: ${ADM_URL}`
    );
  }
  // new_ticket (default)
  return (
    `🆘 Novo ticket de suporte - Aurohub\n` +
    `Cliente: ${nome}${role ? ` (${role})` : ""}\n` +
    `Empresa: ${empresa}\n` +
    `Mensagem: ${msg}\n` +
    `Acesse: ${ADM_URL}`
  );
}

/**
 * Notifica equipe via WhatsApp (CallMeBot) em dois cenários:
 *  - type="new_ticket"   → cliente abriu novo ticket (com primeira mensagem)
 *  - type="escalated"    → ticket escalou para humano
 * Fallback silencioso: sem CALLMEBOT_API_KEY/SUPPORT_WHATSAPP_PHONE → ok sem enviar.
 */
export async function POST(req: NextRequest) {
  const PHONE = process.env.SUPPORT_WHATSAPP_PHONE;
  const APIKEY = process.env.CALLMEBOT_API_KEY;

  if (!PHONE || !APIKEY) {
    console.warn("[support/notify] CallMeBot não configurado — ticket processado sem WhatsApp");
    return NextResponse.json({ ok: true, notified: false, reason: "not_configured" });
  }

  try {
    const body = (await req.json()) as NotifyPayload;
    const type: NotifyType = body.type === "escalated" ? "escalated" : "new_ticket";
    const text = buildMessage(type, body);
    const url =
      `https://api.callmebot.com/whatsapp.php` +
      `?phone=${encodeURIComponent(PHONE)}` +
      `&text=${encodeURIComponent(text)}` +
      `&apikey=${encodeURIComponent(APIKEY)}`;

    const r = await fetch(url);
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("[support/notify] CallMeBot falhou:", r.status, detail.slice(0, 200));
      return NextResponse.json({ ok: false, notified: false, status: r.status });
    }
    return NextResponse.json({ ok: true, notified: true, type });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[support/notify] erro:", err);
    return NextResponse.json({ ok: false, notified: false, error: msg });
  }
}
