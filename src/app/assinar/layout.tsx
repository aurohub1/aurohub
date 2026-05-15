import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function AssinarLayout({ children }: { children: React.ReactNode }) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await admin
    .from("system_config")
    .select("value")
    .eq("key", "assinar_enabled")
    .maybeSingle();

  if (data?.value === "false") {
    redirect("/login?reason=assinar_disabled");
  }

  return <>{children}</>;
}
