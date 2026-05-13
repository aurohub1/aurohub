import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mp, Preference } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      plan_slug,
      billing_cycle,
      selected_addons,
      price_monthly,
      price_implantacao,
      subscriber_data,
      contract_accepted_ip,
    } = body;

    if (!plan_slug || !billing_cycle || price_monthly == null || price_implantacao == null || !subscriber_data) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 1. Criar registro pending em subscriptions
    const { data: sub, error: subErr } = await sb
      .from("subscriptions")
      .insert({
        plan_slug,
        billing_cycle,
        selected_addons: selected_addons ?? [],
        price_monthly,
        price_implantacao,
        status: "pending",
        contract_accepted_at: new Date().toISOString(),
        contract_accepted_ip,
      })
      .select("id")
      .single();

    if (subErr || !sub) {
      console.error("[MP] Erro ao criar subscription:", subErr);
      return NextResponse.json({ error: "Erro ao registrar assinatura" }, { status: 500 });
    }

    // 2. Criar Preference no MP
    const preference = new Preference(mp);
    const pref = await preference.create({
      body: {
        items: [
          {
            id: sub.id,
            title: `Implantação Aurohub — ${plan_slug}`,
            quantity: 1,
            unit_price: Number(price_implantacao),
            currency_id: "BRL",
          },
        ],
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.aurovista.com.br"}/assinar/sucesso`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.aurovista.com.br"}/assinar/pendente`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.aurovista.com.br"}/assinar/erro`,
        },
        auto_return: "approved",
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.aurovista.com.br"}/api/mp/webhook`,
        metadata: {
          subscription_id: sub.id,
          plan_slug,
          billing_cycle,
          selected_addons: selected_addons ?? [],
          price_monthly,
          subscriber_data,
        },
        payer: {
          name: subscriber_data.name?.split(" ")[0] ?? "",
          surname: subscriber_data.name?.split(" ").slice(1).join(" ") ?? "",
          email: subscriber_data.email,
          phone: subscriber_data.phone ? { number: subscriber_data.phone } : undefined,
        },
      },
    });

    // 3. Salvar preference_id
    await sb.from("subscriptions").update({ mp_payment_id: pref.id ?? null }).eq("id", sub.id);

    return NextResponse.json({
      preference_id: pref.id,
      init_point: pref.init_point,
    });
  } catch (err) {
    console.error("[MP] create-preference error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
