import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mp, Payment, PreApproval } from "@/lib/mercadopago";
import { sendWelcomeEmail } from "@/lib/emails";

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function tempPassword(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

async function handlePaymentApproved(paymentId: string) {
  const sb = adminDb();

  // Buscar dados do pagamento no MP
  const paymentClient = new Payment(mp);
  const paymentData = await paymentClient.get({ id: paymentId });

  if (paymentData.status !== "approved") return;

  const meta = paymentData.metadata as Record<string, unknown> | undefined;
  if (!meta?.subscription_id) return;

  const subscriptionId = String(meta.subscription_id);

  // Verificar se já foi processado
  const { data: sub } = await sb
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (!sub || sub.status === "active") return;

  const subscriberData = meta.subscriber_data as Record<string, string> | undefined;
  const planSlug = String(meta.plan_slug ?? "basic");
  const billingCycle = String(meta.billing_cycle ?? "monthly");
  const priceMonthly = Number(meta.price_monthly ?? 0);
  const selectedAddons = (meta.selected_addons as string[]) ?? [];

  // Buscar nome do plano
  const { data: planRow } = await sb.from("plans").select("name").eq("slug", planSlug).maybeSingle();
  const planName = planRow?.name ?? planSlug;

  // 1. Criar licensee
  const { data: licensee, error: licErr } = await sb
    .from("licensees")
    .insert({
      name: subscriberData?.company_name || subscriberData?.name || "Agência",
      email: subscriberData?.email ?? "",
      plan: planSlug,
      status: "active",
      tipo: "franqueado",
    })
    .select("id")
    .single();

  if (licErr || !licensee) {
    console.error("[Webhook] Erro ao criar licensee:", licErr);
    return;
  }

  // 2. Criar usuário no auth
  const pass = tempPassword();
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email: subscriberData?.email ?? "",
    password: pass,
    email_confirm: true,
    user_metadata: { name: subscriberData?.name ?? "" },
  });

  if (authErr || !authData.user) {
    console.error("[Webhook] Erro ao criar usuário:", authErr);
    return;
  }

  // 3. Criar store padrão
  const { data: store } = await sb
    .from("stores")
    .insert({
      licensee_id: licensee.id,
      name: subscriberData?.company_name || subscriberData?.name || "Loja Principal",
      can_publish: true,
      can_download: true,
      can_ia: false,
    })
    .select("id")
    .single();

  // 4. Criar profile
  await sb.from("profiles").insert({
    id: authData.user.id,
    name: subscriberData?.name ?? "",
    email: subscriberData?.email ?? "",
    role: "cliente",
    licensee_id: licensee.id,
    store_id: store?.id ?? null,
    status: "active",
  });

  // 5. Criar PreApproval (assinatura recorrente) no MP
  let mpSubId: string | null = null;
  try {
    if (subscriberData?.email) {
      const preApproval = new PreApproval(mp);
      const pa = await preApproval.create({
        body: {
          reason: `Mensalidade Aurohub — ${planName}`,
          auto_recurring: {
            frequency: 1,
            frequency_type: billingCycle === "annual" ? "years" : "months",
            transaction_amount: priceMonthly,
            currency_id: "BRL",
          },
          payer_email: subscriberData.email,
          back_url: "https://app.aurovista.com.br/assinar/sucesso",
          status: "authorized",
        } as Parameters<typeof preApproval.create>[0]["body"],
      });
      mpSubId = pa.id ?? null;
    }
  } catch (e) {
    console.error("[Webhook] Erro ao criar PreApproval:", e);
  }

  // 6. Atualizar subscription
  await sb.from("subscriptions").update({
    status: "active",
    licensee_id: licensee.id,
    mp_subscription_id: mpSubId,
    mp_payment_id: String(paymentId),
  }).eq("id", subscriptionId);

  // 7. Registrar aceite de briefing
  if (sub.contract_accepted_ip) {
    await sb.from("briefing_consents").insert({
      licensee_id: licensee.id,
      accepted_ip: sub.contract_accepted_ip,
    });
  }

  // 8. Enviar email de boas-vindas
  if (subscriberData?.email) {
    await sendWelcomeEmail(subscriberData.email, {
      name: subscriberData.name ?? "Cliente",
      email: subscriberData.email,
      tempPassword: pass,
      planName,
      priceMonthly,
    }).catch((e) => console.error("[Webhook] Erro ao enviar email:", e));
  }

  // 9. Criar briefing automaticamente
  await sb.from("briefings").insert({ licensee_id: licensee.id });
}

async function handlePreApproval(preApprovalId: string) {
  const sb = adminDb();
  const preApproval = new PreApproval(mp);
  const pa = await preApproval.get({ id: preApprovalId });

  const { data: sub } = await sb
    .from("subscriptions")
    .select("licensee_id")
    .eq("mp_subscription_id", preApprovalId)
    .maybeSingle();

  if (!sub?.licensee_id) return;

  if (pa.status === "authorized") {
    await sb.from("licensees").update({ status: "active" }).eq("id", sub.licensee_id);
  } else if (pa.status === "cancelled" || pa.status === "paused") {
    await sb.from("licensees").update({ status: "suspended" }).eq("id", sub.licensee_id);
    await sb.from("subscriptions").update({ status: "suspended" }).eq("mp_subscription_id", preApprovalId);
  }
}

export async function POST(req: NextRequest) {
  // Retorna 200 imediatamente e processa async
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  void (async () => {
    try {
      const type = body.type as string | undefined;
      const dataId = (body.data as Record<string, unknown> | undefined)?.id;

      if (type === "payment" && dataId) {
        await handlePaymentApproved(String(dataId));
      } else if (type === "subscription_preapproval" && dataId) {
        await handlePreApproval(String(dataId));
      }
    } catch (e) {
      console.error("[Webhook] Erro no processamento:", e);
    }
  })();

  return NextResponse.json({ status: "ok" });
}
