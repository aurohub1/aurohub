"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";
import {
  ADM_FULL_PERMISSIONS,
  ADM_PERMISSIONS_SELECT,
  rowToAdmPermissions,
  type AdmPermissions,
} from "@/lib/adm-permissions";

/**
 * Hook standalone — busca permissões ADM sem depender do AdmContext.
 * Use quando o componente está fora do (dashboard) layout.
 * Dentro do layout, prefira useAdmContext() que já tem os dados resolvidos.
 */
export function useAdmPermissions() {
  const [perms, setPerms] = useState<AdmPermissions>(ADM_FULL_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile(supabase);
        if (!p || p.role !== "adm" || !p.adm_level || p.adm_level === "super") {
          setPerms(ADM_FULL_PERMISSIONS);
          setLoading(false);
          return;
        }
        const { data } = await supabase
          .from("adm_permissions")
          .select(ADM_PERMISSIONS_SELECT)
          .eq("user_id", p.id)
          .maybeSingle();
        if (data) setPerms(rowToAdmPermissions(data as Record<string, unknown>));
      } catch { /* silent — defaults to full permissions */ }
      setLoading(false);
    })();
  }, []);

  return { perms, loading };
}
