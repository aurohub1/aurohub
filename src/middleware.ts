import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/edge-config";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|manutencao|api/).*)"],
};

export async function middleware(request: NextRequest) {
  try {
    const maintenance = await get<boolean>("maintenance");
    if (maintenance === true) {
      const url = request.nextUrl.clone();
      url.pathname = "/manutencao";
      return NextResponse.redirect(url);
    }
  } catch {
    // Edge Config indisponível — não bloqueia o acesso
  }
  return NextResponse.next();
}
