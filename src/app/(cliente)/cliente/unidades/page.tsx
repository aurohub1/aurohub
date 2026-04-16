"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { Store, Plus, Pencil, Users, MapPin, AtSign, X, Check } from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

interface StoreRow {
  id: string;
  licensee_id: string;
  name: string;
  city: string | null;
  ig_user_id: string | null;
  active: boolean | null;
}

interface VendorRow {
  id: string;
  name: string | null;
  email: string | null;
  store_id: string | null;
}

interface StoreForm {
  name: string;
  city: string;
  instagram: string;
  active: boolean;
}

/* ── Helpers ─────────────────────────────────────── */

function normalizeHandle(v: string): string {
  return v.trim().replace(/^@/, "");
}

const EMPTY_FORM: StoreForm = { name: "", city: "", instagram: "", active: true };

/* ── Página ──────────────────────────────────────── */

export default function ClienteUnidadesPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewVendorsFor, setViewVendorsFor] = useState<StoreRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.licensee_id) { setLoading(false); return; }

      const [sR, vR] = await Promise.all([
        supabase
          .from("stores")
          .select("id, licensee_id, name, city, ig_user_id, active")
          .eq("licensee_id", p.licensee_id)
          .order("name"),
        supabase
          .from("profiles")
          .select("id, name, email, store_id")
          .eq("licensee_id", p.licensee_id)
          .eq("role", "vendedor"),
      ]);

      setStores((sR.data ?? []) as StoreRow[]);
      setVendors((vR.data ?? []) as VendorRow[]);
    } catch (err) {
      console.error("[ClienteUnidades] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const vendorCountByStore = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of vendors) {
      if (!v.store_id) continue;
      map[v.store_id] = (map[v.store_id] ?? 0) + 1;
    }
    return map;
  }, [vendors]);

  const ativas = stores.filter((s) => s.active !== false).length;

  /* ── Render ────────────────────────────────────── */

  if (loading) {
    return <div className="text-[13px] text-[var(--txt3)]">Carregando unidades...</div>;
  }

  return (
    <>
      {/* ═══ HEADER ═══ */}
      <div className="card-glass relative overflow-hidden px-7 py-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: "linear-gradient(135deg, #1E3A6E 0%, var(--orange) 50%, #D4A843 100%)" }}
        />
        <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">
              Central do Cliente · Rede
            </p>
            <h1 className="mt-1.5 flex items-center gap-3 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              Minhas Unidades
              <span className="rounded-full bg-[var(--green3)] px-3 py-1 text-[11px] font-bold text-[var(--green)] tabular-nums">
                {ativas} ativa{ativas === 1 ? "" : "s"}
              </span>
            </h1>
            <p className="mt-1 text-[12px] text-[var(--txt3)]">
              {profile?.licensee?.name || "Sua marca"} · {stores.length} unidade{stores.length === 1 ? "" : "s"} no total
            </p>
          </div>

          <button
            onClick={() => setCreating(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
          >
            <Plus size={15} /> Nova unidade
          </button>
        </div>
      </div>

      {/* ═══ GRID ═══ */}
      {stores.length === 0 ? (
        <div className="card-glass flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--orange)]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Store size={24} />
          </div>
          <div className="font-[family-name:var(--font-dm-serif)] text-[18px] font-bold text-[var(--txt)]">
            Nenhuma unidade cadastrada
          </div>
          <p className="max-w-[360px] text-[12px] text-[var(--txt3)]">
            Cadastre sua primeira unidade para começar a gerenciar consultores e publicações.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="mt-2 flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
          >
            <Plus size={13} /> Nova unidade
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stores.map((s) => (
            <StoreCard
              key={s.id}
              store={s}
              vendorCount={vendorCountByStore[s.id] ?? 0}
              onEdit={() => setEditing(s)}
              onViewVendors={() => setViewVendorsFor(s)}
            />
          ))}
        </div>
      )}

      {/* ═══ MODAL CRIAR ═══ */}
      {creating && (
        <StoreFormModal
          title="Nova unidade"
          initial={EMPTY_FORM}
          showStatus={false}
          onClose={() => setCreating(false)}
          onSave={async (form) => {
            if (!profile?.licensee_id) return;
            const payload = {
              licensee_id: profile.licensee_id,
              name: form.name.trim(),
              city: form.city.trim() || null,
              ig_user_id: normalizeHandle(form.instagram) || null,
              active: true,
            };
            const { error } = await supabase.from("stores").insert(payload);
            if (error) { alert("Erro ao criar unidade: " + error.message); return; }
            setCreating(false);
            await loadData();
          }}
        />
      )}

      {/* ═══ MODAL EDITAR ═══ */}
      {editing && (
        <StoreFormModal
          title="Editar unidade"
          initial={{
            name: editing.name,
            city: editing.city ?? "",
            instagram: editing.ig_user_id ?? "",
            active: editing.active !== false,
          }}
          showStatus
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            if (!profile?.licensee_id) return;
            const { error } = await supabase
              .from("stores")
              .update({
                name: form.name.trim(),
                city: form.city.trim() || null,
                ig_user_id: normalizeHandle(form.instagram) || null,
                active: form.active,
              })
              .eq("id", editing.id)
              .eq("licensee_id", profile.licensee_id);
            if (error) { alert("Erro ao salvar: " + error.message); return; }
            setEditing(null);
            await loadData();
          }}
        />
      )}

      {/* ═══ MODAL VENDEDORES ═══ */}
      {viewVendorsFor && (
        <VendorsModal
          store={viewVendorsFor}
          vendors={vendors.filter((v) => v.store_id === viewVendorsFor.id)}
          onClose={() => setViewVendorsFor(null)}
        />
      )}
    </>
  );
}

/* ── Card ────────────────────────────────────────── */

function StoreCard({
  store,
  vendorCount,
  onEdit,
  onViewVendors,
}: {
  store: StoreRow;
  vendorCount: number;
  onEdit: () => void;
  onViewVendors: () => void;
}) {
  const ativo = store.active !== false;
  return (
    <div className="card-glass flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Store size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-bold text-[var(--txt)]" title={store.name}>
              {store.name}
            </h3>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--txt3)]">
              <MapPin size={11} />
              <span className="truncate">{store.city || "—"}</span>
            </div>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase"
          style={
            ativo
              ? { background: "var(--green3)", color: "var(--green)" }
              : { background: "var(--red3)", color: "var(--red)" }
          }
        >
          {ativo ? "Ativa" : "Inativa"}
        </span>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] p-3">
        <div className="flex items-center justify-between text-[11px] text-[var(--txt3)]">
          <span className="flex items-center gap-1.5"><Users size={12} /> Consultores</span>
          <span className="font-bold text-[var(--txt)] tabular-nums">{vendorCount}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--txt3)]">
          <span className="flex items-center gap-1.5"><AtSign size={12} /> Instagram</span>
          <span className="truncate font-medium text-[var(--txt2)]">
            {store.ig_user_id ? `@${store.ig_user_id}` : "—"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onViewVendors}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2 text-[11px] font-semibold text-[var(--txt2)] transition-colors hover:border-[rgba(255,122,26,0.3)] hover:text-[var(--orange)]"
        >
          <Users size={12} /> Ver consultores
        </button>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-white transition-transform hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
        >
          <Pencil size={12} /> Editar
        </button>
      </div>
    </div>
  );
}

/* ── Modal base ──────────────────────────────────── */

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card-glass w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
          <h3 className="font-[family-name:var(--font-dm-serif)] text-[18px] font-bold text-[var(--txt)]">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--bdr2)] text-[var(--txt3)] transition-colors hover:border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[var(--red)]"
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Form modal (criar / editar) ─────────────────── */

function StoreFormModal({
  title,
  initial,
  showStatus,
  onClose,
  onSave,
}: {
  title: string;
  initial: StoreForm;
  showStatus: boolean;
  onClose: () => void;
  onSave: (form: StoreForm) => Promise<void>;
}) {
  const [form, setForm] = useState<StoreForm>(initial);
  const [saving, setSaving] = useState(false);

  const valid = form.name.trim().length > 0;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <Field label="Nome da unidade *">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex.: Loja Centro"
            className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
          />
        </Field>

        <Field label="Cidade">
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Ex.: São Paulo"
            className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
          />
        </Field>

        <Field label="Instagram">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 focus-within:border-[var(--orange)]">
            <span className="text-[12px] text-[var(--txt3)]">@</span>
            <input
              value={form.instagram.replace(/^@/, "")}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              placeholder="handle"
              className="h-9 flex-1 bg-transparent text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:outline-none"
            />
          </div>
        </Field>

        {showStatus && (
          <Field label="Status">
            <div className="flex gap-2">
              <StatusToggle
                active={form.active}
                value
                label="Ativa"
                color="var(--green)"
                bg="var(--green3)"
                onClick={() => setForm({ ...form, active: true })}
              />
              <StatusToggle
                active={!form.active}
                value={false}
                label="Inativa"
                color="var(--red)"
                bg="var(--red3)"
                onClick={() => setForm({ ...form, active: false })}
              />
            </div>
          </Field>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--bdr)] px-5 py-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-[var(--bdr)] px-4 py-2 text-[12px] font-semibold text-[var(--txt2)] transition-colors hover:bg-[var(--hover-bg)]"
        >
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={!valid || saving}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
        >
          <Check size={13} /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusToggle({
  active,
  label,
  color,
  bg,
  onClick,
}: {
  active: boolean;
  value: boolean;
  label: string;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
      style={
        active
          ? { background: bg, color, borderColor: color }
          : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
      }
    >
      {label}
    </button>
  );
}

/* ── Vendedores modal ────────────────────────────── */

function VendorsModal({
  store,
  vendors,
  onClose,
}: {
  store: StoreRow;
  vendors: VendorRow[];
  onClose: () => void;
}) {
  return (
    <ModalShell title={`Consultores · ${store.name}`} onClose={onClose}>
      <div className="flex flex-col gap-2 p-5 max-h-[60vh] overflow-y-auto">
        {vendors.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-[var(--txt3)]">
            Nenhum consultor vinculado a esta unidade.
          </div>
        ) : (
          vendors.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1E3A6E] to-[#3B82F6] text-[12px] font-bold text-white">
                {(v.name || v.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold text-[var(--txt)]">
                  {v.name || "Sem nome"}
                </div>
                <div className="truncate text-[10px] text-[var(--txt3)]">{v.email || "—"}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </ModalShell>
  );
}
