import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "adm" | "operador" | "cliente" | "unidade" | "gerente" | "vendedor";

export interface ProfileLicensee {
  id: string;
  name: string;
  plan: string | null;
  plan_slug: string | null;
  status: string;
  segment_id: string | null;
}

export interface ProfileStore {
  id: string;
  name: string;
  can_publish: boolean;
  can_download: boolean;
  can_ia: boolean;
}

export interface ProfilePlan {
  slug: string;
  name: string;
  max_posts_day: number;
  can_metrics: boolean;
  can_schedule: boolean;
  can_print: boolean;
  can_ia_legenda: boolean;
  is_enterprise: boolean;
}

export interface FullProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: Role | null;
  licensee_id: string | null;
  store_id: string | null;
  licensee: ProfileLicensee | null;
  store: ProfileStore | null;
  plan: ProfilePlan | null;
}

/**
 * Carrega o profile completo do usuário autenticado + licensee + store + plan.
 * Aceita qualquer cliente Supabase (browser ou server).
 */
export async function getProfile(client: SupabaseClient): Promise<FullProfile | null> {
  const { data: userData } = await client.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  const { data: profile } = await client
    .from("profiles")
    .select("id,name,email,role,licensee_id,store_id")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const result: FullProfile = {
    id: profile.id,
    name: profile.name ?? (user.user_metadata?.name as string | undefined) ?? user.email ?? null,
    email: profile.email ?? user.email ?? null,
    role: (profile.role as Role) ?? null,
    licensee_id: profile.licensee_id,
    store_id: profile.store_id,
    licensee: null,
    store: null,
    plan: null,
  };

  if (profile.licensee_id) {
    const { data: lic } = await client
      .from("licensees")
      .select("id,name,plan,plan_slug,status,segment_id")
      .eq("id", profile.licensee_id)
      .single();
    if (lic) {
      result.licensee = lic as ProfileLicensee;
      const slug = (lic.plan_slug as string | null) || (lic.plan as string | null);
      if (slug) {
        const { data: plan } = await client
          .from("plans")
          .select("slug,name,max_posts_day,can_metrics,can_schedule,can_print,can_ia_legenda,is_enterprise")
          .eq("slug", slug)
          .single();
        if (plan) result.plan = plan as ProfilePlan;
      }
    }
  }

  if (profile.store_id) {
    const { data: store } = await client
      .from("stores")
      .select("id,name,can_publish,can_download,can_ia")
      .eq("id", profile.store_id)
      .single();
    if (store) result.store = store as ProfileStore;
  }

  return result;
}

/** Verifica se o usuário tem pelo menos um dos roles listados. */
export function hasRole(profile: FullProfile | null, roles: Role[]): boolean {
  if (!profile?.role) return false;
  return roles.includes(profile.role);
}

/** ADM vê tudo. Outros dependem da flag da unidade + limite do plano. */
export function canPublish(profile: FullProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === "adm") return true;
  if (!profile.store?.can_publish) return false;
  if (profile.plan && profile.plan.max_posts_day === 0 && !profile.plan.is_enterprise) return false;
  return true;
}

export function canDownload(profile: FullProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === "adm") return true;
  return !!profile.store?.can_download;
}

/** IA = flag da unidade + plano com métricas habilitadas. */
export function canIA(profile: FullProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === "adm") return true;
  return !!(profile.store?.can_ia && profile.plan?.can_metrics);
}

/** Home do usuário baseada no role. */
export function homeForRole(role: Role | string | null): string {
  switch (role) {
    case "adm": return "/inicio";
    case "operador": return "/operador/inicio";
    case "cliente": return "/cliente/inicio";
    case "unidade": return "/unidade/inicio";
    case "gerente": return "/gerente/inicio";
    case "vendedor": return "/consultor/inicio";
    default: return "/login";
  }
}
