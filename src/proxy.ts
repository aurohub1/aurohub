import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const PUBLIC_PATHS = ["/manutencao", "/login", "/api", "/_next", "/favicon", "/public"];

const CHAT_PATHS = [
  "/cliente/chat",
  "/gerente/chat",
  "/consultor/chat",
  "/unidade/chat",
];

// Cache de manutenção (módulo-level, persiste por worker; ~30s TTL)
let maintenanceCache: { active: boolean; ts: number } | null = null;
const MAINTENANCE_TTL = 30_000;

async function isMaintenanceActive(): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.ts < MAINTENANCE_TTL) {
    return maintenanceCache.active;
  }
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/system_config?select=value&key=eq.maintenance_active&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        cache: "no-store",
      }
    );
    const rows: { value: string }[] = await res.json();
    const active = rows?.[0]?.value === "true";
    maintenanceCache = { active, ts: now };
    return active;
  } catch {
    return maintenanceCache ? maintenanceCache.active : false;
  }
}

// Rotas ADM (grupo (dashboard) com URLs diretas)
const ADM_ROUTES = [
  "/inicio",
  "/dashboard",
  "/editor-de-templates",
  "/editor",
  "/clientes",
  "/planos",
  "/segmentos",
  "/usuarios",
  "/logs",
  "/configuracoes",
  "/leads-crm",
  "/embarques",
  "/faq-suporte",
  "/metricas",
  "/central-de-publicacao",
  "/editor-landing",
  "/calculadora",
  "/suporte",
];
const OPERADOR_PREFIX = "/operador";
const CLIENTE_PREFIX = "/cliente";
const UNIDADE_PREFIX = "/unidade";
const GERENTE_PREFIX = "/gerente";
const VENDEDOR_PREFIX = "/consultor";

function matchesAny(pathname: string, list: string[]): boolean {
  return list.some(p => pathname === p || pathname.startsWith(p + "/"));
}

function isAdmRoute(pathname: string): boolean {
  return matchesAny(pathname, ADM_ROUTES);
}

function homeForRole(role: string | null): string {
  switch (role) {
    case "adm": return "/inicio";
    case "operador": return "/operador/inicio";
    case "cliente": return "/cliente/inicio";
    case "unidade": return "/unidade/inicio";
    case "gerente": return "/gerente/inicio";
    case "gestor": return "/gerente/inicio";
    case "vendedor": return "/consultor/inicio";
    default: return "/login";
  }
}

/**
 * Regras de acesso hierárquico (conforme layouts dos route groups):
 *  - adm      → tudo
 *  - cliente  → /cliente, /unidade, /vendedor   (não ADM routes)
 *  - unidade  → /unidade, /vendedor              (não /cliente, não ADM)
 *  - vendedor → /vendedor                        (só o seu)
 */
function isAllowed(role: string, pathname: string): boolean {
  if (role === "adm") return true;

  if (role === "operador") {
    // Operador acessa apenas /operador/* — nunca ADM routes
    return pathname.startsWith(OPERADOR_PREFIX);
  }

  if (isAdmRoute(pathname)) return false;

  if (role === "cliente") {
    return pathname.startsWith(CLIENTE_PREFIX)
        || pathname.startsWith(UNIDADE_PREFIX)
        || pathname.startsWith(GERENTE_PREFIX)
        || pathname.startsWith(VENDEDOR_PREFIX);
  }
  if (role === "unidade") {
    return pathname.startsWith(UNIDADE_PREFIX)
        || pathname.startsWith(GERENTE_PREFIX)
        || pathname.startsWith(VENDEDOR_PREFIX);
  }
  if (role === "gerente" || role === "gestor") {
    return pathname.startsWith(GERENTE_PREFIX)
        || pathname.startsWith(VENDEDOR_PREFIX);
  }
  if (role === "vendedor") {
    return pathname.startsWith(VENDEDOR_PREFIX);
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas — nunca redirecionar, nunca lopar
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request });
  }

  // Supabase server client ligado aos cookies da request
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Não autenticado
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Autenticado — pega role do profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as string | null) ?? null;
  const myHome = homeForRole(role);

  // Manutenção — bloqueia usuários não-ADM
  if (role !== "adm" && !pathname.startsWith("/manutencao")) {
    const inMaintenance = await isMaintenanceActive();
    if (inMaintenance) {
      const url = request.nextUrl.clone();
      url.pathname = "/manutencao";
      return NextResponse.redirect(url);
    }
  }

  // Chat desativado — bloqueia acesso às rotas de chat
  if (CHAT_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    try {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data } = await admin
        .from("system_config")
        .select("value")
        .eq("key", "chat_enabled")
        .maybeSingle();
      if (data?.value === "false") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "?chat=disabled";
        return NextResponse.redirect(url);
      }
    } catch {
      // on error, let through
    }
  }

  // Usuário logado em /login ou / → manda pra sua home (evita loop se myHome for /login)
  if ((pathname === "/" || pathname === "/login") && myHome !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = myHome;
    return NextResponse.redirect(url);
  }

  // Sem role válida → permite ficar no /login (sem redirect loop)
  if (!role) {
    if (pathname === "/login") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Gating por hierarquia
  if (!isAllowed(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = myHome;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (static assets)
     * - favicon.ico
     * - image files
     * - /api/* (route handlers têm sua própria proteção)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
