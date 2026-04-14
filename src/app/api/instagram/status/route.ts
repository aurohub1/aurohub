import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/instagram/status?creation_id=X&access_token=Y
 * Retorna { status_code } do container Instagram.
 * status_code: "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED"
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const creation_id = searchParams.get("creation_id");
  const access_token = searchParams.get("access_token");

  if (!creation_id || !access_token) {
    return NextResponse.json({ error: "creation_id and access_token required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://graph.instagram.com/v23.0/${creation_id}?fields=status_code,status&access_token=${encodeURIComponent(access_token)}`
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || "Erro IG", detail: data }, { status: 500 });
    }
    return NextResponse.json({ status_code: data.status_code || "", status: data.status || "" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown" }, { status: 500 });
  }
}
