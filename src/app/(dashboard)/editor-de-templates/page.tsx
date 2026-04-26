"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getProfile, type FullProfile } from "@/lib/auth";
import { TemplateCard, type CanvasTemplate } from "@/components/editor/TemplateCard";
import { TemplateFilters } from "@/components/editor/TemplateFilters";

interface Licensee { id: string; name: string; }

/* ── Component ───────────────────────────────────── */

export default function EditorTemplatesPage() {
  const router = useRouter();

  // Canvas templates (system_config tmpl_*)
  const [canvasTemplates, setCanvasTemplates] = useState<CanvasTemplate[]>([]);
  const [canvasLoading, setCanvasLoading] = useState(true);
  const [thumbUploadingKey, setThumbUploadingKey] = useState<string | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [globalFilterType, setGlobalFilterType] = useState("");
  const [globalFilterFormat, setGlobalFilterFormat] = useState("");
  const [licensees, setLicensees] = useState<Licensee[]>([]);

  // Clone modal (base → licensee)
  const [cloneKey, setCloneKey] = useState<string | null>(null);
  const [cloneLicensee, setCloneLicensee] = useState<string>("");
  const [cloning, setCloning] = useState(false);
  const [cloneLojas, setCloneLojas] = useState<{ id: string; name: string }[]>([]);
  const [cloneSelectedLojas, setCloneSelectedLojas] = useState<Set<string>>(new Set());
  const [cloneCustomName, setCloneCustomName] = useState<string>("");

  // Access modal
  const [accessKey, setAccessKey] = useState<string | null>(null);
  // Map: licenseeId → Set<storeId> (vazio = todas as lojas)
  const [accessSelections, setAccessSelections] = useState<Map<string, Set<string>>>(new Map());
  const [accessIsBase, setAccessIsBase] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [licenseeStores, setLicenseeStores] = useState<Map<string, { id: string; name: string }[]>>(new Map());


  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      setProfile(p);
      // Load licensees for clone modal
      const { data: lR } = await supabase.from("licensees").select("id, name").order("name");
      setLicensees((lR as Licensee[]) ?? []);
    })();
  }, []);

  // Carrega lojas quando licensee do clone modal muda
  useEffect(() => {
    if (!cloneLicensee) {
      setCloneLojas([]);
      setCloneSelectedLojas(new Set());
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("stores")
        .select("id,name")
        .eq("licensee_id", cloneLicensee)
        .order("name");
      const lojas = (data as { id: string; name: string }[]) ?? [];
      setCloneLojas(lojas);
      // Pré-seleciona Rio Preto se existir
      const rpLoja = lojas.find(l => l.name.toLowerCase().includes("rio preto"));
      setCloneSelectedLojas(rpLoja ? new Set([rpLoja.id]) : new Set());
    })();
  }, [cloneLicensee]);

  async function persistField(key: string, field: string, value: string) {
    const { data: row } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", key)
      .single();
    const current = row?.value ? JSON.parse(row.value) : {};
    current[field] = value;
    await supabase
      .from("system_config")
      .upsert({ key, value: JSON.stringify(current), updated_at: new Date().toISOString() }, { onConflict: "key" });
  }

  async function handleNameChange(key: string, nome: string) {
    await persistField(key, "nome", nome);
    setCanvasTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, nome } : t)));
  }

  async function persistThumb(key: string, url: string) {
    const { data: row } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", key)
      .single();
    const current = row?.value ? JSON.parse(row.value) : {};
    current.thumbnail = url;
    await supabase
      .from("system_config")
      .upsert({ key, value: JSON.stringify(current), updated_at: new Date().toISOString() }, { onConflict: "key" });
    setCanvasTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, thumbnail: url } : t)));
  }

  async function handleThumbUpload(key: string, file: File) {
    setThumbUploadingKey(key);
    try {
      const url = await uploadToCloudinary(file, "aurohubv2/thumbs");
      await persistThumb(key, url);
    } catch (err) {
      console.error("[Thumb upload]", err);
      alert("Falha no upload do thumbnail.");
    } finally {
      setThumbUploadingKey(null);
    }
  }

  async function handleCaptureCard(key: string) {
    setThumbUploadingKey(key);
    try {
      // 1) Tenta achar stage Konva no DOM (caso preview tenha sido renderizado)
      const konvaCanvas = document.querySelector<HTMLCanvasElement>(`[data-tmpl-key="${key}"] canvas`);
      let blob: Blob | null = null;
      if (konvaCanvas) {
        blob = await new Promise<Blob | null>((resolve) => konvaCanvas.toBlob((b) => resolve(b), "image/png"));
      } else {
        // 2) Fallback: html2canvas no card inteiro
        const cardEl = document.querySelector<HTMLElement>(`[data-tmpl-key="${key}"]`);
        if (!cardEl) throw new Error("Card não encontrado");
        const { default: html2canvas } = await import("html2canvas");
        const snap = await html2canvas(cardEl, { useCORS: true, backgroundColor: null, scale: 2 });
        blob = await new Promise<Blob | null>((resolve) => snap.toBlob((b) => resolve(b), "image/png"));
      }
      if (!blob) throw new Error("Falha ao gerar PNG");
      const file = new File([blob], `${key}-capture.png`, { type: "image/png" });
      const url = await uploadToCloudinary(file, "aurohubv2/thumbs");
      await persistThumb(key, url);
    } catch (err) {
      console.error("[Thumb capture]", err);
      alert("Falha ao capturar o card.");
    } finally {
      setThumbUploadingKey(null);
    }
  }

  const loadCanvasTemplates = useCallback(async () => {
    setCanvasLoading(true);
    try {
      const { data } = await supabase
        .from("system_config")
        .select("key,value,updated_at")
        .like("key", "tmpl_%")
        .order("updated_at", { ascending: false });

      // Busca todos os acessos de template_access com joins
      const { data: accessData } = await supabase
        .from("template_access")
        .select("template_key,licensee_id,store_id,licensees(name),stores(name)");

      // Mapa: template_key → array de strings descritivas
      const accessMap = new Map<string, string[]>();
      if (accessData) {
        for (const rec of accessData as {
          template_key: string;
          licensee_id: string;
          store_id: string | null;
          licensees: { name: string } | null;
          stores: { name: string } | null;
        }[]) {
          const key = rec.template_key;
          const licName = rec.licensees?.name ?? "Cliente desconhecido";

          if (!accessMap.has(key)) accessMap.set(key, []);

          if (rec.store_id === null) {
            // Todas as lojas da marca
            accessMap.get(key)!.push(`${licName} (todas)`);
          } else {
            // Loja específica
            const storeName = rec.stores?.name ?? "Loja";
            accessMap.get(key)!.push(`${licName} - ${storeName}`);
          }
        }
      }

      const list: CanvasTemplate[] = (data || []).map((r: { key: string; value: string; updated_at: string }) => {
        let nome = "", format = "—", formType = "—", segmento = "Geral", licenseeId: string | null = null, licenseeNome = "Sem marca", lojaNome = "Sem loja", thumbnail: string | null = null, parsedIsBase = false;
        try {
          const parsed = JSON.parse(r.value);
          nome = parsed.nome || "";
          format = parsed.format || "—";
          formType = parsed.formType || "—";
          segmento = parsed.segmento || "Geral";
          licenseeId = parsed.licenseeId ?? null;
          licenseeNome = parsed.licenseeNome || "Sem marca";
          lojaNome = parsed.lojaNome || "Sem loja";
          thumbnail = parsed.thumbnail || parsed.thumb || parsed.schema?.thumbnail || null;
          parsedIsBase = parsed.is_base === true;
        } catch {}
        const isBase = parsedIsBase || r.key.startsWith("tmpl_base_");
        // Extrai tipo do slug da key. Aceita tanto `tmpl_base_{tipo}_{formato}`
        // quanto `tmpl_{tipo}_{formato}` (ex: tmpl_cards_stories).
        const baseTipo = isBase
          ? (r.key.match(/^tmpl_(?:base_)?(.+)_(stories|reels|feed|tv)$/)?.[1] ?? null)
          : null;
        return {
          key: r.key,
          displayName: r.key.replace(/^tmpl_(base_)?/, ""),
          nome,
          format,
          formType,
          segmento,
          updatedAt: r.updated_at,
          licenseeId,
          licenseeNome,
          lojaNome,
          thumbnail,
          isBase,
          baseTipo,
          accessLicensees: accessMap.get(r.key) ?? [],
        };
      });
      setCanvasTemplates(list);
    } catch (err) { console.error("[CanvasTemplates] load:", err); }
    finally { setCanvasLoading(false); }
  }, []);

  useEffect(() => { loadCanvasTemplates(); }, [loadCanvasTemplates]);

  const editCanvasTmpl = (key: string) => {
    router.push(`/editor?id=${key.replace(/^tmpl_/, "")}`);
  };

  // Filtra base templates (usa filtros globais)
  const baseTemplatesFiltered = useMemo(() => {
    return canvasTemplates.filter((t) => {
      if (!t.isBase) return false;
      if (globalFilterType && t.baseTipo !== globalFilterType && t.formType !== globalFilterType) return false;
      if (globalFilterFormat && t.format !== globalFilterFormat) return false;
      return true;
    });
  }, [canvasTemplates, globalFilterType, globalFilterFormat]);

  const hasAnyBaseTemplate = useMemo(() => canvasTemplates.some((t) => t.isBase), [canvasTemplates]);

  // Agrupa templates de cliente por licensee (sem sub-agrupamento por segmento)
  const userTemplatesByLicensee = useMemo(() => {
    const isAdm = profile?.role === "adm" || profile?.role === "operador";
    const ownLic = profile?.licensee_id ?? null;
    const map: Record<string, { id: string | null; items: CanvasTemplate[] }> = {};
    for (const t of canvasTemplates) {
      if (t.isBase) continue;
      if (!isAdm && t.licenseeId !== ownLic) continue;
      if (globalFilterType && t.formType !== globalFilterType && t.baseTipo !== globalFilterType) continue;
      if (globalFilterFormat && t.format !== globalFilterFormat) continue;
      const lic = t.licenseeNome || "Sem marca";
      if (!map[lic]) map[lic] = { id: t.licenseeId, items: [] };
      map[lic].items.push(t);
    }
    return map;
  }, [canvasTemplates, profile, globalFilterType, globalFilterFormat]);

  const userTemplatesCount = useMemo(
    () => Object.values(userTemplatesByLicensee).reduce((a, v) => a + v.items.length, 0),
    [userTemplatesByLicensee]
  );

  // Helpers — iniciais e cor a partir do nome do licensee (determinístico)
  function getInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
  }
  function getLicColor(name: string): string {
    const palette = ["#FF7A1A", "#D4A843", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  // Clona template base para um licensee específico
  const runCloneToLicensee = async () => {
    if (!cloneKey || !cloneLicensee || cloneSelectedLojas.size === 0 || !cloneCustomName.trim()) return;
    setCloning(true);
    try {
      const lic = licensees.find((l) => l.id === cloneLicensee);
      const { data: row } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", cloneKey)
        .single();
      if (!row?.value) throw new Error("Template base não encontrado");
      const parsed = JSON.parse(row.value);

      const selectedLojaIds = [...cloneSelectedLojas];
      const lojaNames = selectedLojaIds.map(id => cloneLojas.find(l => l.id === id)?.name ?? "");

      const cloneData = {
        ...parsed,
        nome: cloneCustomName.trim(),
        is_base: false,
        licenseeId: lic?.id ?? null,
        licenseeNome: lic?.name ?? "Sem marca",
        lojaIds: selectedLojaIds,
        lojaNomes: lojaNames,
      };

      // Novo key: tmpl_{tipo}_{formato}_{licensee-slug}-{timestamp}
      const slug = (lic?.name ?? "licensee")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const baseSuffix = cloneKey.replace(/^tmpl_(base_)?/, "");
      const newKey = `tmpl_${baseSuffix}_${slug}_${Date.now().toString(36)}`;

      // 1. Inserir em system_config
      await supabase.from("system_config").upsert({
        key: newKey,
        value: JSON.stringify(cloneData),
        updated_at: new Date().toISOString(),
      });

      // 2. Inserir em form_templates
      await supabase.from("form_templates").insert({
        name: cloneCustomName.trim(),
        form_type: parsed.formType,
        format: parsed.format,
        width: parsed.width,
        height: parsed.height,
        schema: {
          elements: parsed.elements ?? [],
          background: parsed.background ?? "#1E3A6E",
          formType: parsed.formType,
          width: parsed.width,
          height: parsed.height,
          duration: 5,
        },
        is_base: false,
        active: true,
        licensee_id: lic?.id ?? null,
        thumbnail_url: parsed.thumbnail ?? null,
      });

      setCloneKey(null);
      setCloneLicensee("");
      setCloneSelectedLojas(new Set());
      setCloneCustomName("");
      await loadCanvasTemplates();
    } catch (err) {
      console.error("[Clone to licensee]", err);
      alert("Falha ao clonar template.");
    } finally {
      setCloning(false);
    }
  };

  const deleteCanvasTmpl = async (key: string) => {
    if (!confirm(`Excluir template "${key.replace(/^tmpl_/, "")}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      await supabase.from("system_config").delete().eq("key", key);
      await loadCanvasTemplates();
    } catch (err) { console.error("[CanvasTemplates] delete:", err); alert("Erro ao excluir."); }
  };

  // Abre modal de acesso e carrega licensees que já têm acesso
  const openAccessModal = async (key: string) => {
    setAccessKey(key);
    const tmpl = canvasTemplates.find(t => t.key === key);
    setAccessIsBase(tmpl?.isBase ?? false);

    // Carrega lojas de todos os licensees
    const storesMap = new Map<string, { id: string; name: string }[]>();
    for (const lic of licensees) {
      const { data } = await supabase
        .from("stores")
        .select("id,name")
        .eq("licensee_id", lic.id)
        .order("name");
      storesMap.set(lic.id, (data as { id: string; name: string }[]) ?? []);
    }
    setLicenseeStores(storesMap);

    // Busca acessos existentes (licensee_id + store_id)
    const { data } = await supabase
      .from("template_access")
      .select("licensee_id,store_id")
      .eq("template_key", key);

    // Monta Map: licenseeId → Set<storeId>
    const selections = new Map<string, Set<string>>();
    for (const rec of (data ?? []) as { licensee_id: string; store_id: string | null }[]) {
      if (!selections.has(rec.licensee_id)) {
        selections.set(rec.licensee_id, new Set());
      }
      if (rec.store_id) {
        selections.get(rec.licensee_id)!.add(rec.store_id);
      }
      // Se store_id é null, deixa o Set vazio (= todas as lojas)
    }
    setAccessSelections(selections);
  };

  // Salva acesso do template
  const saveTemplateAccess = async () => {
    if (!accessKey) return;
    setSavingAccess(true);
    try {
      // 1. Atualiza is_base no system_config
      const { data: row } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", accessKey)
        .single();
      if (row?.value) {
        const parsed = JSON.parse(row.value);
        parsed.is_base = accessIsBase;
        await supabase.from("system_config").upsert({
          key: accessKey,
          value: JSON.stringify(parsed),
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });
      }

      // 2. Sincroniza template_access
      // Delete todos os registros antigos
      await supabase
        .from("template_access")
        .delete()
        .eq("template_key", accessKey);

      // Se não é base, insere os registros
      if (!accessIsBase && accessSelections.size > 0) {
        const rows: { template_key: string; licensee_id: string; store_id: string | null }[] = [];

        for (const [licId, storeIds] of accessSelections.entries()) {
          if (storeIds.size === 0) {
            // Todas as lojas → salva sem store_id
            rows.push({ template_key: accessKey, licensee_id: licId, store_id: null });
          } else {
            // Lojas específicas → um registro por loja
            for (const storeId of storeIds) {
              rows.push({ template_key: accessKey, licensee_id: licId, store_id: storeId });
            }
          }
        }

        if (rows.length > 0) {
          await supabase.from("template_access").insert(rows);
        }
      }

      setAccessKey(null);
      setAccessSelections(new Map());
      setAccessIsBase(false);
      setLicenseeStores(new Map());
      await loadCanvasTemplates();
    } catch (err) {
      console.error("[Save access]", err);
      alert("Falha ao salvar acesso.");
    } finally {
      setSavingAccess(false);
    }
  };


  // Duplica um template de cliente (mesmo licensee)
  async function duplicateCanvasTmpl(key: string) {
    try {
      const { data: row } = await supabase.from("system_config").select("value").eq("key", key).single();
      if (!row?.value) return;
      const parsed = JSON.parse(row.value);
      const cloneData = { ...parsed, nome: (parsed.nome || "Template") + " (cópia)" };
      const baseSuffix = key.replace(/^tmpl_/, "");
      const newKey = `tmpl_${baseSuffix}_copy_${Date.now().toString(36)}`;
      await supabase.from("system_config").upsert({
        key: newKey,
        value: JSON.stringify(cloneData),
        updated_at: new Date().toISOString(),
      });
      // Sync com form_templates para o publicar encontrar
      const sc = await supabase.from("system_config").select("value").eq("key", newKey).single();
      if (sc.data) {
        const parsed = JSON.parse(sc.data.value);
        await supabase.from("form_templates").upsert({
          name: parsed.nome || newKey,
          form_type: parsed.formType || "pacote",
          format: parsed.format || "stories",
          is_base: true,
          active: true,
          licensee_id: null,
          schema: {
            elements: parsed.elements || [],
            background: parsed.background || "#0E1520",
            formType: parsed.formType || "pacote",
            width: parsed.width || 1080,
            height: parsed.height || 1920,
            duration: parsed.duration || 5,
          },
          width: parsed.width || 1080,
          height: parsed.height || 1920,
        }, { onConflict: "name,form_type,format" });
      }
      await loadCanvasTemplates();
    } catch (err) {
      console.error("[Duplicate]", err);
      alert("Falha ao duplicar template.");
    }
  }


  /* ── Render ────────────────────────────────────── */

  const isAdm = profile?.role === "adm" || profile?.role === "operador";

  const openNewTemplate = (licenseeId: string | null) => {
    const qs = licenseeId ? `?licensee=${licenseeId}` : "";
    router.push(`/editor${qs}`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Biblioteca de Templates</h1>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Gerencie templates base e personalizados por cliente</p>
        </div>
        <button
          type="button"
          onClick={() => openNewTemplate(profile?.licensee_id ?? null)}
          className="flex items-center gap-2 rounded-lg bg-[var(--txt)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)] hover:opacity-90"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Novo template
        </button>
      </div>

      {/* Filtros globais */}
      <TemplateFilters
        filterType={globalFilterType}
        filterFormat={globalFilterFormat}
        onTypeChange={setGlobalFilterType}
        onFormatChange={setGlobalFilterFormat}
      />

      {/* Biblioteca Base (somente ADM) */}
      {isAdm && (
        <section className="border-b border-[var(--bdr)] pb-6">
          <details
            open
            className="overflow-hidden rounded-xl border border-[var(--bdr)]"
            style={{ background: "var(--card-bg)" }}
          >
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-[var(--hover-bg)]">
              <span className="flex flex-col">
                <span className="text-[14px] font-bold text-[var(--txt)]">Biblioteca Base</span>
                <span className="text-[11px] text-[var(--txt3)]">
                  Templates do sistema — clone para um cliente para liberar uso
                </span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">
                {baseTemplatesFiltered.length} template{baseTemplatesFiltered.length !== 1 ? "s" : ""}
              </span>
            </summary>

            <div className="p-4">
              {canvasLoading ? (
                <div className="text-[12px] text-[var(--txt3)]">Carregando...</div>
              ) : !hasAnyBaseTemplate ? (
                <div className="rounded-xl border border-dashed border-[var(--bdr)] p-8 text-center text-[12px] text-[var(--txt3)]">
                  Nenhum template base cadastrado.
                </div>
              ) : baseTemplatesFiltered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--bdr)] p-8 text-center text-[12px] text-[var(--txt3)]">
                  Nenhum template encontrado com esses filtros.
                </div>
              ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                  {baseTemplatesFiltered.map((t) => (
                    <TemplateCard
                      key={t.key}
                      template={t}
                      onEdit={(key) => router.push(`/editor?id=${key.replace(/^tmpl_/, "")}`)}
                      onDuplicate={duplicateCanvasTmpl}
                      onDelete={deleteCanvasTmpl}
                      onClone={isAdm && t.isBase ? setCloneKey : undefined}
                      onAccess={isAdm ? openAccessModal : undefined}
                      onNameChange={handleNameChange}
                      onThumbUpload={handleThumbUpload}
                      onThumbCapture={handleCaptureCard}
                      thumbUploading={thumbUploadingKey === t.key}
                    />
                  ))}
                </div>
              )}
            </div>
          </details>
        </section>
      )}

      {/* Por Cliente */}
      <section>
        <div className="mb-4">
          <h2 className="text-[18px] font-bold tracking-tight text-[var(--txt)]">Por Cliente</h2>
          <p className="mt-0.5 text-[12px] text-[var(--txt3)]">
            {isAdm ? "Templates personalizados — ADM vê todos os clientes" : "Templates da sua marca"}
          </p>
        </div>
        {canvasLoading ? (
          <div className="text-[12px] text-[var(--txt3)]">Carregando...</div>
        ) : userTemplatesCount === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--bdr)] p-8 text-center text-[12px] text-[var(--txt3)]">
            {globalFilterType || globalFilterFormat
              ? "Nenhum template encontrado com esses filtros."
              : "Nenhum template personalizado ainda. Clone um template base ou crie um novo."}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(userTemplatesByLicensee).map(([licName, group]) => {
              const color = getLicColor(licName);
              return (
                <details
                  key={licName}
                  open
                  className="overflow-hidden rounded-xl border border-[var(--bdr)]"
                  style={{ background: "var(--card-bg)" }}
                >
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-[var(--hover-bg)]">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-[14px] font-bold text-[var(--txt)]">{licName}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--txt3)]">
                        · {group.items.length} template{group.items.length !== 1 ? "s" : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openNewTemplate(group.id);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-[var(--bdr)] px-3 py-1 text-[11px] font-semibold text-[var(--txt2)] hover:text-[var(--txt)] hover:border-[var(--bdr2)]"
                    >
                      + Novo template
                    </button>
                  </summary>
                  <div className="border-t border-[var(--bdr)] px-4 py-4">
                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                      {group.items.map((t) => (
                        <TemplateCard
                          key={t.key}
                          template={t}
                          onEdit={(key) => router.push(`/editor?id=${key.replace(/^tmpl_/, "")}`)}
                          onDuplicate={duplicateCanvasTmpl}
                          onDelete={deleteCanvasTmpl}
                          onAccess={isAdm ? openAccessModal : undefined}
                          onNameChange={handleNameChange}
                          onThumbUpload={handleThumbUpload}
                          onThumbCapture={handleCaptureCard}
                          thumbUploading={thumbUploadingKey === t.key}
                        />
                      ))}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {/* Clone modal (base → licensee) */}
      {cloneKey && (
        <Ov onClose={() => setCloneKey(null)}>
          <div className="mx-4 flex w-full max-w-[420px] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="border-b border-[var(--bdr)] px-6 py-4">
              <div className="text-[15px] font-bold text-[var(--txt)]">Clonar template para cliente</div>
              <div className="mt-0.5 text-[11px] text-[var(--txt3)]">Escolha a marca e as lojas</div>
            </div>
            <div className="max-h-[50vh] flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-4">
                {/* Thumbnail do template base */}
                {(() => {
                  const tmpl = canvasTemplates.find(t => t.key === cloneKey);
                  return tmpl?.thumbnail ? (
                    <div className="rounded-lg border border-[var(--bdr)] overflow-hidden" style={{ height: "120px", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}>
                      <img src={tmpl.thumbnail} alt={tmpl.nome} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  ) : null;
                })()}

                {/* Nome personalizado */}
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--txt3)]">Nome do Template *</div>
                  <input
                    type="text"
                    value={cloneCustomName}
                    onChange={(e) => setCloneCustomName(e.target.value)}
                    placeholder="Ex: Pacote Verão 2026"
                    className="w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-2 text-[13px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
                  />
                </div>

                {/* Marca */}
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--txt3)]">Marca</div>
                  <div className="flex flex-col gap-1.5">
                    {licensees.length === 0 ? (
                      <div className="text-[12px] text-[var(--txt3)]">Nenhum licensee cadastrado.</div>
                    ) : (
                      licensees.map((l) => {
                        const sel = cloneLicensee === l.id;
                        return (
                          <label
                            key={l.id}
                            className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-[var(--hover-bg)] ${sel ? "border-[var(--orange)] bg-[var(--orange3)]" : "border-[var(--bdr)]"}`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                style={{ background: getLicColor(l.name) }}
                              >
                                {getInitials(l.name) || "·"}
                              </span>
                              <span className={`text-[13px] font-medium ${sel ? "text-[var(--orange)]" : "text-[var(--txt)]"}`}>{l.name}</span>
                            </span>
                            <input
                              type="radio"
                              name="clone-lic"
                              checked={sel}
                              onChange={() => setCloneLicensee(l.id)}
                              className="accent-[var(--orange)]"
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Lojas */}
                {cloneLicensee && cloneLojas.length > 0 && (
                  <div>
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--txt3)]">
                      Lojas ({cloneSelectedLojas.size}/{cloneLojas.length})
                    </div>
                    <div className="rounded-lg border border-[var(--bdr)] p-2">
                      {/* Todas as lojas */}
                      <label className="flex cursor-pointer items-center gap-2 border-b border-[var(--bdr)] p-2">
                        <input
                          type="checkbox"
                          checked={cloneSelectedLojas.size === cloneLojas.length}
                          onChange={() => {
                            if (cloneSelectedLojas.size === cloneLojas.length) {
                              setCloneSelectedLojas(new Set());
                            } else {
                              setCloneSelectedLojas(new Set(cloneLojas.map(l => l.id)));
                            }
                          }}
                          className="accent-[var(--orange)]"
                        />
                        <span className="text-[12px] font-bold text-[var(--txt)]">Todas as lojas</span>
                      </label>
                      {/* Lista de lojas */}
                      {cloneLojas.map((loja) => (
                        <label key={loja.id} className="flex cursor-pointer items-center gap-2 p-2">
                          <input
                            type="checkbox"
                            checked={cloneSelectedLojas.has(loja.id)}
                            onChange={() => {
                              const next = new Set(cloneSelectedLojas);
                              if (next.has(loja.id)) next.delete(loja.id);
                              else next.add(loja.id);
                              setCloneSelectedLojas(next);
                            }}
                            className="accent-[var(--orange)]"
                          />
                          <span className="text-[11px] text-[var(--txt2)]">{loja.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4">
              <button
                type="button"
                onClick={() => { setCloneKey(null); setCloneLicensee(""); setCloneSelectedLojas(new Set()); setCloneCustomName(""); }}
                className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={runCloneToLicensee}
                disabled={!cloneLicensee || cloneSelectedLojas.size === 0 || !cloneCustomName.trim() || cloning}
                className="rounded-lg bg-[var(--orange)] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {cloning ? "Clonando..." : "Clonar"}
              </button>
            </div>
          </div>
        </Ov>
      )}

      {/* Access modal */}
      {accessKey && (
        <Ov onClose={() => setAccessKey(null)}>
          <div className="mx-4 flex w-full max-w-[500px] flex-col rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--card-bg)" }}>
            <div className="border-b border-[var(--bdr)] px-6 py-4">
              <div className="text-[15px] font-bold text-[var(--txt)]">Gerenciar acesso ao template</div>
              <div className="mt-0.5 text-[11px] text-[var(--txt3)]">Escolha quais clientes e lojas podem usar este template</div>
            </div>
            <div className="max-h-[60vh] flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-4">
                {/* Checkbox "Todos (base)" */}
                <div className="rounded-lg border border-[var(--bdr)] p-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={accessIsBase}
                      onChange={(e) => {
                        setAccessIsBase(e.target.checked);
                        if (e.target.checked) {
                          setAccessSelections(new Map());
                        }
                      }}
                      className="accent-[var(--orange)]"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[var(--txt)]">Todos os clientes (template base)</span>
                      <span className="text-[10px] text-[var(--txt3)]">Visível para todos os licensees e lojas</span>
                    </div>
                  </label>
                </div>

                {/* Hierarquia Marcas → Lojas */}
                {!accessIsBase && (
                  <div>
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--txt3)]">
                      Marcas e Lojas
                    </div>
                    <div className="flex flex-col gap-2">
                      {licensees.length === 0 ? (
                        <div className="text-[12px] text-[var(--txt3)]">Nenhum cliente cadastrado.</div>
                      ) : (
                        licensees.map((lic) => {
                          const stores = licenseeStores.get(lic.id) ?? [];
                          const selectedStores = accessSelections.get(lic.id) ?? new Set<string>();
                          const hasAccess = accessSelections.has(lic.id);
                          const allStoresSelected = hasAccess && selectedStores.size === 0;

                          return (
                            <details
                              key={lic.id}
                              open={hasAccess}
                              className="rounded-lg border border-[var(--bdr)] overflow-hidden"
                            >
                              <summary className="flex cursor-pointer items-center gap-2 p-3 hover:bg-[var(--hover-bg)]">
                                <span
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                  style={{ background: getLicColor(lic.name) }}
                                >
                                  {getInitials(lic.name) || "·"}
                                </span>
                                <span className="flex-1 text-[13px] font-medium text-[var(--txt)]">{lic.name}</span>
                                {hasAccess && (
                                  <span className="text-[10px] font-semibold text-[var(--orange)]">
                                    {allStoresSelected ? "Todas" : `${selectedStores.size} loja${selectedStores.size !== 1 ? "s" : ""}`}
                                  </span>
                                )}
                              </summary>

                              <div className="border-t border-[var(--bdr)] bg-[var(--bg1)] p-3">
                                {/* Todas as lojas */}
                                <label className="flex cursor-pointer items-center gap-2 p-2 rounded hover:bg-[var(--hover-bg)]">
                                  <input
                                    type="checkbox"
                                    checked={allStoresSelected}
                                    onChange={() => {
                                      const next = new Map(accessSelections);
                                      if (allStoresSelected) {
                                        next.delete(lic.id);
                                      } else {
                                        next.set(lic.id, new Set());
                                      }
                                      setAccessSelections(next);
                                    }}
                                    className="accent-[var(--orange)]"
                                  />
                                  <span className="text-[12px] font-bold text-[var(--txt)]">Todas as lojas</span>
                                </label>

                                {/* Lista de lojas */}
                                {stores.length > 0 && (
                                  <div className="mt-2 ml-6 flex flex-col gap-1">
                                    {stores.map((store) => {
                                      const storeSelected = selectedStores.has(store.id);
                                      return (
                                        <label
                                          key={store.id}
                                          className="flex cursor-pointer items-center gap-2 p-2 rounded hover:bg-[var(--hover-bg)]"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={storeSelected || allStoresSelected}
                                            disabled={allStoresSelected}
                                            onChange={() => {
                                              const next = new Map(accessSelections);
                                              const storeSet = new Set(selectedStores);

                                              if (storeSet.has(store.id)) {
                                                storeSet.delete(store.id);
                                              } else {
                                                storeSet.add(store.id);
                                              }

                                              if (storeSet.size === 0) {
                                                next.delete(lic.id);
                                              } else {
                                                next.set(lic.id, storeSet);
                                              }

                                              setAccessSelections(next);
                                            }}
                                            className="accent-[var(--orange)]"
                                          />
                                          <span className={`text-[11px] ${allStoresSelected ? "text-[var(--txt3)]" : "text-[var(--txt2)]"}`}>
                                            {store.name}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}

                                {stores.length === 0 && (
                                  <div className="ml-6 text-[11px] text-[var(--txt3)]">Nenhuma loja cadastrada</div>
                                )}
                              </div>
                            </details>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setAccessKey(null);
                  setAccessSelections(new Map());
                  setAccessIsBase(false);
                  setLicenseeStores(new Map());
                }}
                className="rounded-lg px-4 py-2 text-[13px] text-[var(--txt3)] hover:text-[var(--txt)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveTemplateAccess}
                disabled={savingAccess}
                className="rounded-lg bg-[var(--orange)] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {savingAccess ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </Ov>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Ov({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>{children}</div>;
}
