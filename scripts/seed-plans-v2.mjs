#!/usr/bin/env node
/**
 * Seed v2: atualiza preços e limites de plans + addons conforme tabela definitiva.
 *
 * ATENÇÃO: Este script faz UPDATE/INSERT via PostgREST. A coluna `max_stores`
 * em plans é criada pelo SQL em database/migration_plans_v2_prices.sql — rode
 * esse arquivo no Supabase Dashboard antes (ou em conjunto) para garantir a coluna.
 *
 * Run:  node --env-file=.env.local scripts/seed-plans-v2.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) { console.error("Faltam NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(SB_URL, SB_KEY);

/* ── Verifica se max_stores existe ──────────────────── */
const spec = await fetch(SB_URL + "/rest/v1/?select=*", {
  headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
}).then((r) => r.json());
const hasMaxStores = !!spec?.definitions?.plans?.properties?.max_stores;
console.log("plans.max_stores coluna existe:", hasMaxStores);

/* ── PLANS ──────────────────────────────────────────── */
// slug=basic mantém o slug; só name vira "Essencial".
const plansPatch = [
  {
    slug: "basic",
    fields: {
      name: "Essencial",
      price_monthly: 397,
      price_setup: 2500,
      max_feed_reels_day: 2,
      max_stories_day: 5,
      max_users: 1,
      min_months: 6,
      ...(hasMaxStores ? { max_stores: 1 } : {}),
    },
  },
  {
    slug: "pro",
    fields: {
      name: "Profissional",
      price_monthly: 997,
      price_setup: 3500,
      max_feed_reels_day: 5,
      max_stories_day: 10,
      max_users: 2,
      min_months: 12,
      ...(hasMaxStores ? { max_stores: 1 } : {}),
    },
  },
  {
    slug: "business",
    fields: {
      name: "Franquia",
      price_monthly: 1797,
      price_setup: 6500,
      max_feed_reels_day: 20,
      max_stories_day: 15,
      max_users: 6,
      min_months: 12,
      ...(hasMaxStores ? { max_stores: 3 } : {}),
    },
  },
  {
    slug: "enterprise",
    fields: {
      name: "Enterprise",
      price_monthly: null,
      price_setup: null,
      max_feed_reels_day: null,
      max_stories_day: null,
      max_users: null,
      min_months: 12,
      ...(hasMaxStores ? { max_stores: 50 } : {}),
    },
  },
  // plano `interno` fica como está — não mexer.
];

for (const p of plansPatch) {
  const { error } = await sb.from("plans").update(p.fields).eq("slug", p.slug);
  if (error) console.error(`UPDATE plans (${p.slug}) err:`, error.message);
  else console.log(`→ plans.${p.slug} atualizado`);
}

/* ── ADDONS ─────────────────────────────────────────── */
// Opção (b): UPDATE Vitrine → Card WhatsApp + INSERT os outros 13.
// preco_individual = preço único informado pelo user;
// preco_time/preco_rede ficam null (não-escalonados).

// 1) UPDATE Vitrine → Card WhatsApp
{
  const { error } = await sb.from("addons").update({
    nome: "Card WhatsApp",
    slug: "card_whatsapp",
    descricao: "Card de divulgação otimizado para WhatsApp",
    preco_individual: 49,
    preco_time: null,
    preco_rede: null,
    impl_avulso: 0,
    ativo: true,
  }).eq("slug", "vitrine");
  if (error) console.error("UPDATE addons (vitrine→card_whatsapp) err:", error.message);
  else console.log("→ addon vitrine → card_whatsapp");
}

// 2) INSERT demais 13 (idempotente via upsert por slug)
const newAddons = [
  { slug: "tv", nome: "TV", descricao: "Publicação em formato TV horizontal", preco_individual: 49 },
  { slug: "ia_legenda", nome: "IA de Legenda", descricao: "Geração de legendas por IA", preco_individual: 120 },
  { slug: "agendamento", nome: "Agendamento", descricao: "Agendamento de posts no Instagram", preco_individual: 99 },
  { slug: "metricas", nome: "Métricas", descricao: "Métricas do Instagram por perfil", preco_individual: 79 },
  { slug: "stories_plus", nome: "Stories+", descricao: "Stories adicionais/dia", preco_individual: 49 },
  { slug: "perfil_1_3", nome: "Perfil (1-3)", descricao: "Perfil Instagram adicional — faixa 1-3", preco_individual: 147 },
  { slug: "perfil_4_9", nome: "Perfil (4-9)", descricao: "Perfil Instagram adicional — faixa 4-9", preco_individual: 127 },
  { slug: "perfil_10_plus", nome: "Perfil (10+)", descricao: "Perfil Instagram adicional — faixa 10+", preco_individual: 97 },
  { slug: "usuario_extra", nome: "Usuário Extra", descricao: "Login adicional no painel", preco_individual: 29 },
  { slug: "transmissao_individual", nome: "Transmissão Individual", descricao: "1 consultor", preco_individual: 29 },
  { slug: "transmissao_time", nome: "Transmissão Time", descricao: "Até 10 consultores", preco_individual: 199 },
  { slug: "transmissao_rede", nome: "Transmissão Rede", descricao: "Até 30 consultores", preco_individual: 449 },
  { slug: "manutencao", nome: "Manutenção", descricao: "Pacote mensal de manutenção/ajustes", preco_individual: 197 },
];

for (const a of newAddons) {
  // upsert por slug: tenta update, se não afetou nada, insere.
  const { data: upd, error: e1 } = await sb.from("addons").update({
    nome: a.nome, descricao: a.descricao, preco_individual: a.preco_individual,
    preco_time: null, preco_rede: null, impl_avulso: 0, ativo: true,
  }).eq("slug", a.slug).select("id");
  if (e1) { console.error(`UPDATE addons (${a.slug}) err:`, e1.message); continue; }
  if (upd && upd.length > 0) { console.log(`→ addon ${a.slug} atualizado`); continue; }
  const { error: e2 } = await sb.from("addons").insert({
    slug: a.slug, nome: a.nome, descricao: a.descricao, preco_individual: a.preco_individual,
    preco_time: null, preco_rede: null, impl_avulso: 0, ativo: true,
  });
  if (e2) console.error(`INSERT addons (${a.slug}) err:`, e2.message);
  else console.log(`→ addon ${a.slug} inserido`);
}

/* ── Verificação ────────────────────────────────────── */
const { data: checkPlans } = await sb.from("plans").select("slug, name, price_monthly, price_setup, max_feed_reels_day, max_stories_day, max_users, min_months" + (hasMaxStores ? ", max_stores" : "")).order("sort_order");
console.log("\n--- plans ---");
for (const p of checkPlans ?? []) console.log(JSON.stringify(p));

const { data: checkAddons } = await sb.from("addons").select("slug, nome, preco_individual").order("slug");
console.log("\n--- addons ---");
for (const a of checkAddons ?? []) console.log(JSON.stringify(a));

if (!hasMaxStores) {
  console.log("\n⚠ Coluna plans.max_stores ainda não existe. Rode database/migration_plans_v2_prices.sql no Supabase SQL Editor.");
}
