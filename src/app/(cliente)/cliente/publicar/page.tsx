"use client";

import PublicarPageBase from "@/components/publish/PublicarPageBase";
import type { FullProfile } from "@/lib/auth";

export default function ClientePublicarPage() {
  return (
    <PublicarPageBase
      role="cliente"
      enablePublishing={true}
      getNomeLoja={(profile, selectedTargetIds, publishTargets) => {
        // 1 loja selecionada → passa store.name da loja selecionada
        // 2+ lojas selecionadas → passa undefined (legenda genérica)
        if (selectedTargetIds.length === 1) {
          const selectedStore = publishTargets.find(
            (t) => t.id === selectedTargetIds[0]
          );
          return selectedStore?.name;
        }
        return undefined;
      }}
    />
  );
}
