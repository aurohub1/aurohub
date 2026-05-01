import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// PT-BR profanity list (normalized: lowercase, no accents)
const BLOCKED: string[] = [
  "porra","caralho","merda","foda","foder","fodase","fdp","filho da puta",
  "viado","viadao","veado","viadinho","bicha","bichinha","traveco",
  "puta","putinha","prostituta","vagabunda","vagabundo","vadia",
  "cuzao","cuzinho","cú","cu","buceta","bucetao","bucetinha",
  "pau","pica","piroca","cacete","rola","rolinha",
  "gozar","gozando","gozei","gozou",
  "arrombado","arrombada","corno","corna","cornudo",
  "imbecil","idiota","retardado","retardada","deficiente",
  "negao","neguinha","macaco","macaca",
  "nazista","nazismo","fascista","fascismo",
  "punheta","punheteiro","masturbacao","masturbar",
  "estupro","estuprar","estuprador",
  "desgraça","desgraca","desgraçado","desgraçada",
  "babaca","otario","otaria","cretino","cretina",
  "lixo","inutil","escroto","escrotice",
  "safado","safada","tarado","tarada",
  "maldito","maldita","maldição","maldicao",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

function containsProfanity(text: string): string | null {
  const normalized = normalize(text);
  const words = normalized.split(/\s+/);
  for (const blocked of BLOCKED) {
    const normalizedBlocked = normalize(blocked);
    if (normalizedBlocked.includes(" ")) {
      if (normalized.includes(normalizedBlocked)) return blocked;
    } else {
      if (words.some(w => w === normalizedBlocked)) return blocked;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { message, licensee_id } = await req.json() as { message?: string; licensee_id?: string };

    if (!message || !licensee_id) {
      return NextResponse.json({ allowed: true });
    }

    const { data: licensee } = await supabase
      .from("licensees")
      .select("chat_profanity_filter")
      .eq("id", licensee_id)
      .maybeSingle();

    const filterEnabled = licensee?.chat_profanity_filter ?? true;
    if (!filterEnabled) {
      return NextResponse.json({ allowed: true });
    }

    const found = containsProfanity(message);
    if (found) {
      return NextResponse.json({ allowed: false, reason: "Mensagem contém conteúdo inapropriado." });
    }

    return NextResponse.json({ allowed: true });
  } catch {
    return NextResponse.json({ allowed: true });
  }
}
