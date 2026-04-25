"use client";

import PublicarPageBase from "@/components/publish/PublicarPageBase";
import type { FullProfile } from "@/lib/auth";

export default function ConsultorPublicarPage() {
  return (
    <PublicarPageBase
      role="consultor"
      enablePublishing={true}
      getNomeLoja={() => undefined}
    />
  );
}
