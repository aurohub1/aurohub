export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { createHash } from "crypto";

const PLANOS_LIMITES: Record<string, Record<string, unknown>> = {
  essencial: { ia_premium: false, can_metrics: false, inclui_agendamento: false, max_feed_reels_dia: 0, max_stories_dia: 0, limite_usuarios: 1 },
  profissional: { ia_premium: false, can_metrics: false, inclui_agendamento: false, max_feed_reels_dia: 5, max_stories_dia: 5, limite_usuarios: 2 },
  franquia: { ia_premium: true, can_metrics: true, inclui_agendamento: true, max_feed_reels_dia: 20, max_stories_dia: 5, limite_usuarios: 6 },
  enterprise: { ia_premium: true, can_metrics: true, inclui_agendamento: true, max_feed_reels_dia: -1, max_stories_dia: -1, limite_usuarios: -1 },
};

const VALOR_MENSALIDADE_MAP: Record<string, number> = {
  essencial: 497, profissional: 997, franquia: 1797, enterprise: 2997,
};

function gerarSlug(nome: string): string {
  return nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").substring(0, 30);
}

function gerarSenha(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function detectarPlano(ref: string, metadata: Record<string, unknown> | null): string {
  const partes = (ref || "").split("_");
  const VALIDOS = ["essencial", "profissional", "franquia", "enterprise"];
  if (partes.length >= 4 && VALIDOS.includes(partes[2])) return partes[2];
  if (metadata?.plano && VALIDOS.includes(metadata.plano as string)) return metadata.plano as string;
  return "essencial";
}

// GET — MP verifica se endpoint existe
export async function GET() {
  return NextResponse.json({ ok: true });
}

// POST — Webhook do Mercado Pago
export async function POST(request: Request) {
  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (!MP_TOKEN) return NextResponse.json({ error: "MP_ACCESS_TOKEN não configurado" }, { status: 500 });

  try {
    const body = await request.json();
    const { type, data } = body;
    const sb = createServerSupabase();

    // ── Pagamento aprovado (implantação) ──
    if (type === "payment") {
      const paymentId = data?.id;
      if (!paymentId) return NextResponse.json({ ok: true, msg: "ignored" });

      const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_TOKEN}` },
      });
      const payment = await payRes.json();

      if (payment.status !== "approved") return NextResponse.json({ ok: true, msg: "not approved" });
      if (!payment.external_reference?.startsWith("aurohub_stable_")) return NextResponse.json({ ok: true, msg: "not stable" });

      const planoCliente = detectarPlano(payment.external_reference, payment.metadata);
      const limites = PLANOS_LIMITES[planoCliente] || PLANOS_LIMITES.essencial;
      const mensalidade = VALOR_MENSALIDADE_MAP[planoCliente] || 497;

      // Buscar lead
      let lead: Record<string, unknown> | null = null;
      const { data: leadsByPref } = await sb.from("onboarding_leads").select("*")
        .eq("mp_preference_id", payment.metadata?.preference_id || "").limit(1);
      if (leadsByPref?.length) lead = leadsByPref[0];

      if (!lead && payment.payer?.email) {
        const { data: leadsByEmail } = await sb.from("onboarding_leads").select("*")
          .eq("contato_email", payment.payer.email).eq("status", "aguardando_pagamento").limit(1);
        if (leadsByEmail?.length) lead = leadsByEmail[0];
      }

      if (!lead) {
        await sb.from("pagamentos").insert({
          tipo: "implantacao", status: "aprovado",
          valor: payment.transaction_amount,
          mp_payment_id: String(paymentId),
          raw_webhook: body,
        });
        return NextResponse.json({ ok: true, msg: "lead not found — payment logged" });
      }

      // Verificar duplicata
      const { data: existing } = await sb.from("marcas").select("id").eq("contato_email", lead.contato_email as string).limit(1);
      if (existing?.length) return NextResponse.json({ ok: true, msg: "already processed" });

      // Buscar/criar segmento
      const segSlug = gerarSlug((lead.segmento as string) || "geral") || "geral";
      let segId: string | null = null;
      const { data: segResult } = await sb.from("segmentos").select("id").eq("slug", segSlug).limit(1);
      if (segResult?.length) {
        segId = segResult[0].id;
      } else {
        const segNome = (lead.segmento as string)?.charAt(0).toUpperCase() + ((lead.segmento as string) || "geral").slice(1);
        const { data: newSeg } = await sb.from("segmentos").insert({ nome: segNome, slug: segSlug, icone: "🏢", ativo: true, ordem: 99 }).select("id").single();
        segId = newSeg?.id || null;
      }

      // 1. Criar marca
      const slug = gerarSlug(lead.nome_empresa as string);
      const senha = gerarSenha();
      const lojas = Array.isArray(lead.lojas) && lead.lojas.length ? lead.lojas : ["Principal"];

      const { data: marcaResult } = await sb.from("marcas").insert({
        segmento_id: segId, nome: lead.nome_empresa, slug,
        forms: JSON.stringify(["pacote", "campanha", "cruzeiro", "anoiteceu"]),
        status: "ativo", plano: planoCliente,
        contato_nome: lead.contato_nome, contato_email: lead.contato_email,
        contato_telefone: (lead.contato_tel as string) || "",
        valor_mensalidade: mensalidade,
        onboarding_completo: false,
      }).select("id").single();

      const marcaId = marcaResult?.id;
      if (!marcaId) return NextResponse.json({ ok: true, msg: "marca creation failed" });

      // 2. Criar lojas
      for (const nomeLoja of lojas) {
        await sb.from("lojas").insert({
          marca_id: marcaId, nome: String(nomeLoja).trim(),
          cidade: "", ativa: true,
        });
      }

      // 3. Criar usuario ADM
      const senhaHash = createHash("sha256").update(senha).digest("hex");
      await sb.from("usuarios").insert({
        nome: lead.contato_nome, email: lead.contato_email,
        senha_hash: senhaHash, tipo: "licenciado",
        marca_id: marcaId, ativo: true,
        plano: planoCliente, ia_premium: limites.ia_premium,
      });

      // 4. Registrar pagamento
      await sb.from("pagamentos").insert({
        marca_id: marcaId, tipo: "implantacao", status: "aprovado",
        valor: payment.transaction_amount,
        mp_payment_id: String(paymentId), raw_webhook: body,
      });

      // 5. Atualizar lead
      await sb.from("onboarding_leads").update({ status: "pago" }).eq("id", lead.id);

      // 6. Criar assinatura recorrente
      try {
        const proximoMes = new Date();
        proximoMes.setMonth(proximoMes.getMonth() + 1);

        const subRes = await fetch("https://api.mercadopago.com/preapproval", {
          method: "POST",
          headers: { Authorization: `Bearer ${MP_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: `Aurohub — Mensalidade (${lead.nome_empresa})`,
            external_reference: `aurohub_stable_mensalidade_${marcaId}`,
            payer_email: lead.contato_email,
            auto_recurring: {
              frequency: 1, frequency_type: "months",
              transaction_amount: mensalidade, currency_id: "BRL",
              start_date: proximoMes.toISOString(),
            },
            status: "authorized",
          }),
        });
        const subData = await subRes.json();
        if (subData.id) {
          await sb.from("marcas").update({ mp_sub_id: subData.id }).eq("id", marcaId);
        }
      } catch { /* não falhar webhook */ }

      // 7. Email boas-vindas
      if (RESEND_KEY) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aurohub-v2.vercel.app";
          const planoNome = planoCliente.charAt(0).toUpperCase() + planoCliente.slice(1);
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: process.env.RESEND_DOMAIN_VERIFIED ? "Aurohub <noreply@aurovista.com.br>" : "Aurohub <onboarding@resend.dev>",
              to: [lead.contato_email],
              subject: `Bem-vindo ao Aurohub, ${(lead.contato_nome as string).split(" ")[0]}!`,
              html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0D1120;color:#EEF2FF;border-radius:16px;overflow:hidden;">
                <div style="padding:32px;text-align:center;border-bottom:1px solid #1A2035;">
                  <div style="font-size:24px;font-weight:800;color:#D4A843;">AUROHUB</div>
                </div>
                <div style="padding:32px;">
                  <h2 style="color:#fff;margin:0 0 16px;">Pagamento confirmado!</h2>
                  <p style="color:#8A9BBF;">Empresa: <strong style="color:#fff;">${lead.nome_empresa}</strong></p>
                  <p style="color:#8A9BBF;">Plano: <strong style="color:#D4A843;">${planoNome}</strong></p>
                  <p style="color:#8A9BBF;">Lojas: ${lojas.join(", ")}</p>
                  <p style="color:#8A9BBF;margin-top:20px;">A equipe Aurovista entrará em contato em até 24h para iniciar a implantação.</p>
                  <a href="${baseUrl}/onboarding?marca_id=${marcaId}" style="display:inline-block;margin-top:20px;background:linear-gradient(135deg,#D4A843,#FF7A1A);color:#0B1120;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Conectar Instagram</a>
                </div>
              </div>`,
            }),
          });
        } catch { /* ignorar */ }
      }

      // 8. Notificação no dashboard
      await sb.from("notificacoes").insert({
        tipo: "novo_cliente",
        titulo: `Novo cliente: ${lead.nome_empresa}`,
        mensagem: `${lead.contato_nome} · ${lojas.length} loja(s) · ${planoCliente}`,
        link: "/admin/clientes",
      });

      return NextResponse.json({ ok: true });
    }

    // ── Renovação de mensalidade ──
    if (type === "preapproval" || type === "subscription_preapproval") {
      const subId = data?.id;
      if (!subId) return NextResponse.json({ ok: true, msg: "ignored" });

      const subRes = await fetch(`https://api.mercadopago.com/preapproval/${subId}`, {
        headers: { Authorization: `Bearer ${MP_TOKEN}` },
      });
      const sub = await subRes.json();

      const { data: marcas } = await sb.from("marcas").select("id, nome").eq("mp_sub_id", subId).limit(1);
      if (!marcas?.length) return NextResponse.json({ ok: true, msg: "marca not found" });
      const marca = marcas[0];

      if (sub.status === "authorized" || sub.status === "active") {
        const proximo = new Date();
        proximo.setMonth(proximo.getMonth() + 1);
        await sb.from("marcas").update({ status: "ativo" }).eq("id", marca.id);

        await sb.from("pagamentos").insert({
          marca_id: marca.id, tipo: "mensalidade", status: "aprovado",
          valor: VALOR_MENSALIDADE_MAP[detectarPlano("", null)] || 497,
          mp_payment_id: subId, raw_webhook: body,
        });
      } else if (sub.status === "cancelled" || sub.status === "paused") {
        await sb.from("marcas").update({ status: "cancelado" }).eq("id", marca.id);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, msg: "event ignored" });
  } catch (err) {
    console.error("mp-webhook error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
