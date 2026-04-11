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
] as const;

export type Feature = (typeof ALL_FEATURES)[number];

export const FEATURE_LABELS: Record<Feature, string> = {
  publicar:    "Publicar",
  metricas:    "Métricas Instagram",
  ia_legenda:  "IA para legendas",
  agendamento: "Agendamento de posts",
  templates:   "Biblioteca de templates",
  unidades:    "Gestão de unidades",
  usuarios:    "Gestão de usuários",
  vendedores:  "Gestão de vendedores",
  calendario:  "Calendário",
  lembretes:   "Lembretes",
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
];

/**
 * Set de features ativas derivado apenas do plano — antes dos overrides.
 */
export function planDefaultFeatures(plan: ProfilePlan | null): Set<Feature> {
  const set = new Set<Feature>(BASE_FEATURES);
  if (plan?.can_metrics) set.add("metricas");
  if (plan?.can_schedule) set.add("agendamento");
  if (plan?.can_ia_legenda) set.add("ia_legenda");
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
    .select("feature, enabled")
    .eq("licensee_id", profile.licensee_id);

  for (const row of (data ?? []) as { feature: string; enabled: boolean }[]) {
    if (!(ALL_FEATURES as readonly string[]).includes(row.feature)) continue;
    const f = row.feature as Feature;
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
    .select("feature, enabled")
    .eq("licensee_id", licenseeId);
  const map: Partial<Record<Feature, boolean>> = {};
  for (const row of (data ?? []) as { feature: string; enabled: boolean }[]) {
    if (!(ALL_FEATURES as readonly string[]).includes(row.feature)) continue;
    map[row.feature as Feature] = row.enabled;
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
  const toUpsert: { licensee_id: string; feature: string; enabled: boolean }[] = [];
  const toDelete: string[] = [];
  for (const f of ALL_FEATURES) {
    const v = desired[f];
    if (v === undefined) toDelete.push(f);
    else toUpsert.push({ licensee_id: licenseeId, feature: f, enabled: v });
  }

  if (toUpsert.length > 0) {
    await sb
      .from("licensee_feature_overrides")
      .upsert(toUpsert, { onConflict: "licensee_id,feature" });
  }
  if (toDelete.length > 0) {
    await sb
      .from("licensee_feature_overrides")
      .delete()
      .eq("licensee_id", licenseeId)
      .in("feature", toDelete);
  }
}
