import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function summaryHtml(summary: Record<string, unknown>): string {
  const row = (label: string, value: unknown) =>
    value ? `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;width:160px;vertical-align:top">${label}</td><td style="padding:6px 12px;color:#6b7280">${Array.isArray(value) ? (value as string[]).join(", ") : String(value)}</td></tr>` : "";

  return `<table style="border-collapse:collapse;width:100%;font-size:14px;font-family:sans-serif">
    ${row("Empresa", summary.empresa)}
    ${row("Cidade", summary.cidade)}
    ${row("Segmento", summary.segmento)}
    ${row("Estrutura", summary.estrutura)}
    ${row("Cores", summary.cores)}
    ${row("Logo", summary.logo_descricao)}
    ${row("Formatos", summary.formatos)}
    ${row("Estilo Visual", summary.estilo_visual)}
    ${row("Produtos/Serviços", summary.produtos_servicos)}
    ${row("Apresentação de Preço", summary.forma_apresentar_preco)}
    ${row("Redes Sociais", summary.redes_sociais)}
    ${row("Observações", summary.observacoes)}
  </table>`;
}

export async function PUT(req: NextRequest) {
  try {
    const { token } = await req.json() as { token?: string };
    if (!token) return NextResponse.json({ error: "token obrigatório" }, { status: 400 });

    const sb = adminDb();

    const { data: briefing } = await sb
      .from("briefings")
      .select("id, licensee_id, summary, status")
      .eq("token", token)
      .maybeSingle();

    if (!briefing) return NextResponse.json({ error: "Briefing não encontrado" }, { status: 404 });

    // Atualizar status
    await sb.from("briefings").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", briefing.id);

    // Buscar email do licensee
    const { data: licensee } = await sb
      .from("licensees")
      .select("name, email")
      .eq("id", briefing.licensee_id)
      .maybeSingle();

    const summary = (briefing.summary ?? {}) as Record<string, unknown>;
    const empresa = String(summary.empresa || licensee?.name || "Cliente");
    const segmento = String(summary.segmento || "—");

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Email para a equipe Aurovista
      await resend.emails.send({
        from: "Aurohub <noreply@aurovista.com.br>",
        to: "contato@aurovista.com.br",
        subject: `📋 Novo briefing concluído — ${empresa} (${segmento})`,
        html: `
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <h2 style="color:#1E3A6E;margin:0 0 16px">📋 Novo briefing concluído</h2>
  <p style="color:#374151;font-size:15px;margin:0 0 8px"><strong>Empresa:</strong> ${empresa}</p>
  <p style="color:#374151;font-size:15px;margin:0 0 24px"><strong>Segmento:</strong> ${segmento}</p>
  <h3 style="color:#374151;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:.5px">Resumo coletado</h3>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    ${summaryHtml(summary)}
  </div>
  <p style="color:#9ca3af;font-size:12px;margin-top:24px">Briefing ID: ${briefing.id}</p>
</div>`,
      }).catch(() => {});

      // Email de confirmação para o cliente
      if (licensee?.email) {
        await resend.emails.send({
          from: "Aurohub <noreply@aurovista.com.br>",
          to: licensee.email,
          subject: "✅ Briefing recebido — Aurovista",
          html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#1E3A6E;margin:0 0 12px">Briefing recebido com sucesso!</h2>
  <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
    Olá! Recebemos todas as informações do seu briefing.
    Nossa equipe iniciará a implantação em até <strong>3 dias úteis</strong>.
    Você será notificado por e-mail quando seus templates estiverem prontos.
  </p>
  <a href="https://app.aurovista.com.br/login"
     style="display:inline-block;background:#1A56C4;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
    Acessar minha conta
  </a>
  <p style="color:#9ca3af;font-size:12px;margin-top:24px">
    Dúvidas? contato@aurovista.com.br
  </p>
</div>`,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[Briefing/complete]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
