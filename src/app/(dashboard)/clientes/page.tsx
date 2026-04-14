"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import SplashScreen, { type SplashEffect } from "@/components/splash/SplashScreen";
import {
  ALL_FEATURES,
  FEATURE_LABELS,
  planDefaultFeatures,
  getLicenseeOverrides,
  saveLicenseeOverrides,
  type Feature,
} from "@/lib/features";

/* ── Types ───────────────────────────────────────── */

interface Licensee {
  id: string; name: string; email: string; plan: string; status: string;
  segment_id: string | null; expires_at: string | null; created_at: string;
  logo_url: string | null;
  splash_effect?: string; splash_logo_orientation?: string;
  splash_velocidade?: number; splash_suavidade?: number;
  splash_som_url?: string | null; splash_som_public_id?: string | null;
  cor_primaria?: string; cor_secundaria?: string; cor_acento?: string; cor_fundo?: string;
  cor4?: string; cor5?: string;
  tema_fundo_escuro?: string; tema_fundo_claro?: string; tema_texto_escuro?: string; tema_texto_claro?: string;
}
interface Segment { id: string; name: string; icon: string | null; }
interface Plan { slug: string; name: string; price_monthly: number; is_internal?: boolean | null; can_metrics?: boolean | null; can_schedule?: boolean | null; can_ia_legenda?: boolean | null; }
interface Store { id: string; licensee_id: string; name: string; ig_user_id: string | null; }
interface Profile { id: string; licensee_id: string | null; store_id: string | null; name: string | null; status: string; }

type TabFilter = "" | "active" | "inactive";
type ModalTab = "dados" | "tema" | "plano" | "lojas" | "features" | "senha";

const PLAN_COLORS: Record<string, { color: string; label: string }> = {
  basic: { color: "#64748b", label: "Essencial" },
  pro: { color: "#3B82F6", label: "Profissional" },
  business: { color: "var(--orange)", label: "Franquia" },
  enterprise: { color: "#D4A843", label: "Enterprise" },
};

/* ── Component ───────────────────────────────────── */

export default function ClientesPage() {
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [segFilter, setSegFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<TabFilter>("");

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("dados");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", segment_id: "", plan: "basic", price_setup: "1500", min_months: "6", logo_url: "", expires_at: "", splash_effect: "", splash_logo_orientation: "horizontal", splash_velocidade: 5, splash_suavidade: 7, splash_som_url: "", splash_som_public_id: "", cor_primaria: "var(--orange)", cor_secundaria: "#D4A843", cor_acento: "#1E3A6E", cor_fundo: "#0E1520", cor4: "", cor5: "", tema_fundo_escuro: "#0A1020", tema_fundo_claro: "#ffffff", tema_texto_escuro: "#0f172a", tema_texto_claro: "#EEF2FF" });
  const [formStores, setFormStores] = useState<{ name: string; ig_user_id: string }[]>([{ name: "", ig_user_id: "" }]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingSom, setUploadingSom] = useState(false);
  const somFileRef = useRef<HTMLInputElement>(null);

  async function handleSomUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSom(true);
    try {
      const signRes = await fetch("/api/cloudinary/sign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "aurohubv2/splash-sons" }),
      });
      const signData = await signRes.json();
      if (!signData.signature) throw new Error("Falha ao assinar");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", signData.api_key);
      fd.append("timestamp", String(signData.timestamp));
      fd.append("folder", signData.folder);
      fd.append("signature", signData.signature);
      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloud_name}/video/upload`, { method: "POST", body: fd });
      const upData = await upRes.json();
      if (!upData.secure_url) throw new Error(upData.error?.message || "Upload falhou");
      setForm(f => ({ ...f, splash_som_url: upData.secure_url, splash_som_public_id: upData.public_id }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro no upload");
    } finally { setUploadingSom(false); if (somFileRef.current) somFileRef.current.value = ""; }
  }
  const [extracting, setExtracting] = useState(false);
  const [modalError, setModalError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  /** Overrides carregadas. `undefined` = segue o padrão do plano. */
  const [featureOverrides, setFeatureOverrides] = useState<Partial<Record<Feature, boolean>>>({});

  // View stores modal
  const [viewStoresId, setViewStoresId] = useState<string | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Reset password
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

  // Wizard de onboarding
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardSaving, setWizardSaving] = useState(false);
  const [wizardError, setWizardError] = useState("");
  const [wizardData, setWizardData] = useState({
    agency: { name: "", email: "", segment_id: "", plan: "basic", city: "", expires_at: "" },
    stores: [{ name: "", city: "", instagram: "" }] as { name: string; city: string; instagram: string }[],
    user: { name: "", email: "", password: "" },
  });
  const [wizardResult, setWizardResult] = useState<{ licenseeName: string; email: string; password: string; storesCount: number } | null>(null);

  /* ── Load ──────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const [licR, segR, planR, storeR, profR] = await Promise.all([
        supabase.from("licensees").select("id, name, email, plan, status, segment_id, expires_at, created_at, logo_url, splash_effect, splash_logo_orientation, splash_velocidade, splash_suavidade, splash_som_url, splash_som_public_id, cor_primaria, cor_secundaria, cor_acento, cor_fundo, cor4, cor5, tema_fundo_escuro, tema_fundo_claro, tema_texto_escuro, tema_texto_claro").order("created_at", { ascending: false }),
        supabase.from("segments").select("id, name, icon"),
        supabase.from("plans").select("slug, name, price_monthly, is_internal, can_metrics, can_schedule, can_ia_legenda"),
        supabase.from("stores").select("id, licensee_id, name, ig_user_id"),
        supabase.from("profiles").select("id, licensee_id, store_id, name, status"),
      ]);
      setLicensees((licR.data as Licensee[]) ?? []);
      setSegments((segR.data as Segment[]) ?? []);
      setPlans((planR.data as Plan[]) ?? []);
      setStores((storeR.data as Store[]) ?? []);
      setProfiles((profR.data as Profile[]) ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const segMap = useMemo(() => { const m: Record<string, Segment> = {}; segments.forEach((s) => { m[s.id] = s; }); return m; }, [segments]);
  const planMap = useMemo(() => { const m: Record<string, Plan> = {}; plans.forEach((p) => { m[p.slug] = p; }); return m; }, [plans]);
  const storesByLic = useMemo(() => { const m: Record<string, Store[]> = {}; stores.forEach((s) => { if (!m[s.licensee_id]) m[s.licensee_id] = []; m[s.licensee_id].push(s); }); return m; }, [stores]);
  const usersByLic = useMemo(() => { const m: Record<string, number> = {}; profiles.forEach((p) => { const k = p.licensee_id ?? ""; m[k] = (m[k] || 0) + 1; }); return m; }, [profiles]);

  const kpis = useMemo(() => {
    const active = licensees.filter((l) => l.status === "active").length;
    const withPlan = licensees.filter((l) => l.plan).length;
    const mrr = licensees.filter((l) => l.status === "active").reduce((s, l) => s + (planMap[l.plan]?.price_monthly ?? 0), 0);
    return { total: licensees.length, active, withPlan, noPlan: licensees.length - withPlan, mrr };
  }, [licensees, planMap]);

  const filtered = useMemo(() => {
    return licensees.filter((l) => {
      const ms = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
      const mseg = !segFilter || l.segment_id === segFilter;
      const mp = !planFilter || l.plan === planFilter;
      const mst = !statusFilter || (statusFilter === "active" ? l.status === "active" : l.status !== "active");
      return ms && mseg && mp && mst;
    });
  }, [licensees, search, segFilter, planFilter, statusFilter]);

  /* ── Actions ───────────────────────────────────── */

  function openNew() {
    setEditingId(null);
    setForm({ name: "", email: "", phone: "", segment_id: "", plan: "basic", price_setup: "1500", min_months: "6", logo_url: "", expires_at: "", splash_effect: "", splash_logo_orientation: "horizontal", splash_velocidade: 5, splash_suavidade: 7, splash_som_url: "", splash_som_public_id: "", cor_primaria: "var(--orange)", cor_secundaria: "#D4A843", cor_acento: "#1E3A6E", cor_fundo: "#0E1520", cor4: "", cor5: "", tema_fundo_escuro: "#0A1020", tema_fundo_claro: "#ffffff", tema_texto_escuro: "#0f172a", tema_texto_claro: "#EEF2FF" });
    setFormStores([{ name: "", ig_user_id: "" }]);
    setFeatureOverrides({});
    setModalTab("dados"); setModalError(""); setModalOpen(true);
  }

  function openEdit(l: Licensee) {
    setEditingId(l.id);
    setForm({ name: l.name, email: l.email, phone: "", segment_id: l.segment_id ?? "", plan: l.plan || "basic", price_setup: "0", min_months: "6", logo_url: l.logo_url ?? "", expires_at: l.expires_at ? l.expires_at.split("T")[0] : "", splash_effect: l.splash_effect ?? "", splash_logo_orientation: l.splash_logo_orientation ?? "horizontal", splash_velocidade: l.splash_velocidade ?? 5, splash_suavidade: l.splash_suavidade ?? 7, splash_som_url: l.splash_som_url ?? "", splash_som_public_id: l.splash_som_public_id ?? "", cor_primaria: l.cor_primaria ?? "var(--orange)", cor_secundaria: l.cor_secundaria ?? "#D4A843", cor_acento: l.cor_acento ?? "#1E3A6E", cor_fundo: l.cor_fundo ?? "#0E1520", cor4: l.cor4 ?? "", cor5: l.cor5 ?? "", tema_fundo_escuro: l.tema_fundo_escuro ?? "#0A1020", tema_fundo_claro: l.tema_fundo_claro ?? "#ffffff", tema_texto_escuro: l.tema_texto_escuro ?? "#0f172a", tema_texto_claro: l.tema_texto_claro ?? "#EEF2FF" });
    const existing = storesByLic[l.id] ?? [];
    setFormStores(existing.length > 0 ? existing.map((s) => ({ name: s.name, ig_user_id: s.ig_user_id ?? "" })) : [{ name: "", ig_user_id: "" }]);
    setFeatureOverrides({});
    getLicenseeOverrides(supabase, l.id).then(setFeatureOverrides).catch(() => setFeatureOverrides({}));
    setModalTab("dados"); setModalError(""); setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { setModalError("Nome e email obrigatórios."); return; }
    setSaving(true); setModalError("");
    try {
      const formPlanIsInternal = !!planMap[form.plan]?.is_internal;
      const payload: Record<string, unknown> = {
        name: form.name.trim(), email: form.email.trim().toLowerCase(),
        plan: form.plan, segment_id: form.segment_id || null, status: "active",
        logo_url: form.logo_url || null,
        splash_effect: form.splash_effect || null,
        splash_logo_orientation: form.splash_logo_orientation || "horizontal",
        splash_velocidade: form.splash_velocidade ?? 5,
        splash_suavidade: form.splash_suavidade ?? 7,
        splash_som_url: form.splash_som_url || null,
        splash_som_public_id: form.splash_som_public_id || null,
        cor_primaria: form.cor_primaria || null,
        cor_secundaria: form.cor_secundaria || null,
        cor_acento: form.cor_acento || null,
        cor_fundo: form.cor_fundo || null,
        cor4: form.cor4 || null,
        cor5: form.cor5 || null,
        tema_fundo_escuro: form.tema_fundo_escuro || null,
        tema_fundo_claro: form.tema_fundo_claro || null,
        tema_texto_escuro: form.tema_texto_escuro || null,
        tema_texto_claro: form.tema_texto_claro || null,
      };
      if (formPlanIsInternal && form.expires_at) {
        payload.expires_at = form.expires_at;
      }

      let persistedId: string | null = null;
      if (editingId) {
        const res = await fetch("/api/admin/update-licensee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Falha ao salvar");
        // Update stores
        for (const fs of formStores) {
          if (fs.name.trim()) {
            const existing = (storesByLic[editingId] ?? []).find((s) => s.name === fs.name);
            if (!existing) {
              await supabase.from("stores").insert({ licensee_id: editingId, name: fs.name.trim(), ig_user_id: fs.ig_user_id.trim() || null });
            }
          }
        }
        persistedId = editingId;
      } else {
        const { data, error } = await supabase.from("licensees").insert(payload).select("id").single();
        if (error) { setModalError(error.message.includes("duplicate") ? "Email já cadastrado." : error.message); return; }
        if (data) {
          persistedId = (data as { id: string }).id;
          for (const fs of formStores) {
            if (fs.name.trim()) {
              await supabase.from("stores").insert({ licensee_id: persistedId, name: fs.name.trim(), ig_user_id: fs.ig_user_id.trim() || null });
            }
          }
        }
      }
      // Salva overrides de features
      if (persistedId) {
        try {
          await saveLicenseeOverrides(supabase, persistedId, featureOverrides);
        } catch (err) {
          setModalError(`Erro ao salvar features: ${err instanceof Error ? err.message : "desconhecido"}`);
          return;
        }
      } else {
        // sem persistedId — overrides não salvas
      }
      setModalOpen(false); await loadData();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  }

  async function resetPassword() {
    if (!editingId || !newPassword || newPassword.length < 6) {
      setPasswordMsg("Mínimo 6 caracteres");
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg("");
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licensee_id: editingId, password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg("\u2705 Senha alterada com sucesso");
        setNewPassword("");
      } else {
        setPasswordMsg(`\u274C ${data.error || "Erro ao alterar senha"}`);
      }
    } catch {
      setPasswordMsg("\u274C Erro de conexão");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function toggleStatus(id: string, current: string) {
    await supabase.from("licensees").update({ status: current === "active" ? "inactive" : "active" }).eq("id", id);
    await loadData();
  }

  async function deleteClient(id: string) {
    await supabase.from("licensees").delete().eq("id", id);
    setDeleteId(null); await loadData();
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "aurohubv2/logos");
      setForm((prev) => ({ ...prev, logo_url: url }));
    } catch (err) {
      console.error("[Logo upload]", err);
      setModalError("Falha no upload — cole a URL manualmente.");
    } finally { setUploading(false); }
  }

  function addStoreRow() { setFormStores([...formStores, { name: "", ig_user_id: "" }]); }
  function removeStoreRow(i: number) { setFormStores(formStores.filter((_, idx) => idx !== i)); }
  function updateStoreRow(i: number, field: string, val: string) { setFormStores(formStores.map((s, idx) => idx === i ? { ...s, [field]: val } : s)); }

  /* ── Wizard de onboarding ──────────────────────── */

  function genPassword(): string {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function openWizard() {
    setWizardStep(1);
    setWizardError("");
    setWizardResult(null);
    setWizardData({
      agency: { name: "", email: "", segment_id: "", plan: "basic", city: "", expires_at: "" },
      stores: [{ name: "", city: "", instagram: "" }],
      user: { name: "", email: "", password: genPassword() },
    });
    setWizardOpen(true);
  }

  function addWizStore() {
    setWizardData((d) => ({ ...d, stores: [...d.stores, { name: "", city: "", instagram: "" }] }));
  }
  function removeWizStore(i: number) {
    setWizardData((d) => ({ ...d, stores: d.stores.filter((_, idx) => idx !== i) }));
  }
  function updateWizStore(i: number, field: "name" | "city" | "instagram", val: string) {
    setWizardData((d) => ({ ...d, stores: d.stores.map((s, idx) => idx === i ? { ...s, [field]: val } : s) }));
  }

  function wizardNext() {
    setWizardError("");
    if (wizardStep === 1) {
      if (!wizardData.agency.name.trim()) { setWizardError("Nome da agência obrigatório"); return; }
      if (!wizardData.agency.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wizardData.agency.email)) {
        setWizardError("Email inválido"); return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      const valid = wizardData.stores.filter((s) => s.name.trim());
      if (valid.length === 0) { setWizardError("Adicione pelo menos uma unidade"); return; }
      setWizardData((d) => ({
        ...d,
        user: { ...d.user, email: d.agency.email, name: d.user.name || d.agency.name },
      }));
      setWizardStep(3);
    }
  }

  function wizardBack() {
    setWizardError("");
    if (wizardStep > 1 && wizardStep < 4) setWizardStep((wizardStep - 1) as 1 | 2 | 3);
  }

  async function handleWizardConfirm() {
    if (!wizardData.user.name.trim() || !wizardData.user.email.trim() || !wizardData.user.password) {
      setWizardError("Preencha todos os campos do usuário"); return;
    }
    if (wizardData.user.password.length < 6) { setWizardError("Senha mínima de 6 caracteres"); return; }

    setWizardSaving(true); setWizardError("");
    try {
      // 1. Criar licensee
      const selectedPlanObj = plans.find((p) => p.slug === wizardData.agency.plan);
      const isInternalPlan = !!selectedPlanObj?.is_internal;
      const licPayload: Record<string, unknown> = {
        name: wizardData.agency.name.trim(),
        email: wizardData.agency.email.trim().toLowerCase(),
        plan: wizardData.agency.plan,
        segment_id: wizardData.agency.segment_id || null,
        status: "active",
      };
      if (isInternalPlan && wizardData.agency.expires_at) {
        licPayload.expires_at = wizardData.agency.expires_at;
      }
      const { data: lic, error: licErr } = await supabase.from("licensees").insert(licPayload).select("id").single();
      if (licErr || !lic) throw new Error(licErr?.message.includes("duplicate") ? "Email já cadastrado" : (licErr?.message || "Erro ao criar licensee"));
      const licenseeId = (lic as { id: string }).id;

      // 2. Criar stores (best-effort com city)
      const validStores = wizardData.stores.filter((s) => s.name.trim());
      for (const s of validStores) {
        const basePayload = {
          licensee_id: licenseeId,
          name: s.name.trim(),
          ig_user_id: s.instagram.trim() || null,
        };
        const withCity = { ...basePayload, city: s.city.trim() || null };
        const tryFull = await supabase.from("stores").insert(withCity);
        if (tryFull.error) {
          const fb = await supabase.from("stores").insert(basePayload);
          if (fb.error) throw new Error(`Erro ao criar loja ${s.name}: ${fb.error.message}`);
        }
      }

      // 3. Criar usuário via API admin
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: wizardData.user.email.trim().toLowerCase(),
          password: wizardData.user.password,
          profile: {
            name: wizardData.user.name.trim(),
            role: "cliente",
            status: "active",
            licensee_id: licenseeId,
            store_id: null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar usuário");

      setWizardResult({
        licenseeName: wizardData.agency.name,
        email: wizardData.user.email,
        password: wizardData.user.password,
        storesCount: validStores.length,
      });
      setWizardStep(4);
      await loadData();
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : "Erro ao confirmar");
    } finally {
      setWizardSaving(false);
    }
  }

  const viewStores = viewStoresId ? storesByLic[viewStoresId] ?? [] : [];
  const viewName = viewStoresId ? licensees.find((l) => l.id === viewStoresId)?.name ?? "" : "";

  /* ── Render ────────────────────────────────────── */

  return (
    <>
      {/* ── KPIs ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-6">
        <KI label="Total" value={String(kpis.total)} />
        <KI label="Ativos" value={String(kpis.active)} accent />
        <KI label="Com plano" value={String(kpis.withPlan)} />
        <KI label="Sem plano" value={String(kpis.noPlan)} />
        <KI label="MRR" value={`R$${kpis.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} accent />
      </div>

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Clientes</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Gerencie licenciados, lojas e permissões</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openNew} className="flex h-9 items-center rounded-lg border border-[var(--bdr2)] px-3 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)]">
            Entrada rápida
          </button>
          <button onClick={openWizard} className="flex h-9 items-center gap-2 rounded-lg bg-[var(--txt)] px-4 text-[12px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Novo cliente
          </button>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--txt3)]"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="text" placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent pl-9 pr-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
        </div>
        <select value={segFilter} onChange={(e) => setSegFilter(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Segmento</option>
          {segments.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] outline-none">
          <option value="">Plano</option>
          {Object.entries(PLAN_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex gap-0.5 rounded-lg border border-[var(--bdr)] p-0.5">
          {([{ key: "" as TabFilter, l: "Todos" }, { key: "active" as TabFilter, l: "Ativos" }, { key: "inactive" as TabFilter, l: "Inativos" }]).map((t) => (
            <button key={t.key} onClick={() => setStatusFilter(t.key)} className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${statusFilter === t.key ? "bg-[var(--bg3)] text-[var(--txt)]" : "text-[var(--txt3)]"}`}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* ── Table ────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
        {loading ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Carregando...</div>
        : filtered.length === 0 ? <div className="py-16 text-center text-[13px] text-[var(--txt3)]">Nenhum cliente encontrado</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--bdr)]">
                  {["Cliente", "Segmento", "Plano", "Lojas", "Usuários", "Status", "Criado em", "Ações"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium text-[var(--txt3)] first:pl-5 last:pr-5 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const seg = l.segment_id ? segMap[l.segment_id] : null;
                  const pc = PLAN_COLORS[l.plan];
                  const planData = planMap[l.plan];
                  const isInternal = !!planData?.is_internal;
                  const storeCount = storesByLic[l.id]?.length ?? 0;
                  const userCount = usersByLic[l.id] ?? 0;
                  const isActive = l.status === "active";

                  return (
                    <tr key={l.id} className="border-b border-[var(--bdr)] last:border-b-0 hover:bg-[var(--hover-bg)]">
                      <td className="whitespace-nowrap pl-5 pr-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {l.logo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={l.logo_url} alt="" className="h-7 w-7 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg3)] text-[11px] font-semibold text-[var(--txt2)]">{l.name.charAt(0).toUpperCase()}</div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium text-[var(--txt)]">{l.name}</span>
                              {isInternal && (
                                <span className="shrink-0 rounded-full bg-[var(--purple3)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--purple)]">
                                  🔒 Interno
                                </span>
                              )}
                            </div>
                            <div className="truncate text-[11px] text-[var(--txt3)]">{l.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[var(--txt3)]">{seg ? `${seg.icon ?? ""} ${seg.name}` : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">{pc ? <span className="text-[12px] font-medium" style={{ color: pc.color }}>{pc.label}</span> : <span className="text-[var(--txt3)]">—</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--txt2)]">{storeCount}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--txt2)]">{userCount}</td>
                      <td className="whitespace-nowrap px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-[12px] ${isActive ? "text-[var(--green)]" : "text-[var(--red)]"}`}><span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[var(--green)]" : "bg-[var(--red)]"}`} />{isActive ? "Ativo" : "Inativo"}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[var(--txt3)]">{new Date(l.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</td>
                      <td className="whitespace-nowrap pr-5 pl-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(l)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">Editar</button>
                          <button onClick={() => setViewStoresId(l.id)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">Lojas</button>
                          <button onClick={() => toggleStatus(l.id, l.status)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--txt)]">{isActive ? "Desativar" : "Ativar"}</button>
                          <button onClick={() => setDeleteId(l.id)} className="text-[12px] text-[var(--txt3)] hover:text-[var(--red)]">Excluir</button>
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
        <Overlay onClose={() => setDeleteId(null)}>
          <div className="mx-4 w-full max-w-[360px] rounded-2xl border border-[var(--bdr)] p-6" style={{ background: "var(--card-bg)" }}>
            <div className="mb-4 text-center">
              <div className="text-[15px] font-bold text-[var(--txt)]">Excluir cliente?</div>
              <div className="mt-1 text-[13px] text-[var(--txt3)]">Lojas e dados vinculados serão removidos.</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-lg py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)]">Cancelar</button>
              <button onClick={() => deleteClient(deleteId)} className="flex-1 rounded-lg bg-[var(--red)] py-2 text-[13px] font-semibold text-white">Excluir</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── View stores modal ────────────────────── */}
      {viewStoresId && (
        <Overlay onClose={() => setViewStoresId(null)}>
          <div className="mx-4 w-full max-w-[500px] rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--txt)]">Lojas</h2>
                <p className="mt-0.5 text-[12px] text-[var(--txt3)]">{viewName}</p>
              </div>
              <button onClick={() => setViewStoresId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="px-6 py-4">
              {viewStores.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[var(--txt3)]">Nenhuma loja cadastrada</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {viewStores.map((s) => {
                    const storeUsers = profiles.filter((p) => p.store_id === s.id).length;
                    return (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-4 py-3">
                        <div>
                          <div className="text-[13px] font-medium text-[var(--txt)]">{s.name}</div>
                          <div className="text-[11px] text-[var(--txt3)]">{s.ig_user_id ? `IG: ${s.ig_user_id}` : "Sem Instagram"}</div>
                        </div>
                        <div className="text-right text-[11px] text-[var(--txt3)]">
                          {storeUsers} usuário{storeUsers !== 1 ? "s" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {/* ── Create/Edit modal ────────────────────── */}
      {modalOpen && (
        <Overlay onClose={() => setModalOpen(false)}>
          <div className="mx-4 flex w-full max-w-[560px] max-h-[90vh] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <h2 className="text-[16px] font-bold text-[var(--txt)]">{editingId ? "Editar cliente" : "Novo cliente"}</h2>
              <button onClick={() => setModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--bdr)] px-6">
              {(["dados", "tema", "plano", "lojas", "features", "senha"] as ModalTab[]).map((t) => (
                <button key={t} onClick={() => setModalTab(t)} className={`border-b-2 px-4 py-2.5 text-[12px] font-medium transition-colors ${modalTab === t ? "border-[var(--txt)] text-[var(--txt)]" : "border-transparent text-[var(--txt3)] hover:text-[var(--txt2)]"}`}>
                  {t === "dados" ? "Dados" : t === "tema" ? "Tema" : t === "plano" ? "Plano" : t === "lojas" ? "Lojas" : t === "features" ? "Features" : "Senha"}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {modalTab === "dados" && (
                <div className="flex flex-col gap-4">
                  {/* Logo */}
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Logo da marca</label>
                    <div className="flex items-center gap-4">
                      {form.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={form.logo_url} alt="Logo" className="h-14 w-14 shrink-0 rounded-xl object-cover border border-[var(--bdr)]" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--bg3)] text-[18px] font-bold text-[var(--txt2)]">
                          {(form.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading} className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                          {uploading ? "Enviando..." : "Upload logo"}
                        </button>
                        <input type="text" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="ou cole URL da imagem" className="h-7 w-full rounded border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none" />
                        {form.logo_url && <button type="button" onClick={() => setForm({ ...form, logo_url: "" })} className="text-[11px] text-[var(--red)] hover:underline">Remover logo</button>}
                      </div>
                    </div>
                  </div>
                  {/* Splash Screen */}
                  <div className="border-t border-[var(--bdr)] pt-4 mt-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)] mb-3">Splash Screen</label>

                    {/* Mini preview */}
                    <div className="mb-3 flex justify-center">
                      <div className="rounded-lg overflow-hidden border border-[var(--bdr)]" style={{ width: 200, height: 120 }}>
                        <SplashScreen
                          key={`${form.splash_effect}-${form.cor_primaria}-${form.cor_secundaria}-${form.cor_acento}-${form.cor_fundo}-${form.cor4}-${form.cor5}-${form.splash_velocidade}-${form.splash_suavidade}`}
                          logoUrl=""
                          effect={(form.splash_effect as SplashEffect) || "random"}
                          cor1={form.cor_primaria || "#FF7A1A"}
                          cor2={form.cor_secundaria || "#D4A843"}
                          cor3={form.cor_acento || "#1E3A6E"}
                          cor4={form.cor4 || undefined}
                          cor5={form.cor5 || undefined}
                          corFundo={form.cor_fundo || "#0E1520"}
                          velocidade={form.splash_velocidade ?? 5}
                          suavidade={form.splash_suavidade ?? 7}
                          embedded={{ width: 200, height: 120 }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-[var(--txt3)] mb-1">Efeito</label>
                        <select value={form.splash_effect || "random"} onChange={e => setForm(f => ({...f, splash_effect: e.target.value}))} className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-2 text-[11px] text-[var(--txt)] focus:outline-none focus:border-[#D4A843]">
                          <option value="random">🎲 Aleatório</option>
                          <option value="particles">Partículas</option>
                          <option value="cinematic">Cinemático</option>
                          <option value="slideup">Slide Up</option>
                          <option value="scalefade">Scale Fade</option>
                          <option value="fadesuave">Fade Suave</option>
                          <option value="ondas">Ondas</option>
                          <option value="flutuacao">Flutuação</option>
                          <option value="scanner">Scanner</option>
                          <option value="holofote">Holofote</option>
                          <option value="chuvapontos">Chuva de Pontos</option>
                          <option value="gradiente">Gradiente</option>
                          <option value="dissolve">Dissolve</option>
                          <option value="bigbang">Big Bang</option>
                          <option value="aurora">Aurora Boreal</option>
                          <option value="tinta">Tinta</option>
                          <option value="vagalumes">Vagalumes</option>
                          <option value="aurora_espacial">Aurora Espacial</option>
                          <option value="galaxia">🌀 Galáxia</option>
                          <option value="vidro_janela">🪟 Vidro Janela</option>
                          <option value="vidro_liquido">💧 Vidro Líquido</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--txt3)] mb-1">Logo</label>
                        <select value={form.splash_logo_orientation || "horizontal"} onChange={e => setForm(f => ({...f, splash_logo_orientation: e.target.value}))} className="h-8 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-2 text-[11px] text-[var(--txt)] focus:outline-none focus:border-[#D4A843]">
                          <option value="horizontal">↔ Horizontal</option>
                          <option value="vertical">↕ Vertical</option>
                          <option value="quadrado">□ Quadrado</option>
                        </select>
                      </div>
                    </div>

                    {/* Sliders velocidade e suavidade */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--txt3)]">
                          <span>Velocidade</span>
                          <span className="font-mono text-[var(--txt2)]">{form.splash_velocidade ?? 5}</span>
                        </div>
                        <input type="range" min="1" max="10" step="1"
                          value={form.splash_velocidade ?? 5}
                          onChange={e => setForm(f => ({...f, splash_velocidade: parseInt(e.target.value)}))}
                          className="w-full accent-[var(--orange)]" />
                        <div className="flex justify-between text-[9px] text-[var(--txt3)] mt-0.5">
                          <span>lento</span><span>rápido</span>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--txt3)]">
                          <span>Suavidade</span>
                          <span className="font-mono text-[var(--txt2)]">{form.splash_suavidade ?? 7}</span>
                        </div>
                        <input type="range" min="1" max="10" step="1"
                          value={form.splash_suavidade ?? 7}
                          onChange={e => setForm(f => ({...f, splash_suavidade: parseInt(e.target.value)}))}
                          className="w-full accent-[var(--orange)]" />
                        <div className="flex justify-between text-[9px] text-[var(--txt3)] mt-0.5">
                          <span>intenso</span><span>suave</span>
                        </div>
                      </div>
                    </div>

                    {/* Som do splash */}
                    <div className="mt-3">
                      <label className="block text-[10px] text-[var(--txt3)] mb-1">Som do splash</label>
                      <input ref={somFileRef} type="file" accept="audio/*" onChange={handleSomUpload} className="hidden" />
                      {form.splash_som_url ? (
                        <div className="flex items-center gap-2">
                          <audio src={form.splash_som_url} controls className="h-8 flex-1" style={{ maxWidth: "100%" }} />
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, splash_som_url: "", splash_som_public_id: "" }))}
                            className="shrink-0 rounded-lg border border-[var(--bdr)] px-2 py-1 text-[10px] text-[var(--red)] hover:bg-[var(--red3)]"
                          >
                            Remover
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => somFileRef.current?.click()}
                          disabled={uploadingSom}
                          className="h-8 rounded-lg border border-[var(--bdr)] px-3 text-[10px] text-[var(--txt2)] hover:bg-[var(--hover-bg)] disabled:opacity-40"
                        >
                          {uploadingSom ? "Enviando..." : "🎵 Upload som"}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {[
                        {key:"cor_primaria", label:"Cor primária"},
                        {key:"cor_secundaria", label:"Cor secundária"},
                        {key:"cor_acento", label:"Cor acento"},
                        {key:"cor_fundo", label:"Cor fundo"},
                        {key:"cor4", label:"Cor 4 (opcional)"},
                        {key:"cor5", label:"Cor 5 (opcional)"},
                      ].map(({key, label}) => (
                        <div key={key} className="flex items-center gap-2">
                          <input type="color" value={String((form as Record<string,unknown>)[key] || "") || "#000000"} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} className="h-7 w-10 rounded cursor-pointer border border-[var(--bdr)]" />
                          <label className="text-[10px] text-[var(--txt3)]">{label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Field label="Nome da empresa" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Agência Viaje Bem" />
                  <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="contato@agencia.com.br" type="email" />
                  <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(17) 99999-0000" />
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Segmento</label>
                    <select value={form.segment_id} onChange={(e) => setForm({ ...form, segment_id: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--txt3)]">
                      <option value="">Nenhum</option>
                      {segments.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {modalTab === "tema" && (() => {
                const hex2hsl = (hex: string) => {
                  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
                  const max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2;
                  let h = 0, s = 0;
                  if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
                    if (max === r) h = ((g-b)/d + (g<b?6:0))/6;
                    else if (max === g) h = ((b-r)/d+2)/6;
                    else h = ((r-g)/d+4)/6;
                  }
                  return [Math.round(h*360), Math.round(s*100), Math.round(l*100)] as const;
                };
                const hsl2hex = (h: number, s: number, l: number) => {
                  const _h = h/360, _s = s/100, _l = l/100;
                  const hue2rgb = (p: number, q: number, t: number) => { if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p; };
                  let r, g, b2;
                  if (_s === 0) { r = g = b2 = _l; } else {
                    const q = _l<0.5?_l*(1+_s):_l+_s-_l*_s, p = 2*_l-q;
                    r = hue2rgb(p,q,_h+1/3); g = hue2rgb(p,q,_h); b2 = hue2rgb(p,q,_h-1/3);
                  }
                  return `#${[r,g,b2].map(v=>Math.round(v*255).toString(16).padStart(2,"0")).join("")}`;
                };
                const generateFromPrimary = (primary: string) => {
                  const [h, s] = hex2hsl(primary);
                  return {
                    cor_primaria: primary,
                    cor_secundaria: hsl2hex(h, Math.min(100, s + 10), 55),
                    tema_fundo_escuro: hsl2hex(h, Math.min(40, s), 8),
                    tema_fundo_claro: hsl2hex(h, Math.max(10, s - 30), 97),
                    tema_texto_escuro: hsl2hex(h, Math.min(20, s), 15),
                    tema_texto_claro: hsl2hex(h, Math.min(15, s), 93),
                  };
                };
                const suggestTheme = () => {
                  const generated = generateFromPrimary(form.cor_primaria || "#009FE3");
                  setForm(f => ({ ...f, ...generated }));
                };
                const extractFromLogo = async () => {
                  if (!form.logo_url) { setModalError("Nenhum logo cadastrado."); return; }
                  setExtracting(true); setModalError("");
                  try {
                    const res = await fetch("/api/admin/extract-colors", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ logoUrl: form.logo_url }),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.colors?.length) throw new Error(data.error || "Nenhuma cor encontrada");
                    const primary = data.colors[0];
                    const generated = generateFromPrimary(primary);
                    if (data.colors[1]) generated.cor_secundaria = data.colors[1];
                    setForm(f => ({ ...f, ...generated }));
                  } catch (err) {
                    setModalError(err instanceof Error ? err.message : "Erro ao extrair cores");
                  } finally { setExtracting(false); }
                };
                const p = {
                  accent: form.cor_primaria || "#009FE3",
                  accent2: form.cor_secundaria || "#D4A843",
                  bgDark: form.tema_fundo_escuro || "#0A1020",
                  bgLight: form.tema_fundo_claro || "#ffffff",
                  txtDark: form.tema_texto_escuro || "#0f172a",
                  txtLight: form.tema_texto_claro || "#EEF2FF",
                };
                return (
                <div className="flex flex-col gap-5">
                  <p className="text-[11px] text-[var(--txt3)]">Cores da marca aplicadas no painel do cliente/vendedor.</p>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "cor_primaria", label: "Cor Principal (accent)" },
                      { key: "cor_secundaria", label: "Cor Secundária" },
                      { key: "tema_fundo_escuro", label: "Fundo (tema escuro)" },
                      { key: "tema_fundo_claro", label: "Fundo (tema claro)" },
                      { key: "tema_texto_escuro", label: "Texto (tema escuro)" },
                      { key: "tema_texto_claro", label: "Texto (tema claro)" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <input type="color" value={String((form as Record<string, unknown>)[key] || "") || "#000000"} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="h-8 w-12 rounded cursor-pointer border border-[var(--bdr)]" />
                        <label className="text-[11px] text-[var(--txt2)]">{label}</label>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={suggestTheme} className="rounded-lg border border-[var(--bdr)] px-4 py-2 text-[11px] font-medium text-[var(--txt2)] hover:bg-[var(--hover-bg)] transition-colors">
                      Sugerir tema
                    </button>
                    <button type="button" onClick={extractFromLogo} disabled={extracting || !form.logo_url} className="rounded-lg border border-[var(--bdr)] px-4 py-2 text-[11px] font-medium text-[var(--txt2)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {extracting ? "Extraindo..." : "Extrair cores do logo"}
                    </button>
                  </div>

                  {/* Preview */}
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {/* Dark preview */}
                    <div className="rounded-xl overflow-hidden border border-[var(--bdr)]" style={{ background: p.bgDark }}>
                      <div className="text-[9px] font-semibold px-2 py-1 text-center" style={{ background: `${p.bgDark}ee`, color: p.txtLight, borderBottom: `1px solid ${p.accent}33` }}>Escuro</div>
                      <div className="flex h-[100px]">
                        <div className="w-[52px] shrink-0 flex flex-col gap-1.5 p-1.5" style={{ background: `${p.bgDark}ee`, borderRight: `1px solid ${p.accent}22` }}>
                          <div className="h-1.5 rounded-full" style={{ background: p.accent, width: "80%" }} />
                          <div className="h-1.5 rounded-full" style={{ background: `${p.txtLight}33`, width: "60%" }} />
                          <div className="h-1.5 rounded-full" style={{ background: `${p.txtLight}33`, width: "70%" }} />
                          <div className="mt-auto h-4 w-4 rounded-full mx-auto" style={{ background: p.accent2, opacity: 0.6 }} />
                        </div>
                        <div className="flex-1 p-2 flex flex-col gap-1.5">
                          <div className="text-[8px] font-bold" style={{ color: p.txtLight }}>Dashboard</div>
                          <div className="flex-1 rounded-md p-1.5" style={{ background: `${p.txtLight}08`, border: `1px solid ${p.txtLight}11` }}>
                            <div className="h-1 rounded-full mb-1" style={{ background: p.txtLight, width: "50%", opacity: 0.7 }} />
                            <div className="h-1 rounded-full" style={{ background: p.txtLight, width: "35%", opacity: 0.3 }} />
                          </div>
                          <div className="h-5 rounded-md flex items-center justify-center text-[7px] font-semibold" style={{ background: p.accent, color: "#fff" }}>Publicar</div>
                        </div>
                      </div>
                    </div>
                    {/* Light preview */}
                    <div className="rounded-xl overflow-hidden border border-[var(--bdr)]" style={{ background: p.bgLight }}>
                      <div className="text-[9px] font-semibold px-2 py-1 text-center" style={{ background: p.bgLight, color: p.txtDark, borderBottom: `1px solid ${p.accent}33` }}>Claro</div>
                      <div className="flex h-[100px]">
                        <div className="w-[52px] shrink-0 flex flex-col gap-1.5 p-1.5" style={{ background: p.bgLight, borderRight: `1px solid ${p.accent}22` }}>
                          <div className="h-1.5 rounded-full" style={{ background: p.accent, width: "80%" }} />
                          <div className="h-1.5 rounded-full" style={{ background: `${p.txtDark}22`, width: "60%" }} />
                          <div className="h-1.5 rounded-full" style={{ background: `${p.txtDark}22`, width: "70%" }} />
                          <div className="mt-auto h-4 w-4 rounded-full mx-auto" style={{ background: p.accent2, opacity: 0.6 }} />
                        </div>
                        <div className="flex-1 p-2 flex flex-col gap-1.5">
                          <div className="text-[8px] font-bold" style={{ color: p.txtDark }}>Dashboard</div>
                          <div className="flex-1 rounded-md p-1.5" style={{ background: `${p.txtDark}06`, border: `1px solid ${p.txtDark}11` }}>
                            <div className="h-1 rounded-full mb-1" style={{ background: p.txtDark, width: "50%", opacity: 0.7 }} />
                            <div className="h-1 rounded-full" style={{ background: p.txtDark, width: "35%", opacity: 0.3 }} />
                          </div>
                          <div className="h-5 rounded-md flex items-center justify-center text-[7px] font-semibold" style={{ background: p.accent, color: "#fff" }}>Publicar</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })()}

              {modalTab === "plano" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Plano</label>
                    <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--txt3)]">
                      {plans.filter((p) => p.is_internal).length > 0 && (
                        <optgroup label="— Uso interno —">
                          {plans.filter((p) => p.is_internal).map((p) => (
                            <option key={p.slug} value={p.slug}>🔒 {p.name}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Planos comerciais">
                        {plans.filter((p) => !p.is_internal).map((p) => (
                          <option key={p.slug} value={p.slug}>{p.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  {form.plan && planMap[form.plan] && !planMap[form.plan].is_internal && (
                    <div className="rounded-lg border border-[var(--bdr)] p-4 text-[12px]">
                      <div className="mb-1 font-medium text-[var(--txt)]">{PLAN_COLORS[form.plan]?.label || planMap[form.plan].name}</div>
                      <div className="text-[var(--txt3)]">R${planMap[form.plan].price_monthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês</div>
                    </div>
                  )}
                  {planMap[form.plan]?.is_internal ? (
                    <div className="rounded-lg border border-[var(--purple)] bg-[var(--purple3)] p-3">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-[var(--purple)]">
                        🔒 CONTA INTERNA
                      </div>
                      <div className="mb-2 text-[11px] text-[var(--txt3)]">Sem cobrança. Defina quando expira manualmente.</div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Vencimento</label>
                      <input
                        type="date"
                        value={form.expires_at}
                        onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                        className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--txt3)]"
                      />
                    </div>
                  ) : (
                    <>
                      <Field label="Implantação (R$)" value={form.price_setup} onChange={(v) => setForm({ ...form, price_setup: v })} type="number" />
                      <Field label="Fidelidade (meses)" value={form.min_months} onChange={(v) => setForm({ ...form, min_months: v })} type="number" />
                    </>
                  )}
                </div>
              )}

              {modalTab === "features" && (
                <FeaturesPanel
                  planSlug={form.plan}
                  plans={plans}
                  overrides={featureOverrides}
                  onChange={setFeatureOverrides}
                />
              )}

              {modalTab === "lojas" && (
                <div className="flex flex-col gap-3">
                  {formStores.map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <input type="text" value={s.name} onChange={(e) => updateStoreRow(i, "name", e.target.value)} placeholder="Nome da loja" className="h-9 min-w-0 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
                      <input type="text" value={s.ig_user_id} onChange={(e) => updateStoreRow(i, "ig_user_id", e.target.value)} placeholder="Instagram ID" className="h-9 min-w-0 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
                      {formStores.length > 1 && (
                        <button onClick={() => removeStoreRow(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--txt3)] hover:text-[var(--red)]">
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addStoreRow} className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--txt3)] hover:text-[var(--txt)]">
                    <svg viewBox="0 0 16 16" className="h-3 w-3"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    Adicionar loja
                  </button>
                </div>
              )}

              {modalTab === "senha" && (
                <div className="flex flex-col gap-4">
                  <p className="text-[12px] text-[var(--txt3)]">
                    Altera a senha de acesso do cliente ao sistema.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)] mb-1">Nova senha</label>
                    <div className="flex gap-2">
                      <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="h-9 flex-1 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] focus:outline-none focus:border-[#D4A843]" />
                      <button onClick={() => setNewPassword(Math.random().toString(36).slice(2,10))} className="h-9 px-3 rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] text-[11px] text-[var(--txt2)] hover:bg-[var(--bg1)]">🎲 Gerar</button>
                    </div>
                  </div>
                  {passwordMsg && (
                    <p className="text-[11px]" style={{color: passwordMsg.includes("\u2705") ? "var(--green)" : "var(--red)"}}>{passwordMsg}</p>
                  )}
                  <button onClick={resetPassword} disabled={passwordSaving || !newPassword} className="h-9 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50" style={{background: "linear-gradient(135deg, var(--orange), #D4A843)"}}>
                    {passwordSaving ? "Salvando..." : "Alterar senha"}
                  </button>
                </div>
              )}

              {modalError && <div className="mt-4 rounded-lg bg-[var(--red3)] px-3 py-2 text-center text-[12px] font-medium text-[var(--red)]">{modalError}</div>}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4 shrink-0">
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)]">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)] disabled:opacity-60">{saving ? "Salvando..." : editingId ? "Salvar" : "Criar cliente"}</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── Wizard de onboarding ─────────────────── */}
      {wizardOpen && (
        <Overlay onClose={() => !wizardSaving && setWizardOpen(false)}>
          <div className="mx-4 flex w-full max-w-[640px] max-h-[92vh] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--bdr)] px-6 py-5 shrink-0">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--txt)]">
                  {wizardStep === 4 ? "Cliente criado!" : "Onboarding de novo cliente"}
                </h2>
                {wizardStep < 4 && (
                  <p className="mt-0.5 text-[12px] text-[var(--txt3)]">Etapa {wizardStep} de 3</p>
                )}
              </div>
              <button onClick={() => !wizardSaving && setWizardOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)] hover:text-[var(--txt)]">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            {/* Progress bar */}
            {wizardStep < 4 && (
              <div className="flex gap-1.5 px-6 pt-4 shrink-0">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{ background: s <= wizardStep ? "var(--orange)" : "var(--bdr)" }}
                  />
                ))}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* ── ETAPA 1 ─────────────────── */}
              {wizardStep === 1 && (
                <div className="flex flex-col gap-4">
                  <Field
                    label="Nome da agência"
                    value={wizardData.agency.name}
                    onChange={(v) => setWizardData((d) => ({ ...d, agency: { ...d.agency, name: v } }))}
                    placeholder="Agência Viaje Bem"
                  />
                  <Field
                    label="Email do responsável"
                    value={wizardData.agency.email}
                    onChange={(v) => setWizardData((d) => ({ ...d, agency: { ...d.agency, email: v } }))}
                    placeholder="contato@agencia.com.br"
                    type="email"
                  />
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Segmento</label>
                    <select
                      value={wizardData.agency.segment_id}
                      onChange={(e) => setWizardData((d) => ({ ...d, agency: { ...d.agency, segment_id: e.target.value } }))}
                      className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--txt3)]"
                    >
                      <option value="">Selecione...</option>
                      {segments.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Plano</label>
                    <select
                      value={wizardData.agency.plan}
                      onChange={(e) => setWizardData((d) => ({ ...d, agency: { ...d.agency, plan: e.target.value } }))}
                      className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--txt3)]"
                    >
                      {plans.filter((p) => p.is_internal).length > 0 && (
                        <optgroup label="— Uso interno —">
                          {plans.filter((p) => p.is_internal).map((p) => (
                            <option key={p.slug} value={p.slug}>🔒 {p.name}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Planos comerciais">
                        {plans.filter((p) => !p.is_internal).map((p) => (
                          <option key={p.slug} value={p.slug}>
                            {p.name} — R${p.price_monthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <Field
                    label="Cidade principal"
                    value={wizardData.agency.city}
                    onChange={(v) => setWizardData((d) => ({ ...d, agency: { ...d.agency, city: v } }))}
                    placeholder="São José do Rio Preto"
                  />
                  {/* Vencimento manual só para planos internos */}
                  {plans.find((p) => p.slug === wizardData.agency.plan)?.is_internal && (
                    <div className="rounded-lg border border-[var(--purple)] bg-[var(--purple3)] p-3">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-[var(--purple)]">
                        <span>🔒 CONTA INTERNA</span>
                      </div>
                      <div className="mb-2 text-[11px] text-[var(--txt3)]">Sem cobrança. Defina quando expira manualmente.</div>
                      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Vencimento</label>
                      <input
                        type="date"
                        value={wizardData.agency.expires_at}
                        onChange={(e) => setWizardData((d) => ({ ...d, agency: { ...d.agency, expires_at: e.target.value } }))}
                        className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--txt3)]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── ETAPA 2 ─────────────────── */}
              {wizardStep === 2 && (
                <div className="flex flex-col gap-3">
                  <div className="text-[11px] text-[var(--txt3)]">Mínimo 1 unidade. A primeira não pode ser removida.</div>
                  {wizardData.stores.map((s, i) => (
                    <div key={i} className="rounded-lg border border-[var(--bdr)] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[var(--txt3)]">Unidade {i + 1}</span>
                        {i > 0 && (
                          <button onClick={() => removeWizStore(i)} className="text-[11px] text-[var(--red)] hover:underline">Remover</button>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <input
                          type="text" value={s.name}
                          onChange={(e) => updateWizStore(i, "name", e.target.value)}
                          placeholder="Nome da unidade"
                          className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text" value={s.city}
                            onChange={(e) => updateWizStore(i, "city", e.target.value)}
                            placeholder="Cidade"
                            className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]"
                          />
                          <input
                            type="text" value={s.instagram}
                            onChange={(e) => updateWizStore(i, "instagram", e.target.value)}
                            placeholder="@instagram"
                            className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addWizStore} className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--orange)] hover:underline">
                    <svg viewBox="0 0 16 16" className="h-3 w-3"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    Adicionar unidade
                  </button>
                </div>
              )}

              {/* ── ETAPA 3 ─────────────────── */}
              {wizardStep === 3 && (
                <div className="flex flex-col gap-4">
                  <Field
                    label="Nome do responsável"
                    value={wizardData.user.name}
                    onChange={(v) => setWizardData((d) => ({ ...d, user: { ...d.user, name: v } }))}
                    placeholder="João Silva"
                  />
                  <Field
                    label="Email"
                    value={wizardData.user.email}
                    onChange={(v) => setWizardData((d) => ({ ...d, user: { ...d.user, email: v } }))}
                    type="email"
                  />
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-[11px] font-medium text-[var(--txt3)]">Senha (gerada)</label>
                      <button
                        type="button"
                        onClick={() => setWizardData((d) => ({ ...d, user: { ...d.user, password: genPassword() } }))}
                        className="text-[11px] font-semibold text-[var(--orange)] hover:underline"
                      >
                        Gerar nova
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text" value={wizardData.user.password}
                        onChange={(e) => setWizardData((d) => ({ ...d, user: { ...d.user, password: e.target.value } }))}
                        className="h-9 flex-1 rounded-lg border border-[var(--bdr)] bg-transparent px-3 font-mono text-[13px] text-[var(--txt)] outline-none focus:border-[var(--txt3)]"
                      />
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(wizardData.user.password)}
                        className="rounded-lg border border-[var(--bdr)] px-3 text-[11px] font-medium text-[var(--txt2)] hover:text-[var(--txt)]"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">Nível</label>
                    <div className="flex h-9 items-center rounded-lg border border-[var(--bdr)] px-3 text-[13px] text-[var(--txt)]">Cliente</div>
                  </div>
                </div>
              )}

              {/* ── ETAPA 4 — Sucesso ──────── */}
              {wizardStep === 4 && wizardResult && (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--green3)] text-[var(--green)]">
                    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <div className="font-[family-name:var(--font-dm-serif)] text-[20px] font-bold text-[var(--txt)]">
                      {wizardResult.licenseeName}
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--txt3)]">
                      {wizardResult.storesCount} unidade{wizardResult.storesCount === 1 ? "" : "s"} criada{wizardResult.storesCount === 1 ? "" : "s"} · 1 usuário cliente
                    </div>
                  </div>
                  <div className="w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] p-4 text-left">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">Credenciais de acesso</div>
                    <div className="flex items-center justify-between gap-2 py-1 text-[12px]">
                      <span className="text-[var(--txt3)]">Email</span>
                      <span className="font-mono text-[var(--txt)]">{wizardResult.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 py-1 text-[12px]">
                      <span className="text-[var(--txt3)]">Senha</span>
                      <span className="font-mono text-[var(--txt)]">{wizardResult.password}</span>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(`Email: ${wizardResult.email}\nSenha: ${wizardResult.password}`)}
                      className="mt-2 w-full rounded-md border border-[var(--bdr2)] py-1.5 text-[11px] font-medium text-[var(--txt2)] hover:text-[var(--txt)]"
                    >
                      Copiar tudo
                    </button>
                  </div>
                </div>
              )}

              {wizardError && (
                <div className="mt-4 rounded-lg bg-[var(--red3)] px-3 py-2 text-center text-[12px] font-medium text-[var(--red)]">
                  {wizardError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between gap-3 border-t border-[var(--bdr)] px-6 py-4 shrink-0">
              {wizardStep < 4 ? (
                <>
                  <button
                    onClick={wizardBack}
                    disabled={wizardStep === 1 || wizardSaving}
                    className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)] disabled:opacity-30"
                  >
                    Voltar
                  </button>
                  {wizardStep < 3 ? (
                    <button onClick={wizardNext} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)]">
                      Próximo
                    </button>
                  ) : (
                    <button
                      onClick={handleWizardConfirm}
                      disabled={wizardSaving}
                      className="rounded-lg bg-[var(--green)] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                    >
                      {wizardSaving ? "Criando..." : "Confirmar"}
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setWizardOpen(false)}
                  className="ml-auto rounded-lg bg-[var(--txt)] px-5 py-2 text-[13px] font-semibold text-[var(--bg)]"
                >
                  Concluir
                </button>
              )}
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

function KI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[12px] text-[var(--txt3)]">{label}</span>
      <span className={`text-[16px] font-bold ${accent ? "text-[var(--green)]" : "text-[var(--txt)]"}`}>{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[var(--txt3)]">{label}</label>
      <input type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] placeholder-[var(--txt3)] outline-none focus:border-[var(--txt3)]" />
    </div>
  );
}

/* ── Painel de Features ──────────────────────────── */

function FeaturesPanel({
  planSlug,
  plans,
  overrides,
  onChange,
}: {
  planSlug: string;
  plans: Plan[];
  overrides: Partial<Record<Feature, boolean>>;
  onChange: (next: Partial<Record<Feature, boolean>>) => void;
}) {
  const plan = plans.find((p) => p.slug === planSlug);
  const defaults = planDefaultFeatures({
    slug: plan?.slug ?? "",
    name: plan?.name ?? "",
    max_posts_day: 0,
    can_metrics: !!plan?.can_metrics,
    can_schedule: !!plan?.can_schedule,
    can_print: false,
    can_ia_legenda: !!plan?.can_ia_legenda,
    is_enterprise: false,
  });

  function setFeature(f: Feature, next: boolean | undefined) {
    const copy: Partial<Record<Feature, boolean>> = { ...overrides };
    if (next === undefined) delete copy[f];
    else copy[f] = next;
    onChange(copy);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[11px] text-[var(--txt3)]">
        <span className="font-bold text-[var(--txt2)]">Padrão do plano</span> define o estado inicial.
        Marque <span className="font-bold">Ativar</span> ou <span className="font-bold">Bloquear</span> para sobrescrever.
        O botão <span className="font-bold">Default</span> remove a override e volta ao plano.
      </div>

      <div className="flex flex-col gap-2">
        {ALL_FEATURES.map((f) => {
          const def = defaults.has(f);
          const override = overrides[f];
          const effective = override === undefined ? def : override;
          return (
            <div
              key={f}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--bdr)] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-[var(--txt)]">
                    {FEATURE_LABELS[f]}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                    style={
                      effective
                        ? { background: "var(--green3)", color: "var(--green)" }
                        : { background: "var(--red3)", color: "var(--red)" }
                    }
                  >
                    {effective ? "ON" : "OFF"}
                  </span>
                  {override !== undefined && (
                    <span className="rounded-full bg-[var(--blue3)] px-2 py-0.5 text-[9px] font-bold uppercase text-[var(--blue)]">
                      Override
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[10px] text-[var(--txt3)]">
                  Padrão do plano: {def ? "Ativo" : "Inativo"} · Código: <code>{f}</code>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFeature(f, true)}
                  className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    override === true
                      ? "border-[var(--green)] bg-[var(--green3)] text-[var(--green)]"
                      : "border-[var(--bdr)] text-[var(--txt3)] hover:text-[var(--txt2)]"
                  }`}
                >
                  Ativar
                </button>
                <button
                  type="button"
                  onClick={() => setFeature(f, false)}
                  className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    override === false
                      ? "border-[var(--red)] bg-[var(--red3)] text-[var(--red)]"
                      : "border-[var(--bdr)] text-[var(--txt3)] hover:text-[var(--txt2)]"
                  }`}
                >
                  Bloquear
                </button>
                <button
                  type="button"
                  onClick={() => setFeature(f, undefined)}
                  className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    override === undefined
                      ? "border-[var(--txt2)] text-[var(--txt)]"
                      : "border-[var(--bdr)] text-[var(--txt3)] hover:text-[var(--txt2)]"
                  }`}
                >
                  Default
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
