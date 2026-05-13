"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const localToken = localStorage.getItem("ah_session_token");
      if (!localToken) return; // Sessões antigas (antes da feature) não são expulsas

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Middleware já trata não-autenticados

      const { data } = await supabase
        .from("active_sessions")
        .select("session_token")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && data.session_token !== localToken) {
        localStorage.removeItem("ah_session_token");
        await supabase.auth.signOut();
        router.replace("/login?reason=session_expired");
      }
    }

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
