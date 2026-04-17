import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Notifica a equipe via WhatsApp (CallMeBot) quando um ticket escala para humano.
 * Fallback silencioso: se CALLMEBOT_API_KEY ou SUPPORT_WHATSAPP_PHONE não estiverem
 * configurados, retorna ok sem enviar — o ticket é criado mas fica apenas
 * disponível no painel /adm/suporte sem notificação WhatsApp.
 */
export async function POST(req: NextRequest) {
  const PHONE = process.env.SUPPORT_WHATSAPP_PHONE;
  const APIKEY = process.env.CALLMEBOT_API_KEY;

  if (!PHONE || !APIKEY) {
    console.warn("[support/notify] CallMeBot não configurado — ticket criado sem WhatsApp");
    return NextResponse.json({ ok: true, notified: false, reason: "not_configured" });
  }

  try {
    const { userName, userRole, licenseeNome } = await req.json();
    const text =
      `🔔 Aurohub Suporte\n` +
      `Novo ticket de ${userName ?? "(desconhecido)"} ` +
      `(${userRole ?? "n/a"} - ${licenseeNome ?? "n/a"})\n` +
      `Acesse: /adm/suporte`;
    const url =
      `https://api.callmebot.com/whatsapp.php` +
      `?phone=${encodeURIComponent(PHONE)}` +
      `&text=${encodeURIComponent(text)}` +
      `&apikey=${encodeURIComponent(APIKEY)}`;

    const r = await fetch(url);
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      console.error("[support/notify] CallMeBot falhou:", r.status, body.slice(0, 200));
      return NextResponse.json({ ok: false, notified: false, status: r.status });
    }
    return NextResponse.json({ ok: true, notified: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[support/notify] erro:", err);
    return NextResponse.json({ ok: false, notified: false, error: msg });
  }
}
