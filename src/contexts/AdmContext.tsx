"use client";

import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AdmPermissions } from "@/lib/adm-permissions";
import { ADM_FULL_PERMISSIONS } from "@/lib/adm-permissions";

export type AdmLevel = "super" | "operacional" | "suporte" | null;

interface AdmContextValue {
  admLevel: AdmLevel;
  perms: AdmPermissions;
}

export const AdmContext = createContext<AdmContextValue>({
  admLevel: null,
  perms: ADM_FULL_PERMISSIONS,
});

export function useAdmContext() {
  return useContext(AdmContext);
}

/** Redireciona para /inicio se a permissão for false. Deve ser chamado no topo do componente. */
export function useAdmGuard(perm: keyof AdmPermissions) {
  const { perms } = useAdmContext();
  const router = useRouter();
  const allowed = perms[perm];

  useEffect(() => {
    if (!allowed) router.replace("/inicio");
  }, [allowed, router]);

  return { allowed };
}
