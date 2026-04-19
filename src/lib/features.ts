import type { SupabaseClient } from "@supabase/supabase-js";
import type { FullProfile, ProfilePlan } from "@/lib/auth";

/**
 * Features que podem ser ativadas/desativadas por cliente.
 * Alguns vêm habilitados por padrão, outros dependem de flags do plano.
 * O ADM pode sobrescrever qualquer feature via licensee_feature_overrides.
 */
export const ALL_FEATURES = [
  "publicar",
  "metricas",
  "ia_legenda",
  "agendamento",
  "templates",
  "unidades",
  "usuarios",
  "vendedores",
  "calendario",
  "lembretes",
  "lamina_4destinos",
  "musica",
  // Formatos disponíveis para publicar (visibilidade do seletor Stories/Reels/Feed/TV/4Destinos)
  "format_stories",
  "format_reels",
  "format_feed",
  "format_tv",
  "format_4destinos",
  // Tipos de formulário disponíveis (tabs Pacote/Campanha/Cruzeiro/Anoiteceu)
  "form_pacote",
  "form_campanha",
  "form_cruzeiro",
  "form_anoiteceu",
] as const;

export type Feature = (typeof ALL_FEATURES)[number];

export const FEATURE_LABELS: Record<Feature, string> = {
  publicar:         "Publicar",
  metricas:         "Métricas Instagram",
  ia_legenda:       "IA para legendas",
  agendamento:      "Agendamento de posts",
  templates:        "Biblioteca de templates",
  unidades:         "Gestão de unidades",
  usuarios:         "Gestão de usuários",
  vendedores:       "Gestão de consultores",
  calendario:       "Calendário",
  lembretes:        "Lembretes",
  lamina_4destinos: "Lâmina 4 Destinos (add-on)",
  musica:           "Música (add-on)",
  format_stories:    "Formato — Stories",
  format_reels:      "Formato — Reels",
  format_feed:       "Formato — Feed",
  format_tv:         "Formato — TV",
  format_4destinos:  "Formato — 4 Destinos (add-on)",
  form_pacote:       "Formulário — Pacote",
  form_campanha:     "Formulário — Campanha",
  form_cruzeiro:     "Formulário — Cruzeiro",
  form_anoiteceu:    "Formulário — Anoiteceu",
};

/** Features sempre on por padrão (independentes do plano). */
const BASE_FEATURES: Feature[] = [
  "publicar",
  "templates",
  "usuarios",
  "unidades",
  "vendedores",
  "calendario",
  "lembretes",
  // Todos os planos têm por padrão: Stories + Pacote + Campanha
  "format_stories",
  "form_pacote",
  "form_campanha",
];

/** Planos "Pro ou superior" liberam formatos e formulários avançados por padrão. */
const PRO_PLUS_SLUGS = new Set(["profissional", "franquia", "enterprise"]);

/**
 * Set de features ativas derivado apenas do plano — antes dos overrides.
 */
export function planDefaultFeatures(plan: ProfilePlan | null): Set<Feature> {
  const set = new Set<Feature>(BASE_FEATURES);
  if (plan?.can_metrics) set.add("metricas");
  if (plan?.can_schedule) set.add("agendamento");
  if (plan?.can_ia_legenda) set.add("ia_legenda");

  // Pro+: libera formatos e formulários extras
  const slug = (plan?.slug || "").toLowerCase();
  if (PRO_PLUS_SLUGS.has(slug)) {
    set.add("format_reels");
    set.add("format_feed");
    set.add("format_tv");
    set.add("form_cruzeiro");
    set.add("form_anoiteceu");
  }
  // format_4destinos é sempre add-on manual — nunca entra por plano.
  return set;
}

/**
 * Features efetivas para o usuário.
 * Regra: plano define o default, overrides do ADM têm prioridade.
 */
export async function getFeatures(
  sb: SupabaseClient,
  profile: FullProfile | null
): Promise<Set<Feature>> {
  const set = planDefaultFeatures(profile?.plan ?? null);
  if (!profile?.licensee_id) return set;

  const { data } = await sb
    .from("licensee_feature_overrides")
    .select("feature_key, enabled")
    .eq("licensee_id", profile.licensee_id);

  for (const row of (data ?? []) as { feature_key: string; enabled: boolean }[]) {
    if (!(ALL_FEATURES as readonly string[]).includes(row.feature_key)) continue;
    const f = row.feature_key as Feature;
    if (row.enabled) set.add(f);
    else set.delete(f);
  }
  return set;
}

/**
 * Busca as overrides cruas de um licensee (usado pelo painel do ADM).
 * Retorna um mapa feature → enabled.
 */
export async function getLicenseeOverrides(
  sb: SupabaseClient,
  licenseeId: string
): Promise<Partial<Record<Feature, boolean>>> {
  const { data } = await sb
    .from("licensee_feature_overrides")
    .select("feature_key, enabled")
    .eq("licensee_id", licenseeId);
  const map: Partial<Record<Feature, boolean>> = {};
  for (const row of (data ?? []) as { feature_key: string; enabled: boolean }[]) {
    if (!(ALL_FEATURES as readonly string[]).includes(row.feature_key)) continue;
    map[row.feature_key as Feature] = row.enabled;
  }
  return map;
}

/**
 * Persiste o estado desejado de overrides para um licensee.
 * - Se `desired[feature] === undefined`, remove a override existente (volta ao default do plano).
 * - Caso contrário, upserta com o valor booleano.
 */
export async function saveLicenseeOverrides(
  sb: SupabaseClient,
  licenseeId: string,
  desired: Partial<Record<Feature, boolean>>
): Promise<void> {
  const toUpsert: { licensee_id: string; feature_key: string; enabled: boolean }[] = [];
  const toDelete: string[] = [];
  for (const f of ALL_FEATURES) {
    const v = desired[f];
    if (v === undefined) toDelete.push(f);
    else toUpsert.push({ licensee_id: licenseeId, feature_key: f, enabled: v });
  }

  console.log("[saveLicenseeOverrides] licenseeId:", licenseeId);
  console.log("[saveLicenseeOverrides] desired:", desired);
  console.log("[saveLicenseeOverrides] toUpsert:", toUpsert);
  console.log("[saveLicenseeOverrides] toDelete:", toDelete);

  if (toUpsert.length > 0) {
    const { data, error } = await sb
      .from("licensee_feature_overrides")
      .upsert(toUpsert, { onConflict: "licensee_id,feature_key" })
      .select();
    console.log("[saveLicenseeOverrides] upsert result:", { data, error });
    if (error) throw new Error(`upsert features: ${error.message}`);
  }
  if (toDelete.length > 0) {
    const { data, error } = await sb
      .from("licensee_feature_overrides")
      .delete()
      .eq("licensee_id", licenseeId)
      .in("feature_key", toDelete)
      .select();
    console.log("[saveLicenseeOverrides] delete result:", { data, error });
    if (error) throw new Error(`delete features: ${error.message}`);
  }
}
