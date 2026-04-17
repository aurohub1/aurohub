"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function DeviceWarning({ onDismiss }: { onDismiss: () => void }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3 rounded-xl border border-[var(--orange3)] bg-[var(--bg1)] p-4 shadow-2xl">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[var(--orange)]" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-[var(--txt)]">Dispositivo não reconhecido</div>
          <p className="mt-1 text-[11px] text-[var(--txt3)]">
            Acesso de dispositivo não reconhecido. Se não foi você, troque sua senha imediatamente.
          </p>
        </div>
        <button
          onClick={() => { setVisible(false); onDismiss(); }}
          className="shrink-0 rounded-lg p-1 text-[var(--txt3)] hover:bg-[var(--hover-bg)]"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
