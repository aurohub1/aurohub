"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { checkInstagramToken, type InstagramStatus } from "@/lib/instagram-status";

interface InstagramStatusBadgeProps {
  storeId: string;
}

const STATUS_COLORS: Record<InstagramStatus, { bg: string; border: string }> = {
  valid: { bg: "bg-green-500", border: "border-green-600" },
  invalid: { bg: "bg-red-500", border: "border-red-600" },
  "network-error": { bg: "bg-amber-500", border: "border-amber-600" },
  "no-token": { bg: "bg-slate-300", border: "border-slate-400" }
};

const STATUS_LABELS: Record<InstagramStatus, string> = {
  valid: "Instagram conectado",
  invalid: "Token inválido ou expirado",
  "network-error": "Erro ao verificar conexão",
  "no-token": "Instagram não conectado"
};

export default function InstagramStatusBadge({ storeId }: InstagramStatusBadgeProps) {
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkInstagramToken(storeId, supabase).then(result => {
      setStatus(result.status);
      setMessage(result.message);
    });
  }, [storeId]);

  if (!status) {
    return (
      <div className="h-3 w-3 rounded-full bg-slate-200 animate-pulse" title="Verificando..." />
    );
  }

  const colors = STATUS_COLORS[status];

  return (
    <div
      className={`h-3 w-3 rounded-full border ${colors.bg} ${colors.border}`}
      title={`${STATUS_LABELS[status]} — ${message}`}
    />
  );
}
