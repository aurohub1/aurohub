"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import CardsCanvas from "@/components/publish/CardsCanvas";

export default function CardsPage() {
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await sb
        .from("profiles")
        .select("store_id")
        .eq("id", data.user.id)
        .single();
      if (p?.store_id) {
        const { data: s } = await sb
          .from("stores")
          .select("logo_url")
          .eq("id", p.store_id)
          .single();
        if (s?.logo_url) setLogoUrl(s.logo_url);
      }
    });
  }, []);

  return <CardsCanvas lojaLogoUrl={logoUrl} />;
}
