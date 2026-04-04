import { cookies } from "next/headers";
import { createServerSupabase } from "./supabase";
import type { Usuario } from "@/types";

export async function getSession(): Promise<Usuario | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return null;

  const sb = createServerSupabase();
  const { data } = await sb
    .from("usuarios")
    .select("*")
    .eq("id", token)
    .single();

  return data as Usuario | null;
}

export async function requireAuth(): Promise<Usuario> {
  const user = await getSession();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return user!;
}

export async function requireAdmin(): Promise<Usuario> {
  const user = await requireAuth();
  if (user.tipo !== "adm") {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  return user!;
}
