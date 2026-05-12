import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { fillTemplate } from "@/lib/contract-template";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["adm", "operador"].includes((profile as { role: string }).role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json() as Record<string, unknown>;

  const required = ["licensee_id", "contact_name", "user_email", "company_name", "plan_name",
    "monthly_value", "monthly_total", "setup_fee", "contract_duration", "start_date"];
  for (const field of required) {
    if (!body[field] && body[field] !== 0) {
      return NextResponse.json({ error: `Campo obrigatório ausente: ${field}` }, { status: 400 });
    }
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const year = new Date().getFullYear();
  const { data: lastContract } = await sb
    .from("contracts")
    .select("contract_number")
    .like("contract_number", `AV-${year}-%`)
    .order("contract_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let seq = 1;
  if (lastContract) {
    const parts = (lastContract as { contract_number: string }).contract_number.split("-");
    seq = (parseInt(parts[2] ?? "0", 10) || 0) + 1;
  }

  const contractNumber = `AV-${year}-${String(seq).padStart(4, "0")}`;

  const startDate = String(body.start_date);
  const duration = Number(body.contract_duration);
  const endDate = addMonths(startDate, duration);

  const { data: contract, error } = await sb
    .from("contracts")
    .insert({
      contract_number: contractNumber,
      licensee_id: String(body.licensee_id),
      contact_name: String(body.contact_name),
      user_email: String(body.user_email),
      company_name: String(body.company_name),
      company_cnpj: body.company_cnpj ? encrypt(String(body.company_cnpj)) : null,
      company_address: body.company_address ? encrypt(String(body.company_address)) : null,
      plan_name: String(body.plan_name),
      monthly_value: Number(body.monthly_value),
      monthly_total: Number(body.monthly_total),
      setup_fee: Number(body.setup_fee),
      stores_count: Number(body.stores_count ?? 1),
      users_count: Number(body.users_count ?? 1),
      addons_list: body.addons_list ? String(body.addons_list) : null,
      payment_method: body.payment_method ? String(body.payment_method) : null,
      payment_day: Number(body.payment_day ?? 10),
      contract_duration: duration,
      start_date: startDate,
      end_date: endDate,
      status: "pending",
      document_version: "2.1",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filled = fillTemplate(contract as Record<string, unknown>);
  return NextResponse.json({ contract, filled });
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}
