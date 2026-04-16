"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { Users, Plus, Pencil, Power, X, Check, RefreshCw, Copy } from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  status: string;
  licensee_id: string | null;
  store_id: string | null;
  created_at: string;
}

interface StoreRow {
  id: string;
  name: string;
}

interface PlanFull {
  slug: string;
  name: string;
  max_users: number;
}

type ClienteRole = "unidade" | "vendedor";

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: ClienteRole;
  store_id: string;
  status: string;
}

/* ── Helpers ─────────────────────────────────────── */

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  adm:      { label: "ADM",      color: "#D4A843", bg: "rgba(212,168,67,0.15)" },
  cliente:  { label: "Cliente",  color: "#3B82F6", bg: "rgba(59,130,246,0.15)" },
  unidade:  { label: "Unidade",  color: "#22C55E", bg: "rgba(34,197,94,0.15)" },
  vendedor: { label: "Consultor", color: "#A78BFA", bg: "rgba(167,139,250,0.15)" },
};

function roleMeta(r: string) {
  return ROLE_META[r] ?? { label: r, color: "#6B7280", bg: "rgba(107,114,128,0.15)" };
}

function genPassword(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ── Página ──────────────────────────────────────── */

export default function ClienteUsuariosPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [planFull, setPlanFull] = useState<PlanFull | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.licensee_id) { setLoading(false); return; }

      const [uR, sR] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, email, role, status, licensee_id, store_id, created_at")
          .eq("licensee_id", p.licensee_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("stores")
          .select("id, name")
          .eq("licensee_id", p.licensee_id)
          .order("name"),
      ]);

      setUsers((uR.data ?? []) as Profile[]);
      setStores((sR.data ?? []) as StoreRow[]);

      // Plan completo para pegar max_users
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
      console.error("[ClienteUsuarios] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const storeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of stores) map[s.id] = s.name;
    return map;
  }, [stores]);

  // Plano resolvido — aceita slug do planFull (carregado do DB), do licensee ou do profile
  const planSlug = (planFull?.slug || profile?.licensee?.plan_slug || profile?.licensee?.plan || profile?.plan?.slug || "").toLowerCase();
  const isEnterprise = planSlug === "enterprise";
  const maxUsers = planFull?.max_users ?? null;
  // Enterprise = ilimitado por regra de negócio; também trata -1/0/null como ilimitado (0 = coluna não configurada)
  const unlimited = isEnterprise || maxUsers === -1 || maxUsers === null || maxUsers === 0;
  const limitReached = !unlimited && maxUsers !== null && users.length >= maxUsers;

  /* ── Ações ─────────────────────────────────────── */

  async function toggleStatus(u: Profile) {
    const next = u.status === "active" ? "inactive" : "active";
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, profile: { status: next } }),
    });
    if (!res.ok) { alert("Erro ao alterar status."); return; }
    await loadData();
  }

  /* ── Render ────────────────────────────────────── */

  if (loading) {
    return <div className="text-[13px] text-[var(--txt3)]">Carregando usuários...</div>;
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
              Central do Cliente · Equipe
            </p>
            <h1 className="mt-1.5 flex items-center gap-3 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              Meus Usuários
              <span className="rounded-full bg-[var(--bg2)] px-3 py-1 text-[12px] font-semibold text-[var(--txt2)] tabular-nums">
                {users.length}{unlimited ? "" : ` / ${maxUsers}`}
              </span>
            </h1>
            <p className="mt-1 text-[12px] text-[var(--txt3)]">
              {profile?.licensee?.name || "Sua marca"} · Plano {planFull?.name || profile?.plan?.name || "—"}
              {unlimited && " · Usuários ilimitados"}
            </p>
          </div>

          <div className={`group relative ${limitReached ? "cursor-not-allowed" : ""}`} title={limitReached ? "Limite de usuários do plano atingido" : undefined}>
            <button
              onClick={() => !limitReached && setCreating(true)}
              disabled={limitReached}
              className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
            >
              <Plus size={15} /> Novo usuário
            </button>
            {limitReached && (
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Limite de usuários do plano atingido
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TABELA ═══ */}
      {users.length === 0 ? (
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
            Nenhum usuário cadastrado
          </div>
          <p className="max-w-[360px] text-[12px] text-[var(--txt3)]">
            Crie usuários para sua equipe acessar o sistema.
          </p>
        </div>
      ) : (
        <div className="card-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--bdr)] text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Unidade</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Criado em</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const meta = roleMeta(u.role);
                  const active = u.status === "active";
                  const isReadOnly = u.role === "adm" || u.role === "cliente";
                  return (
                    <tr key={u.id} className="border-b border-[var(--bdr)] last:border-b-0 hover:bg-[var(--hover-bg)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1E3A6E] to-[#3B82F6] text-[11px] font-bold text-white">
                            {(u.name || u.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate font-semibold text-[var(--txt)]">{u.name || "Sem nome"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--txt2)]">{u.email || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--txt2)]">
                        {u.store_id ? storeMap[u.store_id] || "—" : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                          style={
                            active
                              ? { background: "var(--green3)", color: "var(--green)" }
                              : { background: "var(--red3)", color: "var(--red)" }
                          }
                        >
                          {active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--txt3)]">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => !isReadOnly && setEditing(u)}
                            disabled={isReadOnly}
                            title={isReadOnly ? "Sem permissão" : "Editar"}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--bdr2)] text-[var(--txt3)] transition-colors hover:border-[rgba(255,122,26,0.3)] hover:bg-[rgba(255,122,26,0.12)] hover:text-[var(--orange)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => !isReadOnly && toggleStatus(u)}
                            disabled={isReadOnly}
                            title={isReadOnly ? "Sem permissão" : active ? "Desativar" : "Ativar"}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--bdr2)] text-[var(--txt3)] transition-colors hover:border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[var(--red)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Power size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ MODAL CRIAR ═══ */}
      {creating && profile?.licensee_id && (
        <UserFormModal
          title="Novo usuário"
          stores={stores}
          showPassword
          initial={{
            name: "",
            email: "",
            password: genPassword(),
            role: "vendedor",
            store_id: "",
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
                  role: form.role,
                  status: form.status,
                  store_id: form.store_id || null,
                },
              }),
            });
            const data = await res.json();
            if (!res.ok) { return data.error || "Erro ao criar"; }
            setCreating(false);
            await loadData();
            return null;
          }}
        />
      )}

      {/* ═══ MODAL EDITAR ═══ */}
      {editing && (
        <UserFormModal
          title="Editar usuário"
          stores={stores}
          showPassword={false}
          initial={{
            name: editing.name ?? "",
            email: editing.email ?? "",
            password: "",
            role: (editing.role === "unidade" || editing.role === "vendedor" ? editing.role : "vendedor") as ClienteRole,
            store_id: editing.store_id ?? "",
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
                  role: form.role,
                  status: form.status,
                  store_id: form.store_id || null,
                },
              }),
            });
            const data = await res.json();
            if (!res.ok) { return data.error || "Erro ao salvar"; }
            setEditing(null);
            await loadData();
            return null;
          }}
        />
      )}
    </>
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

/* ── Form modal ──────────────────────────────────── */

function UserFormModal({
  title,
  initial,
  stores,
  showPassword,
  onClose,
  onSave,
}: {
  title: string;
  initial: UserForm;
  stores: StoreRow[];
  showPassword: boolean;
  onClose: () => void;
  /** Retorna string de erro ou null em caso de sucesso. */
  onSave: (form: UserForm) => Promise<string | null>;
}) {
  const [form, setForm] = useState<UserForm>(initial);
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
            placeholder="Ex.: João Silva"
            className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
          />
        </Field>

        <Field label={showPassword ? "Email *" : "Email"}>
          <input
            type="email"
            value={form.email}
            disabled={!showPassword}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="usuario@dominio.com"
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

        <Field label="Role *">
          <div className="flex gap-2">
            <RolePill
              active={form.role === "unidade"}
              label="Unidade"
              color="#22C55E"
              onClick={() => setForm({ ...form, role: "unidade" })}
            />
            <RolePill
              active={form.role === "vendedor"}
              label="Consultor"
              color="#A78BFA"
              onClick={() => setForm({ ...form, role: "vendedor" })}
            />
          </div>
        </Field>

        <Field label="Unidade">
          <select
            value={form.store_id}
            onChange={(e) => setForm({ ...form, store_id: e.target.value })}
            className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] focus:border-[var(--orange)] focus:outline-none"
          >
            <option value="">— Sem unidade —</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <div className="flex gap-2">
            <RolePill
              active={form.status === "active"}
              label="Ativo"
              color="#22C55E"
              onClick={() => setForm({ ...form, status: "active" })}
            />
            <RolePill
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

function RolePill({
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
