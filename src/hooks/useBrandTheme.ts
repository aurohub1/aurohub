"use client";

import { useEffect } from "react";

/**
 * Hook que injeta o tema da marca via <link> CSS.
 * Apenas lê o licensee_id e carrega /api/theme/{id} — não toca em auth.
 * Fallbacks definidos em globals.css: --brand-primary: #1E3A6E, --brand-secondary: #3B82F6.
 */
export function useBrandTheme(licenseeId: string | null | undefined) {
  useEffect(() => {
    if (!licenseeId) return;

    let link = document.getElementById("brand-theme-css") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "brand-theme-css";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `/api/theme/${licenseeId}`;
  }, [licenseeId]);
}
