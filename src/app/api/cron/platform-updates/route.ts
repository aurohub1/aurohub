import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isManual = cronSecret && auth === `Bearer ${cronSecret}`;
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const githubToken = process.env.GITHUB_TOKEN;
  const commitsRes = await fetch(
    "https://api.github.com/repos/aurohub1/aurohub/commits?per_page=30",
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "aurohub-cron",
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
      },
    }
  );
  if (!commitsRes.ok) {
    const detail = await commitsRes.text();
    return NextResponse.json({ error: "Falha ao buscar commits", detail }, { status: 500 });
  }

  const commits = (await commitsRes.json()) as Array<{ sha: string; commit: { message: string } }>;
  const featCommits = commits.filter(c => /^feat(\(.+\))?:/i.test(c.commit.message.trim()));

  if (featCommits.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, reason: "no feat: commits" });
  }

  const shas = featCommits.map(c => c.sha);
  const { data: existing } = await sb
    .from("platform_updates")
    .select("commit_sha")
    .in("commit_sha", shas);
  const existingShas = new Set((existing ?? []).map((r: { commit_sha: string }) => r.commit_sha));
  const newCommits = featCommits.filter(c => !existingShas.has(c.sha));

  if (newCommits.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, reason: "all commits already processed" });
  }

  const anthropic = new Anthropic();
  let inserted = 0;

  for (const commit of newCommits) {
    try {
      const rawMsg = commit.commit.message.split("\n")[0].replace(/^feat(\(.+\))?:\s*/i, "").trim();
      const aiRes = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Transforme este commit técnico em uma novidade amigável para usuários de uma plataforma de marketing para agências de viagem. Responda APENAS em JSON válido: {"title":"Título em português (máx 60 chars)","description":"Descrição simples e amigável em até 2 frases para o usuário final"}. Commit: "${rawMsg}"`,
        }],
      });

      const text = aiRes.content[0].type === "text" ? aiRes.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]) as { title?: string; description?: string };
      if (!parsed.title || !parsed.description) continue;

      await sb.from("platform_updates").insert({
        title: parsed.title.slice(0, 80),
        description: parsed.description.slice(0, 300),
        commit_sha: commit.sha,
      });
      inserted++;
    } catch { /* silently skip failed commit */ }
  }

  return NextResponse.json({ ok: true, inserted });
}
