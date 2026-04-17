"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Verifica se a sessão atual é a sessão ativa do usuário.
 * Se outro dispositivo fez login, retorna sessionExpired=true.
 */
export function useSessionGuard(userId: string | null | undefined) {
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const checkSession = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const currentSessionId = session?.session?.access_token?.slice(-16); // últimos 16 chars como ID
        if (!currentSessionId) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("active_session_id")
          .eq("id", userId)
          .single();

        if (profile?.active_session_id && profile.active_session_id !== currentSessionId) {
          setSessionExpired(true);
        }
      } catch { /* silent */ }
    };

    checkSession();
    // Re-check a cada 60s
    const interval = setInterval(checkSession, 60_000);
    return () => clearInterval(interval);
  }, [userId]);

  return { sessionExpired };
}
