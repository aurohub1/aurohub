import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getShutterstockConfig, signShutterstockState } from "@/lib/shutterstock-oauth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await createSupabaseServer();
  const {data:{user}} = await auth.auth.getUser();
  if (!user) return NextResponse.json({error:"Não autenticado"},{status:401});

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const {data:profile,error:profileError} = await admin.from("profiles").select("role").eq("id",user.id).single();
  const administrativeRoles = new Set(["adm", "admin", "superadmin"]);
  if (profileError || !profile?.role || !administrativeRoles.has(profile.role)) return NextResponse.json({error:"Apenas administradores podem conectar a Shutterstock."},{status:403});

  const config=getShutterstockConfig();
  if (!config) return NextResponse.json({error:"Configuração da Shutterstock incompleta."},{status:503});

  const nonce=crypto.randomUUID(),exp=Date.now()+300_000;
  await admin.from("shutterstock_oauth_states").delete().lt("expires_at",new Date().toISOString());
  const {error:stateError}=await admin.from("shutterstock_oauth_states").insert({nonce,user_id:user.id,expires_at:new Date(exp).toISOString()});
  if (stateError) return NextResponse.json({error:"Não foi possível iniciar a autorização."},{status:500});

  const authorize=new URL("https://api.shutterstock.com/v2/oauth/authorize");
  authorize.searchParams.set("client_id",config.clientId);
  authorize.searchParams.set("redirect_uri",config.redirectUri);
  authorize.searchParams.set("response_type","code");
  authorize.searchParams.set("scope",config.scopes);
  authorize.searchParams.set("state",signShutterstockState({nonce,userId:user.id,exp},config.clientSecret));
  return NextResponse.redirect(authorize);
}
