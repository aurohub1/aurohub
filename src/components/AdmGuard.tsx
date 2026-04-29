"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdmContext } from "@/contexts/AdmContext";
import type { AdmPermissions } from "@/lib/adm-permissions";

/**
 * Client component guard — envolve conteúdo que exige permissão ADM específica.
 * Útil em server components que não podem chamar hooks diretamente (ex: vault/page.tsx).
 */
export function AdmGuard({
  perm,
  children,
}: {
  perm: keyof AdmPermissions;
  children: React.ReactNode;
}) {
  const { perms } = useAdmContext();
  const router = useRouter();
  const allowed = perms[perm];

  useEffect(() => {
    if (!allowed) router.replace("/inicio");
  }, [allowed, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
