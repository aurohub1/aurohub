"use client";

import PublicarPageBase from "@/components/publish/PublicarPageBase";
import type { FullProfile } from "@/lib/auth";

export default function ConsultorPublicarPage() {
  return (
    <PublicarPageBase
      role="consultor"
      enablePublishing={true}
      getNomeLoja={(profile) => {
        // Consultor pode publicar para sua própria loja
        return profile?.store?.name;
      }}
    />
  );
}
