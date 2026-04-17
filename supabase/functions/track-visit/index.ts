import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const ua  = req.headers.get("user-agent") || "";
    const ref = req.headers.get("referer")    || "";
    const { page } = await req.json().catch(() => ({ page: "/vagas" }));

    const VPNAPI_KEY = Deno.env.get("VPNAPI_KEY")!;
    const vpnRes  = await fetch(`https://vpnapi.io/api/${ip}?key=${VPNAPI_KEY}`);
    const vpnData = await vpnRes.json();

    const isSuspect =
      vpnData?.security?.vpn   === true ||
      vpnData?.security?.proxy === true ||
      vpnData?.security?.tor   === true ||
      vpnData?.security?.relay === true;

    const location = vpnData?.location || {};
    const city    = location.city   || "—";
    const region  = location.region || "—";
    const country = location.country || "—";
    const isp     = vpnData?.network?.autonomous_system_organization || "—";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("job_visits").insert({
      ip, user_agent: ua, referer: ref, page,
      city, region, country, isp,
      is_vpn:     vpnData?.security?.vpn   || false,
      is_proxy:   vpnData?.security?.proxy || false,
      is_tor:     vpnData?.security?.tor   || false,
      is_suspect: isSuspect,
    });

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
    const emoji      = isSuspect ? "🚨" : "👤";
    const label      = isSuspect ? "SUSPEITO (VPN/Proxy/Tor)" : "Acesso normal";
    const bgColor    = isSuspect ? "#fff3cd" : "#f9f7f4";
    const badgeColor = isSuspect ? "#856404" : "#3d3830";
    const badgeBg    = isSuspect ? "#fff3cd" : "#eae7e2";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Aurovista <noreply@aurovista.com.br>",
        to:   ["contato@aurovista.com.br"],
        subject: `${emoji} Novo acesso em /vagas — ${city}, ${country}`,
        html: `
          <div style="font-family:'DM Sans',sans-serif;max-width:520px;margin:0 auto;background:#f9f7f4;border-radius:12px;overflow:hidden;border:1px solid #eae7e2;">
            <div style="background:#0f0d0b;padding:20px 28px;display:flex;align-items:center;gap:10px;">
              <div style="width:28px;height:28px;border-radius:7px;background:linear-gradient(145deg,#c85a1a,#b8892e);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;font-family:Georgia,serif;">A</div>
              <span style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#f9f7f4;">AUROVISTA</span>
            </div>
            <div style="padding:24px 28px;background:${bgColor};">
              <p style="font-size:13px;color:#8a8077;margin-bottom:6px;">Novo acesso em <strong style="color:#0f0d0b;">${page}</strong></p>
              <span style="display:inline-block;font-size:12px;font-weight:600;padding:4px 12px;border-radius:99px;background:${badgeBg};color:${badgeColor};margin-bottom:20px;">${label}</span>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:8px 0;color:#8a8077;border-bottom:1px solid #eae7e2;width:120px;">IP</td><td style="padding:8px 0;color:#0f0d0b;border-bottom:1px solid #eae7e2;font-weight:500;">${ip}</td></tr>
                <tr><td style="padding:8px 0;color:#8a8077;border-bottom:1px solid #eae7e2;">Cidade</td><td style="padding:8px 0;color:#0f0d0b;border-bottom:1px solid #eae7e2;">${city}, ${region}</td></tr>
                <tr><td style="padding:8px 0;color:#8a8077;border-bottom:1px solid #eae7e2;">País</td><td style="padding:8px 0;color:#0f0d0b;border-bottom:1px solid #eae7e2;">${country}</td></tr>
                <tr><td style="padding:8px 0;color:#8a8077;border-bottom:1px solid #eae7e2;">ISP</td><td style="padding:8px 0;color:#0f0d0b;border-bottom:1px solid #eae7e2;">${isp}</td></tr>
                <tr><td style="padding:8px 0;color:#8a8077;border-bottom:1px solid #eae7e2;">VPN</td><td style="padding:8px 0;color:#0f0d0b;border-bottom:1px solid #eae7e2;">${vpnData?.security?.vpn ? "Sim" : "Não"}</td></tr>
                <tr><td style="padding:8px 0;color:#8a8077;border-bottom:1px solid #eae7e2;">Proxy</td><td style="padding:8px 0;color:#0f0d0b;border-bottom:1px solid #eae7e2;">${vpnData?.security?.proxy ? "Sim" : "Não"}</td></tr>
                <tr><td style="padding:8px 0;color:#8a8077;border-bottom:1px solid #eae7e2;">Tor</td><td style="padding:8px 0;color:#0f0d0b;border-bottom:1px solid #eae7e2;">${vpnData?.security?.tor ? "Sim" : "Não"}</td></tr>
                <tr><td style="padding:8px 0;color:#8a8077;">Dispositivo</td><td style="padding:8px 0;color:#0f0d0b;font-size:12px;">${ua.slice(0,80)}</td></tr>
              </table>
            </div>
            <div style="padding:14px 28px;border-top:1px solid #eae7e2;font-size:11px;color:#8a8077;">
              ${new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} · Aurovista · Mirassol, SP
            </div>
          </div>
        `,
      }),
    });

    return new Response(
      JSON.stringify({ block: isSuspect }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ block: false }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
