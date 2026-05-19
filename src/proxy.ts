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

// Cache de manutenção (módulo-level, persiste por worker; ~5s TTL)
let maintenanceCache: { active: boolean; ts: number } | null = null;
const MAINTENANCE_TTL = 5_000;

function raceTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("middleware_timeout")), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function isMaintenanceActive(): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.ts < MAINTENANCE_TTL) {
    console.log("[maintenance] cache hit →", maintenanceCache.active);
    return maintenanceCache.active;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/system_config?select=value&key=eq.maintenance_active&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    const rows: { value: string }[] = await res.json();
    const active = rows?.[0]?.value === "true";
    console.log("[maintenance] db rows →", JSON.stringify(rows), "→ active:", active);
    maintenanceCache = { active, ts: now };
    return active;
  } catch (err) {
    console.log("[maintenance] fetch error →", String(err), "→ fallback:", maintenanceCache?.active ?? false);
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
    case "adm":      return "/inicio";
    case "operador": return "/operador/inicio";
    case "cliente":  return "/cliente/inicio";
    case "unidade":  return "/unidade/inicio";
    case "gerente":  return "/gerente/inicio";
    case "gestor":   return "/gerente/inicio";
    case "vendedor": return "/consultor/inicio";
    default:         return "/login";
  }
}

function isAllowed(role: string, pathname: string): boolean {
  if (role === "adm") return true;
  if (role === "operador") return pathname.startsWith(OPERADOR_PREFIX);
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
  if (role === "vendedor") return pathname.startsWith(VENDEDOR_PREFIX);
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas — passa direto sem nenhuma chamada de rede
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
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

  // Auth — timeout de 5s para não travar o middleware
  let user: { id: string } | null = null;
  try {
    const { data } = await raceTimeout(supabase.auth.getUser(), 5000);
    user = data.user;
  } catch {
    // Timeout ou erro de auth: redireciona para login (fail safe)
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Profile — timeout de 5s; falha graciosamente (role null → redireciona para login)
  let role: string | null = null;
  try {
    const { data: profile } = await raceTimeout(
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      5000
    );
    role = (profile?.role as string | null) ?? null;
  } catch {
    // Timeout no profile: deixa passar para o login para não bloquear acesso
    role = null;
  }

  const myHome = homeForRole(role);

  // Manutenção — bloqueia usuários não-ADM (fetch com AbortController interno)
  if (role !== "adm" && !pathname.startsWith("/manutencao")) {
    const inMaintenance = await isMaintenanceActive();
    if (inMaintenance) {
      const url = request.nextUrl.clone();
      url.pathname = "/manutencao";
      return NextResponse.redirect(url);
    }
  }

  // Chat desativado — timeout de 3s
  if (CHAT_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    try {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data } = await raceTimeout(
        admin.from("system_config").select("value").eq("key", "chat_enabled").maybeSingle(),
        3000
      );
      if (data?.value === "false") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "?chat=disabled";
        return NextResponse.redirect(url);
      }
    } catch {
      // Timeout ou erro: deixa entrar no chat (fail open)
    }
  }

  // Usuário logado em /login ou / → redireciona para sua home
  if ((pathname === "/" || pathname === "/login") && myHome !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = myHome;
    return NextResponse.redirect(url);
  }

  // Sem role válida → volta para /login
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
     * - _next/static, _next/image (static assets)
     * - favicon.ico
     * - /api/* (route handlers têm sua própria proteção)
     * - arquivos de imagem/fonte
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)",
  ],
};
