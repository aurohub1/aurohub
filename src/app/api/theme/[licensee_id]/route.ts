import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ licensee_id: string }> }) {
  const { licensee_id } = await params;

  const { data } = await supabase
    .from("licensees")
    .select("cor_primaria,cor_secundaria,tema_fundo_escuro,tema_fundo_claro,tema_texto_escuro,tema_texto_claro")
    .eq("id", licensee_id)
    .single();

  if (!data?.cor_primaria) {
    return new Response("/* no theme */", {
      headers: { "Content-Type": "text/css", "Cache-Control": "public, max-age=300" },
    });
  }

  const accent = data.cor_primaria;
  const accent2 = data.cor_secundaria || accent;
  const bgDark = data.tema_fundo_escuro || "#060B16";
  const bgLight = data.tema_fundo_claro || "#F8FAFC";
  const txtDark = data.tema_texto_escuro || "#EEF2FF";
  const txtLight = data.tema_texto_claro || "#0F172A";

  const css = `
html[data-theme="dark"] {
  --orange: ${accent};
  --orange2: ${accent2};
  --orange3: ${accent}1f;
  --bg: ${bgDark};
  --bg1: ${lighten(bgDark, 8)};
  --bg2: ${lighten(bgDark, 16)};
  --bg3: ${lighten(bgDark, 30)};
  --txt: ${txtDark};
  --txt2: ${lighten(txtDark, -30)};
  --txt3: ${lighten(txtDark, -60)};
  --bdr: ${accent}26;
  --bdr2: ${accent}40;
  --card-bg: ${bgDark}b8;
  --sidebar-bg: ${bgDark}eb;
  --topbar-bg: ${bgDark}e6;
}
html[data-theme="light"] {
  --orange: ${accent};
  --orange2: ${accent2};
  --orange3: ${accent}1f;
  --bg: ${bgLight};
  --bg1: ${lighten(bgLight, -4)};
  --bg2: ${lighten(bgLight, -8)};
  --bg3: ${lighten(bgLight, -16)};
  --txt: ${txtLight};
  --txt2: ${lighten(txtLight, 30)};
  --txt3: ${lighten(txtLight, 60)};
  --bdr: ${accent}26;
  --bdr2: ${accent}40;
  --card-bg: ${bgLight}e8;
  --sidebar-bg: ${lighten(bgLight, -4)}eb;
  --topbar-bg: ${lighten(bgLight, -4)}e6;
}`;

  return new Response(css, {
    headers: { "Content-Type": "text/css", "Cache-Control": "public, max-age=300" },
  });
}
