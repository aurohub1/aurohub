export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

const PLANOS_FALLBACK: Record<string, { nome: string; impl: number; mens: number }> = {
  essencial:    { nome: "Aurohub Essencial",    impl: 1500, mens: 297  },
  profissional: { nome: "Aurohub Profissional", impl: 2000, mens: 497  },
  franquia:     { nome: "Aurohub Franquia/Rede", impl: 3500, mens: 897  },
  enterprise:   { nome: "Aurohub Enterprise",    impl: 5000, mens: 1500 },
};

function toPrice(v: unknown, fallback: number): number {
  const n = parseFloat(String(v));
  return (isFinite(n) && n > 0) ? Math.round(n * 100) / 100 : fallback;
}

// POST /api/payments/checkout — cria checkout Mercado Pago
export async function POST(request: Request) {
  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_TOKEN) return NextResponse.json({ error: "MP_ACCESS_TOKEN não configurado" }, { status: 500 });

  try {
    const body = await request.json();
    const {
      nome_empresa, segmento, plano,
      contato_nome, contato_email, contato_tel,
      lojas, instagram_urls, observacoes,
      addons, addon_ia, addon_vitrine,
      users_extras, lojas_extras,
      termos_aceitos, termos_versao,
    } = body;

    if (!nome_empresa || !contato_nome || !contato_email) {
      return NextResponse.json({ error: "Nome da empresa, contato e email são obrigatórios" }, { status: 400 });
    }

    const sb = createServerSupabase();
    const planoKey = (plano || "essencial").toLowerCase();

    // Buscar preços do Supabase ou usar fallback
    let planoData = PLANOS_FALLBACK[planoKey] || PLANOS_FALLBACK.essencial;
    try {
      const { data: configRows } = await sb.from("config_landing").select("valor").eq("chave", "aurohub_planos_config").limit(1);
      if (configRows?.[0]?.valor) {
        const saved = JSON.parse(configRows[0].valor);
        const p = Array.isArray(saved) ? saved.find((x: { id: string }) => x.id === planoKey) : null;
        if (p) {
          planoData = {
            nome: p.nome || planoData.nome,
            impl: toPrice(p.impl_valor, planoData.impl),
            mens: toPrice(p.preco, planoData.mens),
          };
        }
      }
    } catch { /* usar fallback */ }

    const ref = `aurohub_stable_${planoKey}_${Date.now()}`;
    const numLojas = (Array.isArray(lojas) ? lojas.length : 1) + (parseInt(lojas_extras) || 0);

    // Salvar lead
    const { data: leadResult } = await sb.from("onboarding_leads").insert({
      nome_empresa, segmento: segmento || "geral", plano: planoKey,
      contato_nome, contato_email, contato_tel: contato_tel || "",
      lojas: Array.isArray(lojas) ? lojas : [],
      instagram_urls: Array.isArray(instagram_urls) ? instagram_urls : [],
      status: "aguardando_pagamento",
    }).select("id").single();

    const leadId = leadResult?.id;

    // Montar items
    const items: Array<{ title: string; description: string; quantity: number; currency_id: string; unit_price: number }> = [{
      title: `${planoData.nome} — Implantação`,
      description: `${numLojas} loja${numLojas > 1 ? "s" : ""}. Configuração pela Aurovista.`,
      quantity: 1, currency_id: "BRL",
      unit_price: toPrice(planoData.impl, 1500),
    }];

    if (addon_ia) items.push({ title: "Add-on IA Premium", description: "IA de legenda", quantity: 1, currency_id: "BRL", unit_price: 120 });
    if (addon_vitrine) items.push({ title: "Add-on Transmissão", description: "Templates TV", quantity: 1, currency_id: "BRL", unit_price: 80 });
    if (parseInt(users_extras) > 0) items.push({ title: `Usuários extras (${users_extras}x)`, description: "Usuários adicionais", quantity: parseInt(users_extras), currency_id: "BRL", unit_price: 29 });
    if (parseInt(lojas_extras) > 0) items.push({ title: `Lojas extras (${lojas_extras}x)`, description: "Lojas adicionais", quantity: parseInt(lojas_extras), currency_id: "BRL", unit_price: toPrice(planoData.impl / numLojas, 297) });

    // Add-ons dinâmicos
    if (Array.isArray(addons) && addons.length) {
      try {
        const { data: addonsConfigRows } = await sb.from("config_landing").select("valor").eq("chave", "aurohub_addons_config").limit(1);
        const addonsConfig = addonsConfigRows?.[0]?.valor ? JSON.parse(addonsConfigRows[0].valor) : [];
        for (const addonStr of addons) {
          const match = (addonStr as string).match(/^(.+)_tier_(\d+)$/);
          if (!match) continue;
          const [, addonId, tierIdx] = match;
          const addonDef = addonsConfig.find((a: { id: string }) => a.id === addonId);
          if (!addonDef) continue;
          const tier = addonDef.tiers?.[parseInt(tierIdx)];
          if (!tier) continue;
          items.push({
            title: `Add-on ${addonDef.nome} — ${tier.nome}`,
            description: `${tier.assentos} assento(s)`,
            quantity: 1, currency_id: "BRL",
            unit_price: toPrice(tier.preco, 29),
          });
        }
      } catch { /* ignorar */ }
    }

    // Filtrar items válidos
    const validItems = items.filter(it => isFinite(it.unit_price) && it.unit_price > 0);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aurohub-v2.vercel.app";

    // Criar preferência no MP
    const preference = {
      items: validItems,
      payer: { name: contato_nome, email: contato_email },
      back_urls: {
        success: `${baseUrl}/sucesso?ref=${ref}&lead=${leadId || ""}`,
        failure: `${baseUrl}/?status=failure`,
        pending: `${baseUrl}/?status=pending`,
      },
      auto_return: "approved",
      external_reference: ref,
      notification_url: `${baseUrl}/api/payments/webhook`,
      statement_descriptor: "AUROHUB",
      metadata: { lead_id: leadId, nome_empresa, contato_email, plano: planoKey, num_lojas: numLojas },
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${MP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(preference),
    });
    const mpData = await mpRes.json();

    if (!mpData.id) {
      return NextResponse.json({ error: "Erro MP: " + (mpData.message || JSON.stringify(mpData)) }, { status: 500 });
    }

    // Atualizar lead
    if (leadId) {
      await sb.from("onboarding_leads").update({ mp_preference_id: mpData.id }).eq("id", leadId);
    }

    const checkoutUrl = MP_TOKEN.startsWith("TEST-") ? mpData.sandbox_init_point : mpData.init_point;

    return NextResponse.json({
      init_point: checkoutUrl,
      preference_id: mpData.id,
      external_reference: ref,
      lead_id: leadId,
    });
  } catch (err) {
    console.error("mp-checkout error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
