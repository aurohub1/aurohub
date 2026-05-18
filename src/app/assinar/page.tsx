import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import AssinarClient from "./AssinarClient";

export default async function AssinarPage() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await sb
    .from("system_config")
    .select("value")
    .eq("key", "assinar_ativo")
    .maybeSingle();

  // Desativado explicitamente — redireciona para login
  if (data?.value === "false") {
    redirect("/login");
  }

  return <AssinarClient />;
}
