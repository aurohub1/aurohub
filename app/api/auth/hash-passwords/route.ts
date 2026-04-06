export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { secret } = await request.json();

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const sb = createServerSupabase();
    const { data: users, error } = await sb
      .from("usuarios")
      .select("id, senha_hash");

    if (error || !users) {
      return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 });
    }

    let migrated = 0;

    for (const user of users) {
      // Skip if already hashed (bcrypt hashes start with $2)
      if (user.senha_hash.startsWith("$2")) continue;

      const hash = await bcrypt.hash(user.senha_hash, 12);
      const { error: updateError } = await sb
        .from("usuarios")
        .update({ senha_hash: hash })
        .eq("id", user.id);

      if (!updateError) migrated++;
    }

    return NextResponse.json({ ok: true, migrated });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
