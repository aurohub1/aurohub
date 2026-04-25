"use client";

import PublicarPageBase from "@/components/publish/PublicarPageBase";
import type { FullProfile } from "@/lib/auth";

export default function ConsultorPublicarPage() {
  return (
    <PublicarPageBase
      role="consultor"
      enablePublishing={false}
      getNomeLoja={(profile) => {
        // Consultor não publica, mas pode receber o nome da loja para preview
        return profile?.store?.name;
      }}
    />
  );
}
