"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import ImageCropModal from "@/components/ImageCropModal";

/* ── Types ───────────────────────────────────────── */

interface Profile {
  id: string; name: string | null; role: string; sub_role: string | null;
  status: string; licensee_id: string | null; store_id: string | null; created_at: string;
  avatar_url: string | null;
  stories_limit: number | null; feed_limit: number | null; reels_limit: number | null; tv_limit: number | null;
}
interface Licensee { id: string; name: string; segment_id: string | null; }
interface Store { id: string; name: string; licensee_id: string; }
interface Segment { id: string; name: string; icon: string | null; }
interface Plan { slug: string; name: string; max_posts_day: number; max_stories_day: number | null; max_feed_reels_day: number | null; can_schedule: boolean; can_metrics: boolean; is_enterprise: boolean; }

type ModalTab = "dados" | "acesso" | "limites" | "senha";

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  adm:      { label: "ADM",       color: "#D4A843" },
  cliente:  { label: "Cliente",   color: "#3B82F6" },
  operador: { label: "Operador",  color: "#F59E0B" },
  unidade:  { label: "Unidade",   color: "#22C55E" },
  gerente:  { label: "Gerente",   color: "#14B8A6" },
  vendedor: { label: "Consultor",  color: "#A78BFA" },
  // Legados
  licensee: { label: "Licenciado", color: "#3B82F6" },
  client:   { label: "Funcionário", color: "#A78BFA" },
};

const PLAN_LABELS: Record<string, string> = { basic: "Essencial", pro: "Profissional", business: "Franquia", enterprise: "Enterprise" };

/* ── Component ───────────────────────────────────── */

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState<ModalTab>("dados");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "cliente", status: "active",
    segment_id: "", licensee_id: "", store_ids: [] as string[],
    landing: "client", ai: false, metrics: false, transmissao: false, avulso: false,
    plan: "", stories_limit: "0", feed_limit: "0", reels_limit: "0", tv_limit: "0",
    avatar_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Config modal
  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgLicensee, setCfgLicensee] = useState("");
  const [cfgUsers, setCfgUsers] = useState<{ id: string; name: string; role: string; store_id: string | null; landing: string; ai: boolean; metrics: boolean; forms: boolean }[]>([]);
  const [cfgSaving, setCfgSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [pR, lR, sR, segR, plR] = await Promise.all([
        supabase.from("profiles").select("id, name, role, sub_role, status, licensee_id, store_id, created_at, avatar_url, stories_limit, feed_limit, reels_limit, tv_limit").order("created_at", { ascending: false }),
        supabase.from("licensees").select("id, name, segment_id").order("name"),
        supabase.from("stores").select("id, name, licensee_id").order("name"),
        supabase.from("segments").select("id, name, icon"),
        supabase.from("plans").select("slug, name, max_posts_day, max_stories_day, max_feed_reels_day, can_schedule, can_metrics, is_enterprise"),
      ]);
      setProfiles((pR.data as Profile[]) ?? []);
      setLicensees((lR.data as Licensee[]) ?? []);
      setStores((sR.data as Store[]) ?? []);
      setSegments((segR.data as Segment[]) ?? []);
      setPlans((plR.data as Plan[]) ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const licMap = useMemo(() => { const m: Record<string, Licensee> = {}; licensees.forEach((l) => { m[l.id] = l; }); return m; }, [licensees]);
  const storeMap = useMemo(() => { const m: Record<string, Store> = {}; stores.forEach((s) => { m[s.id] = s; }); return m; }, [stores]);
  const segMap = useMemo(() => { const m: Record<string, Segment> = {}; segments.forEach((s) => { m[s.id] = s; }); return m; }, [segments]);

  const storesForLic = useMemo(() => {
    if (!form.licensee_id) return stores;
    return stores.filter((s) => s.licensee_id === form.licensee_id);
  }, [stores, form.licensee_id]);

  const licenseesForSeg = useMemo(() => {
    if (!form.segment_id) return licensees;
    return licensees.filter((l) => l.segment_id === form.segment_id);
  }, [licensees, form.segment_id]);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const ms = !search || (p.name ?? "").toLowerCase().includes(search.toLowerCase());
      const mr = !roleFilter || p.role === roleFilter;
      const mst = !statusFilter || (statusFilter === "active" ? p.status === "active" : p.status !== "active");
      return ms && mr && mst;
    });
  }, [profiles, search, roleFilter, statusFilter]);

  const kpis = useMemo(() => ({
    total: profiles.length,
    active: profiles.filter((p) => p.status === "active").length,
    licensees: profiles.filter((p) => p.role === "licensee").length,
    staff: profiles.filter((p) => p.role === "client").length,
  }), [profiles]);

  /* ── Edit modal ────────────────────────────────── */

  function openNew() {
    setEditId(null);
    setForm({ name: "", email: "", password: genPassword(), role: "cliente", status: "active", segment_id: "", licensee_id: "", store_ids: [], landing: "client", ai: false, metrics: false, transmissao: false, avulso: false, plan: "", stories_limit: "0", feed_limit: "0", reels_limit: "0", tv_limit: "0", avatar_url: "" });
    setEditTab("dados"); setModalError(""); setEditOpen(true);
  }

  function genPassword(): string {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  async function openEdit(p: Profile) {
    setEditId(p.id);
    const licId = p.licensee_id ?? (p.store_id ? storeMap[p.store_id]?.licensee_id : "") ?? "";
    const lic = licId ? licMap[licId] : null;

    // Carrega permissões atuais do licensee
    let ai = false, metrics = false, transmissao = false;
    if (licId) {
      try {
        const { data: ovs } = await supabase
          .from("licensee_feature_overrides")
          .select("feature_key, enabled")
          .eq("licensee_id", licId);
        for (const ov of (ovs ?? []) as { feature_key: string; enabled: boolean }[]) {
          if (ov.feature_key === "ia_legenda") ai = ov.enabled;
          if (ov.feature_key === "metricas") metrics = ov.enabled;
          if (ov.feature_key === "transmissao") transmissao = ov.enabled;
        }
      } catch { /* silent */ }
    }

    setForm({
      name: p.name ?? "", email: "", password: "", role: p.role, status: p.status,
      segment_id: lic?.segment_id ?? "", licensee_id: licId,
      store_ids: p.store_id ? [p.store_id] : [],
      landing: "client", ai, metrics, transmissao, avulso: p.sub_role === "avulso",
      plan: "", stories_limit: String(p.stories_limit ?? 0), feed_limit: String(p.feed_limit ?? 0), reels_limit: String(p.reels_limit ?? 0), tv_limit: String(p.tv_limit ?? 0),
      avatar_url: p.avatar_url ?? "",
    });
    setEditTab("dados"); setModalError(""); setEditOpen(true);
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleAvatarCropped(blob: Blob) {
    setCropSrc(null);
    setUploading(true);
    try {
      const file = new File([blob], "avatar.png", { type: "image/png" });
      const url = await uploadToCloudinary(file, "aurohubv2/profile");
      setForm((prev) => ({ ...prev, avatar_url: url }));
    } catch (err) {
      console.error("[Avatar upload]", err);
      setModalError("Falha no upload — cole a URL manualmente.");
    } finally { setUploading(false); }
  }

  function selectPlan(slug: string) {
    const p = plans.find((pl) => pl.slug === slug);
    if (!p) return;
    const fmt = (v: number | null) => String(v === null || v === -1 ? 999 : v);
    const stories = fmt(p.max_stories_day);
    const feedReels = fmt(p.max_feed_reels_day);
    setForm({ ...form, plan: slug, stories_limit: stories, feed_limit: feedReels, reels_limit: feedReels, tv_limit: p.is_enterprise ? "999" : "0" });
  }

  async function handleSave() {
    if (!form.name.trim()) { setModalError("Nome obrigatório."); return; }
    setSaving(true); setModalError("");
    try {
      const profile = {
        name: form.name.trim(),
        role: form.role,
        status: form.status,
        licensee_id: form.licensee_id || null,
        store_id: form.store_ids[0] || null,
        sub_role: form.avulso ? "avulso" : null,
        avatar_url: form.avatar_url || null,
      };

      // Dados extras das abas Lojas & Acesso + Limites
      const extras = {
        licensee_id: form.licensee_id || null,
        store_ids: form.store_ids,
        landing: form.landing,
        ai: form.ai,
        metrics: form.metrics,
        transmissao: form.transmissao,
        plan: form.plan || null,
        stories_limit: form.stories_limit,
        feed_limit: form.feed_limit,
        reels_limit: form.reels_limit,
        tv_limit: form.tv_limit,
        password: newPassword || undefined,
      };

      if (editId) {
        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, profile, extras }),
        });
        const data = await res.json();
        if (!res.ok) { setModalError(data.error || "Erro ao atualizar"); setSaving(false); return; }
      } else {
        const email = form.email.trim().toLowerCase();
        const password = form.password;
        if (!email || !password) { setModalError("Email e senha obrigatórios para novo usuário."); setSaving(false); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setModalError("Email inválido. Use o formato usuario@dominio.com"); setSaving(false); return; }
        if (password.length < 6) { setModalError("Senha deve ter no mínimo 6 caracteres."); setSaving(false); return; }

        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, profile }),
        });
        const data = await res.json();
        if (!res.ok) { setModalError(data.error || "Erro ao criar usuário"); setSaving(false); return; }
      }
      // Fecha modal, limpa estado e recarrega lista
      setEditOpen(false);
      setEditId(null);
      setNewPassword("");
      setPasswordMsg("");
      await loadData();
    } catch (err) { console.error("[handleSave]", err); setModalError("Erro ao salvar."); } finally { setSaving(false); }
  }

  async function resetPassword(userId: string) {
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg("Mínimo 6 caracteres");
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg("");
    try {
      const res = await fetch("/api/admin/reset-password-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg("✅ Senha alterada com sucesso");
        setNewPassword("");
      } else {
        setPasswordMsg(`❌ ${data.error || "Erro"}`);
      }
    } catch {
      setPasswordMsg("❌ Erro de conexão");
    } finally {
      setPasswordSaving(false);
    }
  }

  /* ── Config modal ──────────────────────────────── */

  function openConfig() {
    const firstLic = licensees[0]?.id ?? "";
    setCfgLicensee(firstLic);
    buildCfgUsers(firstLic);
    setCfgOpen(true);
  }

  function buildCfgUsers(licId: string) {
    const users = profiles.filter((p) => p.licensee_id === licId || (p.store_id && storeMap[p.store_id]?.licensee_id === licId));
    setCfgUsers(users.map((u) => ({
      id: u.id, name: u.name ?? "—", role: u.role, store_id: u.store_id,
      landing: "client", ai: false, metrics: false, forms: true,
    })));
  }

  function changeCfgLicensee(licId: string) { setCfgLicensee(licId); buildCfgUsers(licId); }

  function toggleCfgBadge(idx: number, field: "ai" | "metrics" | "forms") {
    setCfgUsers(cfgUsers.map((u, i) => i === idx ? { ...u, [field]: !u[field] } : u));
  }

  async function saveCfg() {
    setCfgSaving(true);
    // In production this would batch-update metadata per user
    setCfgSaving(false); setCfgOpen(false);
  }

  /* ── Delete ────────────────────────────────────── */

  async function toggleStatus(id: string, current: string) {
    await supabase.from("profiles").update({ status: current === "active" ? "inactive" : "active" }).eq("id", id);
    await loadData();
  }

  async function deleteUser(id: string) {
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        console.error("[deleteUser]", data.error);
      }
    } catch (err) { console.error("[deleteUser]", err); }
    setDeleteId(null); await loadData();
  }

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {cropSrc && <ImageCropModal src={cropSrc} shape="circle" onClose={() => setCropSrc(null)} onConfirm={handleAvatarCropped} />}
      {/* ── KPIs ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-6">
        <KI label="Total" value={String(kpis.total)} />
        <KI label="Ativos" value={String(kpis.active)} accent />
        <KI label="Licenciados" value={String(kpis.licensees)} />
        <KI label="Funcionários" value={String(kpis.staff)} />
      </div>

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Usuários</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Gerencie acessos, permissões e limites</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openConfig} className="rounded-lg border border-[var(--bdr)] px-4 py-2 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">Configurações</button>
          <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-[var(--txt)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)]">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Novo usuário
          </button>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--txt3)]"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent pl-9 pr-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Todas roles</option>
          {Object.entries(ROLE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
          {[{ k: "", l: "Todos" }, { k: "active", l: "Ativos" }, { k: "inactive", l: "Inativos" }].map((t) => (
            <button key={t.k} onClick={() => setStatusFilter(t.k)} className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${statusFilter === t.k ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* ── Table ────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
        {loading ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando...</div>
        : filtered.length === 0 ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Nenhum usuário encontrado</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--bdr)]">
                  {["Usuário", "Role", "Marca", "Loja", "Status", "Criado", "Ações"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium text-[var(--txt3)] first:pl-5 last:pr-5 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const rc = ROLE_MAP[p.role] ?? { label: p.role, color: "var(--txt2)" };
                  const lic = p.licensee_id ? licMap[p.licensee_id] : (p.store_id ? licMap[storeMap[p.store_id]?.licensee_id ?? ""] : null);
                  const store = p.store_id ? storeMap[p.store_id] : null;
                  const isActive = p.status === "active";

                  return (
                    <tr key={p.id} className="border-b border-[var(--bdr)] last:border-b-0 hover:bg-[var(--hover-bg)]">
                      <td className="whitespace-nowrap pl-5 pr-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {p.avatar_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={p.avatar_url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] text-[11px] font-semibold text-[var(--txt2)]">{(p.name ?? "?").charAt(0).toUpperCase()}</div>
                          )}
                          <span className="font-medium text-[var(--txt)]">{p.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3"><span className="text-[12px] font-medium" style={{ color: rc.color }}>{rc.label}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[var(--txt3)]">{lic?.name ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[var(--txt3)]">{store?.name ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-[12px] ${isActive ? "text-[var(--green)]" : "text-[var(--red)]"}`}><span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[var(--green)]" : "bg-[var(--red)]"}`} />{isActive ? "Ativo" : "Inativo"}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[var(--txt3)]">{new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</td>
                      <td className="whitespace-nowrap pr-5 pl-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(p)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">Editar</button>
                          <button onClick={() => toggleStatus(p.id, p.status)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">{isActive ? "Desativar" : "Ativar"}</button>
                          <button onClick={() => setDeleteId(p.id)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--red)]">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Delete confirm ────────────────────────── */}
      {deleteId && (
        <Ov onClose={() => setDeleteId(null)}>
          <div className="mx-4 w-full max-w-[360px] rounded-2xl border border-[var(--bdr)] p-6" style={{ background: "var(--card-bg)" }}>
            <div className="mb-4 text-center">
              <div className="text-[15px] font-bold text-[var(--txt)]">Excluir usuário?</div>
              <div className="mt-1 text-[13px] text-[var(--txt3)]">Esta ação não pode ser desfeita.</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-lg py-2 text-[13px] text-[var(--txt3)]">Cancelar</button>
              <button onClick={() => deleteUser(deleteId)} className="flex-1 rounded-lg bg-[var(--red)] py-2 text-[13px] font-semibold text-white">Excluir</button>
            </div>
          </div>
        </Ov>
      )}

      {/* ── Edit user modal ──────────────────────── */}
      {editOpen && (
        <Ov onClose={() => setEditOpen(false)}>
          <div className="mx-4 flex w-full max-w-[580px] max-h-[90vh] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <h2 className="text-[16px] font-bold text-[var(--txt)]">{editId ? "Editar usuário" : "Novo usuário"}</h2>
              <button onClick={() => setEditOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--bdr)] px-6">
              {(["dados", "acesso", ...(editId ? ["senha"] : [])] as ModalTab[]).map((t) => (
                <button key={t} onClick={() => setEditTab(t)} className={`border-b-2 px-4 py-2.5 text-[12px] font-medium ${editTab === t ? "border-[var(--txt)] text-[var(--txt)]" : "border-transparent text-[var(--txt3)]"}`}>
                  {t === "dados" ? "Dados" : t === "acesso" ? "Lojas & Acesso" : t === "limites" ? "Limites & Plano" : "Senha"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* TAB 1: Dados */}
              {editTab === "dados" && (
                <div className="flex flex-col gap-4">
                  {/* Avatar */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Foto</label>
                    <div className="flex items-center gap-4">
                      {form.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={form.avatar_url} alt="Avatar" className="h-14 w-14 shrink-0 rounded-full object-cover border border-[var(--bdr)]" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] text-[18px] font-bold text-[var(--txt2)]">
                          {(form.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                        <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploading} className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                          {uploading ? "Enviando..." : "Upload foto"}
                        </button>
                        <input type="text" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="ou cole URL da imagem" className="h-7 w-full rounded border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none" />
                        {form.avatar_url && <button type="button" onClick={() => setForm({ ...form, avatar_url: "" })} className="text-[11px] text-[var(--red)] hover:underline">Remover foto</button>}
                      </div>
                    </div>
                  </div>
                  <F label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="João Silva" />
                  {!editId && <F label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="joao@agencia.com" type="email" />}
                  {!editId && (
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-[11px] font-medium text-[var(--txt3)]">Senha</label>
                        <button type="button" onClick={() => setForm({ ...form, password: genPassword() })} className="text-[11px] font-semibold text-[var(--orange)] hover:underline">
                          Gerar nova
                        </button>
                      </div>
                      <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] font-mono text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Nível</label>
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      <option value="cliente">Cliente</option>
                      <option value="operador">Operador</option>
                      <option value="unidade">Unidade</option>
                      <option value="gerente">Gerente</option>
                      <option value="vendedor">Consultor</option>
                      <option value="adm">ADM</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Segmento</label>
                    <select value={form.segment_id} onChange={(e) => setForm({ ...form, segment_id: e.target.value, licensee_id: "" })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      <option value="">Todos</option>
                      {segments.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Marca / Licenciado</label>
                    <select value={form.licensee_id} onChange={(e) => setForm({ ...form, licensee_id: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      <option value="">Nenhum</option>
                      {licenseesForSeg.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
                    {["active", "inactive"].map((s) => (
                      <button key={s} onClick={() => setForm({ ...form, status: s })} className={`flex-1 rounded-md py-1.5 text-[12px] font-medium ${form.status === s ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>{s === "active" ? "Ativo" : "Inativo"}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: Lojas & Acesso */}
              {editTab === "acesso" && (
                <div className="flex flex-col gap-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--txt3)]">Lojas vinculadas</span>
                      {storesForLic.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = storesForLic.map(s => s.id);
                            const allSelected = allIds.every(id => form.store_ids.includes(id));
                            setForm({ ...form, store_ids: allSelected ? [] : allIds });
                          }}
                          className="text-[10px] font-semibold text-[var(--orange)] hover:underline"
                        >
                          {storesForLic.every(s => form.store_ids.includes(s.id)) ? "Limpar" : "Todas"}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {storesForLic.map((s) => {
                        const sel = form.store_ids.includes(s.id);
                        return (
                          <button key={s.id} onClick={() => setForm({ ...form, store_ids: sel ? form.store_ids.filter((x) => x !== s.id) : [...form.store_ids, s.id] })}
                            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium border transition-colors ${sel ? "border-[var(--green)] bg-[var(--green3)] text-[var(--green)]" : "border-[var(--bdr)] text-[var(--txt3)] hover:text-[var(--txt)]"}`}>
                            {s.name}
                          </button>
                        );
                      })}
                      {storesForLic.length === 0 && <span className="text-[12px] text-[var(--txt3)]">Selecione uma marca primeiro</span>}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Página de destino ao logar</label>
                    <select value={form.landing} onChange={(e) => setForm({ ...form, landing: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none">
                      <option value="client">Padrão (client)</option><option value="vitrine">Vitrine</option><option value="editor">Editor</option>
                    </select>
                  </div>
                  <div className="h-px bg-[var(--bdr)]" />
                  <div className="text-[11px] font-medium text-[var(--txt3)]">Permissões individuais</div>
                  <div className="flex flex-col gap-2">
                    <Toggle label="IA de legenda" desc="Geração automática com Claude" checked={form.ai} onChange={(v) => setForm({ ...form, ai: v })} />
                    <Toggle label="Métricas Instagram" desc="Acesso ao painel de métricas" checked={form.metrics} onChange={(v) => setForm({ ...form, metrics: v })} />
                    <Toggle label="Transmissão" desc="Módulo de artes para lista" checked={form.transmissao} onChange={(v) => setForm({ ...form, transmissao: v })} />
                    <Toggle label="Usuário avulso" desc="Vinculado à marca sem herdar formulários da loja" checked={form.avulso} onChange={(v) => setForm({ ...form, avulso: v })} />
                  </div>
                </div>
              )}

              {/* TAB 3: Limites & Plano */}
              {editTab === "limites" && (
                <div className="flex flex-col gap-5">
                  <div>
                    <div className="mb-2 text-[11px] font-medium text-[var(--txt3)]">Selecionar plano (preenche limites)</div>
                    <div className="grid grid-cols-2 gap-2">
                      {plans.map((p) => (
                        <button key={p.slug} onClick={() => selectPlan(p.slug)} className={`rounded-lg border p-3 text-left transition-colors ${form.plan === p.slug ? "border-[var(--txt)] bg-[var(--bg3)]" : "border-[var(--bdr)] hover:border-[var(--txt3)]"}`}>
                          <div className="text-[13px] font-medium text-[var(--txt)]">{PLAN_LABELS[p.slug] ?? p.name}</div>
                          <div className="mt-0.5 text-[11px] text-[var(--txt3)]">{p.max_posts_day === -1 ? "Ilimitado" : `${p.max_posts_day} posts/dia`}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-px bg-[var(--bdr)]" />
                  <div className="text-[11px] font-medium text-[var(--txt3)]">Limites por formato (0 = bloqueado)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Stories/mês" value={form.stories_limit} onChange={(v) => setForm({ ...form, stories_limit: v })} type="number" />
                    <F label="Feed/mês" value={form.feed_limit} onChange={(v) => setForm({ ...form, feed_limit: v })} type="number" />
                    <F label="Reels/mês" value={form.reels_limit} onChange={(v) => setForm({ ...form, reels_limit: v })} type="number" />
                    <F label="TV/mês" value={form.tv_limit} onChange={(v) => setForm({ ...form, tv_limit: v })} type="number" />
                  </div>
                </div>
              )}

              {/* TAB 4: Senha */}
              {editTab === "senha" && (
                <div className="flex flex-col gap-4 p-6">
                  <p className="text-[12px] text-[var(--txt3)]">
                    Altera a senha de acesso deste usuário.
                  </p>
                  <div className="flex gap-2">
                    <input type="text" value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Nova senha (mín. 6 caracteres)"
                      className="h-9 flex-1 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] focus:outline-none focus:border-[#D4A843]" />
                    <button onClick={() => setNewPassword(Math.random().toString(36).slice(2,10))}
                      className="h-9 px-3 rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] text-[11px] text-[var(--txt2)]">
                      🎲
                    </button>
                  </div>
                  {passwordMsg && (
                    <p className="text-[11px]" style={{color: passwordMsg.includes("✅") ? "var(--green)" : "var(--red)"}}>
                      {passwordMsg}
                    </p>
                  )}
                  <button onClick={() => editId && resetPassword(editId)}
                    disabled={passwordSaving || !newPassword}
                    className="h-9 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50"
                    style={{background: "linear-gradient(135deg, var(--orange), #D4A843)"}}>
                    {passwordSaving ? "Salvando..." : "Alterar senha"}
                  </button>
                </div>
              )}

              {modalError && <div className="mt-4 rounded-lg bg-[var(--red3)] px-3 py-2 text-center text-[12px] font-medium text-[var(--red)]">{modalError}</div>}
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4 shrink-0">
              <button onClick={() => setEditOpen(false)} className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)]">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)] disabled:opacity-60">{saving ? "Salvando..." : editId ? "Salvar" : "Criar"}</button>
            </div>
          </div>
        </Ov>
      )}

      {/* ── Config modal ─────────────────────────── */}
      {cfgOpen && (
        <Ov onClose={() => setCfgOpen(false)}>
          <div className="mx-4 flex w-full max-w-[700px] max-h-[90vh] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--txt)]">Configuração de usuários</h2>
                <p className="mt-0.5 text-[12px] text-[var(--txt3)]">Permissões rápidas por marca</p>
              </div>
              <select value={cfgLicensee} onChange={(e) => changeCfgLicensee(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
                {licensees.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto">
              {cfgUsers.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-[var(--txt3)]">Nenhum usuário nesta marca</div>
              ) : (
                <div className="divide-y divide-[var(--bdr)]">
                  {cfgUsers.map((u, i) => (
                    <div key={u.id} className="flex items-center gap-3 px-6 py-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] text-[11px] font-semibold text-[var(--txt2)]">{u.name.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[var(--txt)]">{u.name}</div>
                        <div className="text-[11px] text-[var(--txt3)]">{ROLE_MAP[u.role]?.label ?? u.role}{u.store_id ? ` · ${storeMap[u.store_id]?.name}` : ""}</div>
                      </div>
                      <select value={u.landing} onChange={(e) => setCfgUsers(cfgUsers.map((x, j) => j === i ? { ...x, landing: e.target.value } : x))} className="h-7 rounded border border-[var(--bdr)] bg-transparent px-1.5 text-[10px] text-[var(--txt)] outline-none">
                        <option value="client">Client</option><option value="vitrine">Vitrine</option><option value="editor">Editor</option>
                      </select>
                      <div className="flex gap-1">
                        {(["ai", "metrics", "forms"] as const).map((badge) => (
                          <button key={badge} onClick={() => toggleCfgBadge(i, badge)} className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${u[badge] ? "bg-[rgba(255,122,26,0.15)] text-[var(--orange)]" : "bg-[var(--bg3)] text-[var(--txt3)]"}`}>
                            {badge === "ai" ? "IA" : badge === "metrics" ? "MET" : "FORMS"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4 shrink-0">
              <button onClick={() => setCfgOpen(false)} className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)]">Cancelar</button>
              <button onClick={saveCfg} disabled={cfgSaving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)]">{cfgSaving ? "Salvando..." : "Salvar tudo"}</button>
            </div>
          </div>
        </Ov>
      )}
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Ov({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>{children}</div>;
}

function KI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className="flex items-baseline gap-2"><span className="text-[12px] text-[var(--txt3)]">{label}</span><span className={`text-[16px] font-bold ${accent ? "text-[var(--green)]" : "text-[var(--txt)]"}`}>{value}</span></div>;
}

function F({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <div><label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">{label}</label><input type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" /></div>;
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-4 py-3 cursor-pointer hover:bg-[var(--hover-bg)]">
      <div><div className="text-[13px] font-medium text-[var(--txt)]">{label}</div><div className="text-[11px] text-[var(--txt3)]">{desc}</div></div>
      <div onClick={(e) => { e.preventDefault(); onChange(!checked); }} className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-[var(--green)]" : "bg-[var(--bg3)]"}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}
