"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmGuard } from "@/contexts/AdmContext";

interface DeletedTemplate {
  id: string;
  name: string;
  form_type: string | null;
  format: string | null;
  config_key: string | null;
  deleted_at: string;
  licensee_id: string | null;
  thumbnail_url: string | null;
}

function daysLeft(deletedAt: string): number {
  const ms = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default function LixeiraPage() {
  const { allowed } = useAdmGuard("can_use_editor");
  const [items, setItems] = useState<DeletedTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("form_templates")
      .select("id, name, form_type, format, config_key, deleted_at, licensee_id, thumbnail_url")
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false });
    setItems((data as DeletedTemplate[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const restore = async (id: string) => {
    const item = items.find(t => t.id === id);
    const { error } = await supabase
      .from("form_templates")
      .update({ deleted_at: null, active: true })
      .eq("id", id);
    if (error) { alert("Erro ao restaurar: " + error.message); return; }
    if (item?.config_key) {
      const { data: row } = await supabase.from("system_config").select("value").eq("key", item.config_key).single();
      if (row?.value) {
        const parsed = JSON.parse(row.value);
        delete parsed.deleted;
        await supabase.from("system_config").upsert(
          { key: item.config_key, value: JSON.stringify(parsed), updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      }
    }
    setItems(prev => prev.filter(t => t.id !== id));
  };

  const permanentDelete = async (item: DeletedTemplate) => {
    if (!confirm(`Excluir permanentemente "${item.name}"?\n\nEsta ação não pode ser desfeita.`)) return;
    if (item.config_key) {
      await supabase.from("system_config").delete().eq("key", item.config_key);
      await supabase.from("template_access").delete().eq("template_key", item.config_key);
    }
    const { error } = await supabase.from("form_templates").delete().eq("id", item.id);
    if (error) { alert("Erro ao excluir: " + error.message); return; }
    setItems(prev => prev.filter(t => t.id !== item.id));
  };

  if (!allowed) return null;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--txt)", margin: 0 }}>Lixeira de Templates</h1>
        <p style={{ fontSize: 13, color: "var(--txt3)", marginTop: 4 }}>
          Templates excluídos são removidos permanentemente após 30 dias.
        </p>
      </div>

      {loading && <p style={{ fontSize: 13, color: "var(--txt3)" }}>Carregando...</p>}

      {!loading && items.length === 0 && (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--txt3)", fontSize: 13 }}>
          Lixeira vazia.
        </div>
      )}

      {!loading && items.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--bdr)", color: "var(--txt3)", textAlign: "left" }}>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Template</th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Tipo</th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Excluído em</th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Expira em</th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }} />
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const days = daysLeft(item.deleted_at);
              const deletedDate = new Date(item.deleted_at).toLocaleDateString("pt-BR");
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--bdr)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--txt)" }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {item.config_key && (
                      <div style={{ fontSize: 11, color: "var(--txt3)", marginTop: 2 }}>{item.config_key}</div>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--txt2)" }}>
                    {item.form_type || "—"} / {item.format || "—"}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--txt2)" }}>{deletedDate}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                      background: days <= 3 ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.12)",
                      color: days <= 3 ? "#ef4444" : "#ca8a04",
                    }}>
                      {days}d
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => restore(item.id)}
                      style={{ marginRight: 8, padding: "4px 12px", borderRadius: 6, border: "1px solid var(--bdr)", background: "var(--bg1)", color: "var(--txt)", fontSize: 12, cursor: "pointer" }}
                    >
                      Restaurar
                    </button>
                    <button
                      onClick={() => permanentDelete(item)}
                      style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 12, cursor: "pointer" }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
