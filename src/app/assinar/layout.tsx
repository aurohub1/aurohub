import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Inter, Cormorant_Garamond } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-cormorant",
});

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

  return (
    <div className={`${inter.className} ${cormorant.variable}`} style={{ background: "linear-gradient(145deg,#EEEEF2 0%,#F5F4F0 40%,#EEEFF4 100%)", color: "#0A0F1E", minHeight: "100vh", width: "100%" }}>
      {children}
    </div>
  );
}
