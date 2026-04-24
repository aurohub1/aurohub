"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { InactiveStore } from "@/lib/inactivity-check";

interface InactivityAlertProps {
  stores: InactiveStore[];
}

export default function InactivityAlert({ stores }: InactivityAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (stores.length === 0 || dismissed) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
        <div className="flex-1 text-[13px]">
          <div className="font-medium text-amber-900 dark:text-amber-100">
            {stores.length === 1 ? "Loja inativa" : `${stores.length} lojas inativas`}
          </div>
          <div className="mt-1 space-y-1 text-amber-800 dark:text-amber-200">
            {stores.map((store) => (
              <div key={store.storeId}>
                <strong>{store.storeName}</strong> está há{" "}
                <strong>{store.daysSinceLastPost} dias</strong> sem publicar
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-amber-600 hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-300"
          title="Dispensar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
