import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { encryptShutterstockToken, getShutterstockConfig, verifyShutterstockState } from "@/lib/shutterstock-oauth";

export const runtime = "nodejs";

type TokenResponse={access_token?:string;error?:string;message?:string};

export async function GET(request:NextRequest) {
  const config=getShutterstockConfig();
  if (!config) return NextResponse.json({error:"Configuração da Shutterstock incompleta."},{status:503});

  const denied=request.nextUrl.searchParams.get("error_description")||request.nextUrl.searchParams.get("error");
  if (denied) return NextResponse.redirect(new URL("/inicio?shutterstock=denied",request.nextUrl.origin));
  const code=request.nextUrl.searchParams.get("code"),state=request.nextUrl.searchParams.get("state");
  if (!code||!state) return NextResponse.json({error:"Retorno OAuth incompleto."},{status:400});
  const context=verifyShutterstockState(state,config.clientSecret);
  if (!context) return NextResponse.json({error:"Autorização inválida ou expirada."},{status:400});

  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const {data:consumed,error:consumeError}=await admin.from("shutterstock_oauth_states").delete().eq("nonce",context.nonce).eq("user_id",context.userId).gte("expires_at",new Date().toISOString()).select("nonce").maybeSingle();
  if (consumeError||!consumed) return NextResponse.json({error:"Esta autorização já foi utilizada ou expirou."},{status:409});

  const response=await fetch("https://api.shutterstock.com/v2/oauth/access_token",{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded","User-Agent":"Aurohub"},
    body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,grant_type:"authorization_code",expires:"false",code}),
  });
  const token=await response.json() as TokenResponse;
  if (!response.ok||!token.access_token) return NextResponse.json({error:`Falha ao obter token da Shutterstock: ${token.message||token.error||`HTTP ${response.status}`}`},{status:502});

  const now=new Date().toISOString();
  const {error:saveError}=await admin.from("shutterstock_connections").upsert({
    id:"primary",status:"active",encrypted_access_token:encryptShutterstockToken(token.access_token,config.encryptionKey),
    scopes:config.scopes.split(/\s+/).filter(Boolean),connected_by:context.userId,updated_at:now,
  },{onConflict:"id"});
  if (saveError) return NextResponse.json({error:"A autorização foi concluída, mas o token não pôde ser armazenado."},{status:500});
  return NextResponse.redirect(new URL("/inicio?shutterstock=connected",request.nextUrl.origin));
}
