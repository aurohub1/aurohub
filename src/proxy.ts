import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware de auth por role.
 * Lê cookies → Supabase session → profiles.role → decide redirect.
 */

const PUBLIC_PATHS = ["/login"];

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
  if (role === "gerente") {
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
    if (PUBLIC_PATHS.includes(pathname)) return response;
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
