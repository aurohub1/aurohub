import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ContratosPageContent from "./ContratosPageContent";

export default async function Page() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "adm") redirect("/login");
  return <ContratosPageContent />;
}
