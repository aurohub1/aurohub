"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { Users, Plus, Pencil, Power, X, Check, RefreshCw, Copy, CalendarClock, Activity } from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

interface Vendor {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  status: string;
  licensee_id: string | null;
  store_id: string | null;
  created_at: string;
}

interface PlanFull {
  slug: string;
  name: string;
  max_users: number;
}

interface VendorForm {
  name: string;
  email: string;
  password: string;
  status: string;
}

/* ── Helpers ─────────────────────────────────────── */

const AVATAR_COLORS = [
  "var(--orange)", "#D4A843", "#3B82F6", "#22C55E",
  "#A78BFA", "#EC4899", "#06B6D4", "#F59E0B",
];

function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string | null, email: string | null): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function genPassword(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── Página ──────────────────────────────────────── */

export default function UnidadeVendedoresPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [postsByUser, setPostsByUser] = useState<Record<string, number>>({});
  const [planFull, setPlanFull] = useState<PlanFull | null>(null);
  const [totalUsersLicensee, setTotalUsersLicensee] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Vendor | null>(null);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.store_id || !p?.licensee_id) { setLoading(false); return; }

      // Vendedores da unidade
      const { data: vData } = await supabase
        .from("profiles")
        .select("id, name, email, role, status, licensee_id, store_id, created_at")
        .eq("store_id", p.store_id)
        .eq("role", "vendedor")
        .order("created_at", { ascending: false });
      const list = (vData ?? []) as Vendor[];
      setVendors(list);

      // Total de usuários do licensee (pra validar limite do plano)
      const { count: totalCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("licensee_id", p.licensee_id);
      setTotalUsersLicensee(totalCount ?? 0);

      // Posts de hoje por vendedor via activity_logs
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      const ids = list.map((v) => v.id);
      if (ids.length > 0) {
        const { data: logs } = await supabase
          .from("activity_logs")
          .select("user_id")
          .in("user_id", ids)
          .in("event_type", ["post_instagram", "post_scheduled"])
          .gte("created_at", inicioDia.toISOString());
        const map: Record<string, number> = {};
        for (const l of (logs ?? []) as { user_id: string | null }[]) {
          if (!l.user_id) continue;
          map[l.user_id] = (map[l.user_id] ?? 0) + 1;
        }
        setPostsByUser(map);
      } else {
        setPostsByUser({});
      }

      // Plan
      const slug = p.licensee?.plan_slug || p.licensee?.plan || p.plan?.slug;
      if (slug) {
        const { data: plan } = await supabase
          .from("plans")
          .select("slug, name, max_users")
          .eq("slug", slug)
          .single();
        if (plan) setPlanFull(plan as PlanFull);
      }
    } catch (err) {
      console.error("[UnidadeVendedores] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const ativos = useMemo(() => vendors.filter((v) => v.status === "active").length, [vendors]);
  const maxUsers = planFull?.max_users ?? null;
  const unlimited = maxUsers === -1 || maxUsers === null;
  const limitReached = !unlimited && maxUsers !== null && totalUsersLicensee >= maxUsers;

  async function toggleStatus(v: Vendor) {
    const next = v.status === "active" ? "inactive" : "active";
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: v.id, profile: { status: next } }),
    });
    if (!res.ok) { alert("Erro ao alterar status."); return; }
    await loadData();
  }

  /* ── Render ────────────────────────────────────── */

  if (loading) {
    return <div className="text-[13px] text-[var(--txt3)]">Carregando equipe...</div>;
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
              Central da Unidade · Equipe
            </p>
            <h1 className="mt-1.5 flex items-center gap-3 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              Minha Equipe
              <span className="rounded-full bg-[var(--green3)] px-3 py-1 text-[11px] font-bold text-[var(--green)] tabular-nums">
                {ativos} ativo{ativos === 1 ? "" : "s"}
              </span>
            </h1>
            <p className="mt-1 text-[12px] text-[var(--txt3)]">
              {profile?.store?.name || "Sua unidade"} · {vendors.length} vendedor{vendors.length === 1 ? "" : "es"} no total
              {!unlimited && ` · Plano: ${totalUsersLicensee} / ${maxUsers}`}
            </p>
          </div>

          <button
            onClick={() => !limitReached && setCreating(true)}
            disabled={limitReached}
            title={limitReached ? "Limite do plano atingido" : "Novo vendedor"}
            className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
          >
            <Plus size={15} /> Novo vendedor
          </button>
        </div>
      </div>

      {/* ═══ GRID ═══ */}
      {vendors.length === 0 ? (
        <div className="card-glass flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--orange)]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Users size={24} />
          </div>
          <div className="font-[family-name:var(--font-dm-serif)] text-[18px] font-bold text-[var(--txt)]">
            Nenhum vendedor cadastrado
          </div>
          <p className="max-w-[360px] text-[12px] text-[var(--txt3)]">
            Cadastre seu primeiro vendedor para começar a publicar pela unidade.
          </p>
          {!limitReached && (
            <button
              onClick={() => setCreating(true)}
              className="mt-2 flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
            >
              <Plus size={13} /> Novo vendedor
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {vendors.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              postsToday={postsByUser[v.id] ?? 0}
              onEdit={() => setEditing(v)}
              onToggle={() => toggleStatus(v)}
            />
          ))}
        </div>
      )}

      {/* ═══ MODAL CRIAR ═══ */}
      {creating && (
        <VendorFormModal
          title="Novo vendedor"
          showPassword
          initial={{
            name: "",
            email: "",
            password: genPassword(),
            status: "active",
          }}
          onClose={() => setCreating(false)}
          onSave={async (form) => {
            const res = await fetch("/api/admin/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: form.email.trim().toLowerCase(),
                password: form.password,
                profile: {
                  name: form.name.trim(),
                  role: "vendedor",
                  status: form.status,
                },
              }),
            });
            const data = await res.json();
            if (!res.ok) return data.error || "Erro ao criar";
            setCreating(false);
            await loadData();
            return null;
          }}
        />
      )}

      {/* ═══ MODAL EDITAR ═══ */}
      {editing && (
        <VendorFormModal
          title="Editar vendedor"
          showPassword={false}
          initial={{
            name: editing.name ?? "",
            email: editing.email ?? "",
            password: "",
            status: editing.status,
          }}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            const res = await fetch("/api/admin/users", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: editing.id,
                profile: {
                  name: form.name.trim(),
                  status: form.status,
                },
              }),
            });
            const data = await res.json();
            if (!res.ok) return data.error || "Erro ao salvar";
            setEditing(null);
            await loadData();
            return null;
          }}
        />
      )}
    </>
  );
}

/* ── Card ────────────────────────────────────────── */

function VendorCard({
  vendor,
  postsToday,
  onEdit,
  onToggle,
}: {
  vendor: Vendor;
  postsToday: number;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const active = vendor.status === "active";
  const avatarColor = colorForId(vendor.id);

  return (
    <div className="card-glass flex flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${avatarColor}, #1E3A6E)` }}
        >
          {initials(vendor.name, vendor.email)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-bold text-[var(--txt)]" title={vendor.name || ""}>
            {vendor.name || "Sem nome"}
          </h3>
          <p className="truncate text-[11px] text-[var(--txt3)]" title={vendor.email || ""}>
            {vendor.email || "—"}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase"
          style={
            active
              ? { background: "var(--green3)", color: "var(--green)" }
              : { background: "var(--red3)", color: "var(--red)" }
          }
        >
          {active ? "Ativo" : "Inativo"}
        </span>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] p-3">
        <div className="flex items-center justify-between text-[11px] text-[var(--txt3)]">
          <span className="flex items-center gap-1.5"><CalendarClock size={11} /> Cadastrado</span>
          <span className="font-semibold text-[var(--txt2)]">{formatDate(vendor.created_at)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--txt3)]">
          <span className="flex items-center gap-1.5"><Activity size={11} /> Posts hoje</span>
          <span className="font-bold text-[var(--txt)] tabular-nums">{postsToday}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2 text-[11px] font-semibold text-[var(--txt2)] transition-colors hover:border-[rgba(255,122,26,0.3)] hover:text-[var(--orange)]"
        >
          <Pencil size={12} /> Editar
        </button>
        <button
          onClick={onToggle}
          title={active ? "Desativar" : "Ativar"}
          className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-white transition-transform hover:scale-[1.02]"
          style={
            active
              ? { background: "linear-gradient(135deg, #EF4444, #B91C1C)" }
              : { background: "linear-gradient(135deg, #22C55E, #15803D)" }
          }
        >
          <Power size={12} /> {active ? "Desativar" : "Ativar"}
        </button>
      </div>
    </div>
  );
}

/* ── Modal ───────────────────────────────────────── */

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
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--bdr2)] text-[var(--txt3)] transition-colors hover:border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[#EF4444]"
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function VendorFormModal({
  title,
  initial,
  showPassword,
  onClose,
  onSave,
}: {
  title: string;
  initial: VendorForm;
  showPassword: boolean;
  onClose: () => void;
  onSave: (form: VendorForm) => Promise<string | null>;
}) {
  const [form, setForm] = useState<VendorForm>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const valid =
    form.name.trim().length > 0 &&
    (!showPassword || (emailValid && form.password.length >= 6));

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    const err = await onSave(form);
    if (err) setError(err);
    setSaving(false);
  };

  const copyPassword = async () => {
    try { await navigator.clipboard.writeText(form.password); } catch { /* noop */ }
  };

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <Field label="Nome *">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex.: Maria Oliveira"
            className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
          />
        </Field>

        <Field label={showPassword ? "Email *" : "Email"}>
          <input
            type="email"
            value={form.email}
            disabled={!showPassword}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="vendedor@dominio.com"
            className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none disabled:opacity-60"
          />
        </Field>

        {showPassword && (
          <Field label="Senha *">
            <div className="flex items-center gap-2">
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="h-9 flex-1 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 font-mono text-[12px] text-[var(--txt)] focus:border-[var(--orange)] focus:outline-none"
              />
              <button
                type="button"
                onClick={copyPassword}
                title="Copiar senha"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--bdr)] text-[var(--txt3)] transition-colors hover:border-[rgba(255,122,26,0.3)] hover:text-[var(--orange)]"
              >
                <Copy size={13} />
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, password: genPassword() })}
                title="Gerar nova senha"
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--bdr)] px-2.5 text-[11px] font-semibold text-[var(--txt2)] transition-colors hover:border-[rgba(255,122,26,0.3)] hover:text-[var(--orange)]"
              >
                <RefreshCw size={12} /> Gerar
              </button>
            </div>
          </Field>
        )}

        <Field label="Status">
          <div className="flex gap-2">
            <Pill
              active={form.status === "active"}
              label="Ativo"
              color="#22C55E"
              onClick={() => setForm({ ...form, status: "active" })}
            />
            <Pill
              active={form.status !== "active"}
              label="Inativo"
              color="#EF4444"
              onClick={() => setForm({ ...form, status: "inactive" })}
            />
          </div>
        </Field>

        {error && (
          <div className="rounded-lg border border-[var(--red)] bg-[var(--red3)] px-3 py-2 text-[11px] font-semibold text-[var(--red)]">
            {error}
          </div>
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

function Pill({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
      style={
        active
          ? { background: `${color}22`, color, borderColor: color }
          : { background: "transparent", color: "var(--txt3)", borderColor: "var(--bdr)" }
      }
    >
      {label}
    </button>
  );
}
