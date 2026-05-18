import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

async function updateEdgeConfig(maintenance: boolean, failures: number) {
  const token = process.env.VERCEL_TOKEN;
  const storeId = process.env.EDGE_CONFIG_ID;
  if (!token || !storeId) return;
  await fetch(`https://api.vercel.com/v1/edge-config/${storeId}/items`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        { operation: "upsert", key: "maintenance", value: maintenance },
        { operation: "upsert", key: "supabase_failures", value: failures },
      ],
    }),
  });
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let isHealthy = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      "https://emcafedppvwparimvtob.supabase.co/auth/v1/health",
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    isHealthy = res.ok;
  } catch {
    isHealthy = false;
  }

  const { get } = await import("@vercel/edge-config");
  const currentFailures = ((await get("supabase_failures")) as number) ?? 0;
  const newFailures = isHealthy ? 0 : currentFailures + 1;
  const shouldBeMaintenance = newFailures >= 2;

  await updateEdgeConfig(shouldBeMaintenance, newFailures);

  return NextResponse.json({
    healthy: isHealthy,
    failures: newFailures,
    maintenance: shouldBeMaintenance,
    timestamp: new Date().toISOString(),
  });
}
