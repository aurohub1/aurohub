import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { ticketId, message, userName, storeName } = await req.json();
    const phone = process.env.SUPPORT_WHATSAPP_PHONE;
    const apikey = process.env.CALLMEBOT_API_KEY;

    if (!phone || !apikey) {
      return NextResponse.json({ ok: false, reason: "WhatsApp not configured" });
    }

    const text = encodeURIComponent(
      `🔔 *Novo ticket de suporte*\n\n` +
      `👤 ${userName}\n` +
      `🏪 ${storeName}\n` +
      `💬 ${message}\n\n` +
      `🎫 Ticket: ${ticketId}`
    );

    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${apikey}`;
    await fetch(url);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[support-notify]", err);
    return NextResponse.json({ ok: false });
  }
}
