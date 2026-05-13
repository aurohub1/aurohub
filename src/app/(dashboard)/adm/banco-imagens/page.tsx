"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

// SQL: ALTER TABLE imgfundo ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id);

interface ImgRow {
  id: string;
  nome: string;
  url: string;
  public_id: string | null;
  licensee_id: string | null;
  store_id: string | null;
  formato: string | null;
  tipo: string | null;
  position_y: number | null;
  form_type: string | null;
  created_at: string;
}

interface Licensee { id: string; name: string; }
interface Store { id: string; name: string; }

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: "24px 28px",
};
const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "#94A3B8",
  marginBottom: 10,
};
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "#EEF2FF",
  fontSize: 13,
  padding: "10px 14px",
  outline: "none",
  width: "100%",
  fontFamily: "inherit",
};
const btnPrimary: React.CSSProperties = {
  background: "#D4A843",
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "9px 20px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#EEF2FF",
  borderRadius: 8,
  padding: "9px 20px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
const btnDanger: React.CSSProperties = {
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.3)",
  color: "#f87171",
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

// SQL para adicionar coluna:
// ALTER TABLE imgfundo ADD COLUMN IF NOT EXISTS form_type text DEFAULT 'todos';

const FORM_TYPES = [
  { value: "todos",         label: "Todos" },
  { value: "pacote",        label: "Pacote" },
  { value: "campanha",      label: "Campanha" },
  { value: "passagem",      label: "Passagem" },
  { value: "cruzeiro",      label: "Cruzeiro" },
  { value: "anoiteceu",     label: "Anoiteceu" },
  { value: "card_whatsapp", label: "Card WhatsApp" },
] as const;

type FormTypeValue = typeof FORM_TYPES[number]["value"];

function FormTypeBadge({ value }: { value: string | null }) {
  if (!value || value === "todos") return null;
  const label = FORM_TYPES.find(f => f.value === value)?.label ?? value;
  return (
    <div style={{
      background: "rgba(167,139,250,0.12)",
      border: "1px solid rgba(167,139,250,0.25)",
      borderRadius: 4, padding: "1px 6px",
      fontSize: 9, fontWeight: 700, color: "#A78BFA",
      whiteSpace: "nowrap",
    }}>
      {label}
    </div>
  );
}

const TOUR_KEY = "banco_imagens_tour_seen";

const TOUR_STEPS = [
  {
    num: "①",
    title: "Escolha o TIPO",
    items: [
      "Destino → imagem de fundo da cidade/local",
      "Hotel → imagem do hotel/resort",
    ],
  },
  {
    num: "②",
    title: "Escolha o FORMATO",
    items: [
      "Stories/Reels → vertical (publicações padrão)",
      "Feed (1:1) → quadrado (arraste para enquadrar)",
      "TV (16:9) → horizontal (para TVs e painéis)",
    ],
  },
  {
    num: "③",
    title: "Digite o NOME exatamente como no formulário",
    items: [
      "ex: CANCÚN, FERNANDO DE NORONHA, IBEROSTAR BAHIA",
    ],
    warning: "Use letras maiúsculas — o sistema busca por nome exato",
  },
  {
    num: "④",
    title: "Faça o upload da imagem",
    items: ["Máximo 2 imagens TV por destino por cliente"],
  },
];

export default function BancoImagensAdmPage() {
  const [tab, setTab] = useState<"base" | "clientes">("base");
  const [baseImgs, setBaseImgs] = useState<ImgRow[]>([]);
  const [clienteImgs, setClienteImgs] = useState<ImgRow[]>([]);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filtros Por Cliente
  const [filterLicensee, setFilterLicensee] = useState("");
  const [filterDestino, setFilterDestino] = useState("");

  // Upload modal
  const [showModal, setShowModal] = useState(false);
  const [tourStep, setTourStep] = useState<"tour" | "form">("form");
  const [uploadDestino, setUploadDestino] = useState("");
  const [uploadFormato, setUploadFormato] = useState<"stories" | "feed" | "tv">("tv");
  const [uploadPositionY, setUploadPositionY] = useState(50);
  const [uploadTipo, setUploadTipo] = useState<"destino" | "hotel">("destino");
  const [uploadFormType, setUploadFormType] = useState<FormTypeValue>("todos");
  const [uploadTarget, setUploadTarget] = useState<"adm" | "cliente">("adm");
  const [uploadLicenseeId, setUploadLicenseeId] = useState<string>("");
  const [uploadStores, setUploadStores] = useState<Store[]>([]);
  const [uploadSelectedStoreIds, setUploadSelectedStoreIds] = useState<string[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ y: number; posY: number } | null>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const previewObjRef = useRef<string | null>(null);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(""), 3500);
  }

  function openModal(licenseeId: string) {
    const seen = typeof window !== "undefined" && localStorage.getItem(TOUR_KEY) === "1";
    setTourStep(seen ? "form" : "tour");
    if (licenseeId) {
      setUploadTarget("cliente");
      setUploadLicenseeId(licenseeId);
      loadStoresForLicensee(licenseeId);
    } else {
      setUploadTarget("adm");
      setUploadLicenseeId("");
      setUploadStores([]);
      setUploadSelectedStoreIds([]);
    }
    setShowModal(true);
  }

  function resetModal() {
    if (previewObjRef.current) {
      URL.revokeObjectURL(previewObjRef.current);
      previewObjRef.current = null;
    }
    setPreviewUrl(null);
    setIsDragging(false);
    dragStartRef.current = null;
    setUploadDestino("");
    setUploadTipo("destino");
    setUploadPositionY(50);
    setUploadFormType("todos");
    setUploadTarget("adm");
    setUploadLicenseeId("");
    setUploadStores([]);
    setUploadSelectedStoreIds([]);
    setTourStep("form");
    if (fileRef.current) fileRef.current.value = "";
    setShowModal(false);
  }

  async function loadStoresForLicensee(licenseeId: string) {
    setUploadStores([]);
    setUploadSelectedStoreIds([]);
    if (!licenseeId) return;
    setLoadingStores(true);
    const { data } = await supabase
      .from("stores")
      .select("id,name")
      .eq("licensee_id", licenseeId)
      .order("name");
    setUploadStores((data ?? []) as Store[]);
    setLoadingStores(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (previewObjRef.current) URL.revokeObjectURL(previewObjRef.current);
    if (file) {
      const url = URL.createObjectURL(file);
      previewObjRef.current = url;
      setPreviewUrl(url);
      setUploadPositionY(50);
    } else {
      previewObjRef.current = null;
      setPreviewUrl(null);
    }
  }

  function getDragRange() {
    if (!previewImgRef.current) return 1;
    const { naturalWidth, naturalHeight } = previewImgRef.current;
    if (!naturalWidth) return 1;
    return Math.max(1, (naturalHeight / naturalWidth) * 280 - 280);
  }

  function handlePreviewMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { y: e.clientY, posY: uploadPositionY };
  }

  function handlePreviewMouseMove(e: React.MouseEvent) {
    if (!dragStartRef.current) return;
    const range = getDragRange();
    const deltaY = e.clientY - dragStartRef.current.y;
    const newPosY = Math.min(100, Math.max(0, dragStartRef.current.posY - (deltaY / range) * 100));
    setUploadPositionY(Math.round(newPosY));
  }

  function handlePreviewMouseUp() {
    setIsDragging(false);
    dragStartRef.current = null;
  }

  function handlePreviewTouchStart(e: React.TouchEvent) {
    setIsDragging(true);
    dragStartRef.current = { y: e.touches[0].clientY, posY: uploadPositionY };
  }

  function handlePreviewTouchMove(e: React.TouchEvent) {
    if (!dragStartRef.current) return;
    const range = getDragRange();
    const deltaY = e.touches[0].clientY - dragStartRef.current.y;
    const newPosY = Math.min(100, Math.max(0, dragStartRef.current.posY - (deltaY / range) * 100));
    setUploadPositionY(Math.round(newPosY));
  }

  function handlePreviewTouchEnd() {
    setIsDragging(false);
    dragStartRef.current = null;
  }

  const loadBase = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("imgfundo")
      .select("id,nome,url,public_id,licensee_id,store_id,formato,tipo,position_y,form_type,created_at")
      .is("licensee_id", null)
      .order("nome");
    setBaseImgs((data ?? []) as ImgRow[]);
    setLoading(false);
  }, []);

  const loadClientes = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("imgfundo")
      .select("id,nome,url,public_id,licensee_id,store_id,formato,tipo,position_y,form_type,created_at")
      .not("licensee_id", "is", null)
      .order("created_at", { ascending: false });
    if (filterLicensee) q = q.eq("licensee_id", filterLicensee);
    if (filterDestino.trim()) q = q.ilike("nome", `%${filterDestino.trim()}%`);
    const { data } = await q.limit(200);
    setClienteImgs((data ?? []) as ImgRow[]);
    setLoading(false);
  }, [filterLicensee, filterDestino]);

  const loadLicensees = useCallback(async () => {
    const { data } = await supabase
      .from("licensees")
      .select("id,name")
      .order("name");
    setLicensees((data ?? []) as Licensee[]);
  }, []);

  useEffect(() => { loadBase(); loadLicensees(); }, [loadBase, loadLicensees]);
  useEffect(() => { if (tab === "clientes") loadClientes(); }, [tab, loadClientes]);

  async function handleDelete(row: ImgRow) {
    if (!confirm(`Deletar imagem "${row.nome}"?`)) return;
    setDeleting(row.id);
    const { error } = await supabase.from("imgfundo").delete().eq("id", row.id);
    setDeleting(null);
    if (error) { showFlash(`Erro: ${error.message}`); return; }
    if (tab === "base") setBaseImgs(p => p.filter(r => r.id !== row.id));
    else setClienteImgs(p => p.filter(r => r.id !== row.id));
    showFlash("Imagem deletada.");
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { showFlash("Selecione uma imagem."); return; }
    const destino = uploadDestino.trim().toUpperCase();
    if (!destino) { showFlash("Informe o destino."); return; }

    if (uploadFormato === "tv") {
      const qCheck = supabase
        .from("imgfundo")
        .select("id", { count: "exact", head: true })
        .eq("nome", destino)
        .eq("formato", "tv");
      if (uploadTarget === "cliente" && uploadLicenseeId) {
        qCheck.eq("licensee_id", uploadLicenseeId);
      } else {
        qCheck.is("licensee_id", null);
      }
      const { count } = await qCheck;
      if ((count ?? 0) >= 2) {
        showFlash(`Limite atingido: máximo 2 imagens TV por destino (${destino}).`);
        return;
      }
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const upRes = await fetch("/api/cloudinary/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, folder: "cea5490a26896dd7b98f9ab8e6127b05c4" }),
      });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error || "Upload falhou");

      const { data: { user } } = await supabase.auth.getUser();
      const basePayload = {
        nome: destino,
        url: upData.secure_url,
        public_id: upData.public_id,
        uploaded_by: user?.id ?? null,
        formato: uploadFormato,
        tipo: uploadTipo,
        position_y: uploadFormato === "feed" ? uploadPositionY : null,
        form_type: uploadFormType,
      };

      let inserts: object[];
      if (uploadTarget === "adm") {
        inserts = [{ ...basePayload, licensee_id: null, store_id: null }];
      } else if (uploadSelectedStoreIds.length === 0) {
        inserts = [{ ...basePayload, licensee_id: uploadLicenseeId, store_id: null }];
      } else {
        inserts = uploadSelectedStoreIds.map(storeId => ({
          ...basePayload, licensee_id: uploadLicenseeId, store_id: storeId,
        }));
      }

      const { error: dbErr } = await supabase.from("imgfundo").insert(inserts);
      if (dbErr) throw new Error(dbErr.message);

      const count = inserts.length;
      showFlash(`${count > 1 ? `${count} imagens` : `Imagem "${destino}"`} (${uploadFormato.toUpperCase()}) adicionada${count > 1 ? "s" : ""}.`);
      const wasCliente = uploadTarget === "cliente";
      resetModal();
      if (wasCliente) loadClientes();
      else loadBase();
    } catch (err) {
      showFlash(`Erro: ${err instanceof Error ? err.message : "falha"}`);
    } finally {
      setUploading(false);
    }
  }

  const baseByDestino = baseImgs.reduce<Record<string, ImgRow[]>>((acc, r) => {
    (acc[r.nome] ??= []).push(r);
    return acc;
  }, {});

  const licenseeName = (id: string) =>
    licensees.find(l => l.id === id)?.name ?? id.slice(0, 8);

  return (
    <div style={{ minHeight: "100vh", padding: "0 0 40px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#EEF2FF", margin: 0 }}>
            Banco de Imagens por Destino
          </h1>
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
            Imagens de fundo utilizadas automaticamente ao publicar.
          </p>
        </div>

        {/* Flash */}
        {flash && (
          <div style={{
            background: flash.startsWith("Erro") ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
            border: `1px solid ${flash.startsWith("Erro") ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
            borderRadius: 8, padding: "10px 16px", fontSize: 12,
            color: flash.startsWith("Erro") ? "#f87171" : "#22C55E", marginBottom: 20,
          }}>
            {flash.startsWith("Erro") ? "✕ " : "✓ "}{flash}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {(["base", "clientes"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: "pointer", border: "none",
              background: tab === t ? "#D4A843" : "rgba(255,255,255,0.05)",
              color: tab === t ? "#000" : "#94A3B8",
            }}>
              {t === "base" ? "Base (ADM)" : "Por Cliente"}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => openModal(tab === "clientes" ? (filterLicensee || "") : "")}
            style={btnPrimary}
          >
            + Adicionar imagem
          </button>
        </div>

        {/* Tab Base */}
        {tab === "base" && (
          loading ? (
            <p style={{ fontSize: 12, color: "#94A3B8" }}>Carregando...</p>
          ) : Object.keys(baseByDestino).length === 0 ? (
            <div style={{ ...cardStyle, textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
              Nenhuma imagem base cadastrada.
            </div>
          ) : Object.entries(baseByDestino).map(([destino, rows]) => (
            <div key={destino} style={{ ...cardStyle, marginBottom: 12 }}>
              <p style={labelStyle}>{destino}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {rows.map(row => (
                  <div key={row.id} style={{ position: "relative", width: 140 }}>
                    <img
                      src={row.url}
                      alt={row.nome}
                      style={{ width: 140, height: 90, objectFit: "cover", borderRadius: 6, display: "block" }}
                    />
                    <div style={{
                      position: "absolute", top: 4, left: 4,
                      background: "rgba(0,0,0,0.75)", borderRadius: 4,
                      padding: "2px 6px", fontSize: 9, fontWeight: 700,
                      color: row.formato === "tv" ? "#D4A843" : "#60A5FA",
                      textTransform: "uppercase",
                    }}>
                      {row.formato || "stories"}
                    </div>
                    <button
                      onClick={() => handleDelete(row)}
                      disabled={deleting === row.id}
                      style={{ ...btnDanger, position: "absolute", top: 4, right: 4, padding: "2px 6px", fontSize: 9 }}
                    >
                      {deleting === row.id ? "..." : "✕"}
                    </button>
                    {row.form_type && row.form_type !== "todos" && (
                      <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
                        <FormTypeBadge value={row.form_type} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Tab Por Cliente */}
        {tab === "clientes" && (
          <>
            {/* Filtros */}
            <div style={{ ...cardStyle, marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <p style={{ ...labelStyle, marginBottom: 6 }}>Cliente (Licensee)</p>
                <select
                  value={filterLicensee}
                  onChange={e => setFilterLicensee(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">Todos</option>
                  {licensees.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ ...labelStyle, marginBottom: 6 }}>Destino</p>
                <input
                  type="text"
                  placeholder="Filtrar por destino..."
                  value={filterDestino}
                  onChange={e => setFilterDestino(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <button onClick={loadClientes} style={btnGhost}>Filtrar</button>
            </div>

            {loading ? (
              <p style={{ fontSize: 12, color: "#94A3B8" }}>Carregando...</p>
            ) : clienteImgs.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                Nenhuma imagem encontrada.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {clienteImgs.map(row => (
                  <div key={row.id} style={{ ...cardStyle, padding: 12, position: "relative" }}>
                    <img
                      src={row.url}
                      alt={row.nome}
                      style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 6, marginBottom: 8, display: "block" }}
                    />
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#EEF2FF", marginBottom: 2 }}>{row.nome}</div>
                    <div style={{ fontSize: 10, color: "#94A3B8" }}>
                      {row.licensee_id ? licenseeName(row.licensee_id) : "ADM"}
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(148,163,184,0.6)", marginTop: 2 }}>
                      {row.formato?.toUpperCase() || "STORIES"} · {new Date(row.created_at).toLocaleDateString("pt-BR")}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                      <div style={{
                        background: row.formato === "tv" ? "rgba(212,168,67,0.15)" : "rgba(96,165,250,0.15)",
                        border: `1px solid ${row.formato === "tv" ? "rgba(212,168,67,0.3)" : "rgba(96,165,250,0.3)"}`,
                        borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 700,
                        color: row.formato === "tv" ? "#D4A843" : "#60A5FA",
                      }}>
                        {row.formato?.toUpperCase() || "STORIES"}
                      </div>
                      {row.formato === "feed" && row.position_y != null && (
                        <div style={{
                          background: "rgba(52,211,153,0.12)",
                          border: "1px solid rgba(52,211,153,0.25)",
                          borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 700,
                          color: "#34D399",
                        }}>
                          pos: {row.position_y}%
                        </div>
                      )}
                      <FormTypeBadge value={row.form_type} />
                    </div>
                    <button
                      onClick={() => handleDelete(row)}
                      disabled={deleting === row.id}
                      style={{ ...btnDanger, position: "absolute", top: 8, right: 8 }}
                    >
                      {deleting === row.id ? "..." : "✕"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal de upload */}
        {showModal && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
            padding: "20px 0",
          }}
            onClick={e => { if (e.target === e.currentTarget) resetModal(); }}
          >
            <div style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: "32px 36px",
              width: tourStep === "tour" ? 460 : 420,
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflowY: "auto",
            }}>

              {/* Passo 1 — Tour */}
              {tourStep === "tour" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>📸</span>
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: "#EEF2FF", margin: 0 }}>
                      Como funciona o Banco de Imagens
                    </h2>
                  </div>
                  <p style={{ fontSize: 11, color: "#94A3B8", marginBottom: 24 }}>
                    Passo 1 de 2 — leia antes de cadastrar
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {TOUR_STEPS.map(step => (
                      <div key={step.num} style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10, padding: "14px 16px",
                      }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 15, lineHeight: 1 }}>{step.num}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#EEF2FF" }}>
                            {step.title}
                          </span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
                          {step.items.map((item, i) => (
                            <li key={i} style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.7 }}>
                              {item}
                            </li>
                          ))}
                        </ul>
                        {step.warning && (
                          <div style={{
                            marginTop: 8, padding: "6px 10px",
                            background: "rgba(251,191,36,0.08)",
                            border: "1px solid rgba(251,191,36,0.2)",
                            borderRadius: 6, fontSize: 10,
                            color: "#FCD34D",
                          }}>
                            ⚠ {step.warning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      localStorage.setItem(TOUR_KEY, "1");
                      setTourStep("form");
                    }}
                    style={{ ...btnPrimary, width: "100%", marginTop: 24, fontSize: 13, padding: "11px 0" }}
                  >
                    Entendi, continuar →
                  </button>
                </div>
              )}

              {/* Passo 2 — Formulário */}
              {tourStep === "form" && (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#EEF2FF", margin: "0 0 24px" }}>
                    Adicionar Imagem
                  </h2>

                  <div style={{ marginBottom: 16 }}>
                    <p style={labelStyle}>Tipo *</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["destino", "hotel"] as const).map(t => (
                        <button key={t} onClick={() => setUploadTipo(t)} style={{
                          flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          cursor: "pointer", border: "none",
                          background: uploadTipo === t ? "#D4A843" : "rgba(255,255,255,0.05)",
                          color: uploadTipo === t ? "#000" : "#94A3B8",
                        }}>
                          {t === "destino" ? "Destino" : "Hotel"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <p style={labelStyle}>{uploadTipo === "destino" ? "Destino (ex: CANCÚN)" : "Nome do Hotel (ex: IBEROSTAR)"} *</p>
                    <input
                      type="text"
                      placeholder={uploadTipo === "destino" ? "ex. CANCÚN" : "ex. IBEROSTAR"}
                      value={uploadDestino}
                      onChange={e => setUploadDestino(e.target.value.toUpperCase())}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <p style={labelStyle}>Formato *</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["stories", "feed", "tv"] as const).map(f => (
                        <button key={f} onClick={() => setUploadFormato(f)} style={{
                          flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          cursor: "pointer", border: "none",
                          background: uploadFormato === f ? "#D4A843" : "rgba(255,255,255,0.05)",
                          color: uploadFormato === f ? "#000" : "#94A3B8",
                        }}>
                          {f === "stories" ? "Stories / Reels" : f === "feed" ? "Feed (1:1)" : "TV (16:9)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <p style={labelStyle}>Formulário</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {FORM_TYPES.map(f => (
                        <button key={f.value} onClick={() => setUploadFormType(f.value)} style={{
                          padding: "7px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          cursor: "pointer", border: "none", whiteSpace: "nowrap",
                          background: uploadFormType === f.value ? "#D4A843" : "rgba(255,255,255,0.05)",
                          color: uploadFormType === f.value ? "#000" : "#94A3B8",
                        }}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <p style={labelStyle}>Destino da imagem *</p>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      {(["adm", "cliente"] as const).map(t => (
                        <button key={t} onClick={() => {
                          setUploadTarget(t);
                          setUploadLicenseeId("");
                          setUploadStores([]);
                          setUploadSelectedStoreIds([]);
                        }} style={{
                          flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          cursor: "pointer", border: "none",
                          background: uploadTarget === t ? "#D4A843" : "rgba(255,255,255,0.05)",
                          color: uploadTarget === t ? "#000" : "#94A3B8",
                        }}>
                          {t === "adm" ? "Base ADM" : "Por Cliente"}
                        </button>
                      ))}
                    </div>

                    {uploadTarget === "cliente" && (
                      <>
                        <select
                          value={uploadLicenseeId}
                          onChange={e => {
                            setUploadLicenseeId(e.target.value);
                            loadStoresForLicensee(e.target.value);
                          }}
                          style={{ ...inputStyle, cursor: "pointer", marginBottom: 10 }}
                        >
                          <option value="">Selecione o cliente...</option>
                          {licensees.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>

                        {uploadLicenseeId && (
                          <div>
                            <p style={{ ...labelStyle, marginBottom: 8 }}>Lojas</p>
                            {loadingStores ? (
                              <p style={{ fontSize: 11, color: "#94A3B8" }}>Carregando lojas...</p>
                            ) : uploadStores.length === 0 ? (
                              <p style={{ fontSize: 11, color: "#94A3B8" }}>Nenhuma loja encontrada.</p>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={uploadSelectedStoreIds.length === 0}
                                    onChange={() => setUploadSelectedStoreIds([])}
                                    style={{ accentColor: "#D4A843", width: 14, height: 14 }}
                                  />
                                  <span style={{ fontSize: 12, color: "#EEF2FF", fontWeight: 600 }}>Todas as lojas</span>
                                </label>
                                {uploadStores.map(s => (
                                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                    <input
                                      type="checkbox"
                                      checked={uploadSelectedStoreIds.includes(s.id)}
                                      onChange={e => setUploadSelectedStoreIds(p =>
                                        e.target.checked ? [...p, s.id] : p.filter(id => id !== s.id)
                                      )}
                                      style={{ accentColor: "#D4A843", width: 14, height: 14 }}
                                    />
                                    <span style={{ fontSize: 12, color: "#94A3B8" }}>{s.name}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <p style={labelStyle}>Imagem *</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ ...inputStyle, padding: "8px 14px", cursor: "pointer" }}
                    />
                    {uploadFormato === "tv" && (
                      <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>
                        Máximo 2 imagens TV por destino por cliente.
                      </p>
                    )}
                    {uploadFormato === "feed" && (
                      <div style={{ marginTop: 14 }}>
                        {previewUrl ? (
                          <>
                            <p style={{ ...labelStyle, marginBottom: 8 }}>Posição vertical da imagem</p>
                            <div
                              style={{
                                width: 280, height: 280, overflow: "hidden", borderRadius: 8,
                                position: "relative", cursor: isDragging ? "grabbing" : "grab",
                                border: "1px solid rgba(255,255,255,0.12)",
                                userSelect: "none", touchAction: "none",
                              }}
                              onMouseDown={handlePreviewMouseDown}
                              onMouseMove={handlePreviewMouseMove}
                              onMouseUp={handlePreviewMouseUp}
                              onMouseLeave={handlePreviewMouseUp}
                              onTouchStart={handlePreviewTouchStart}
                              onTouchMove={handlePreviewTouchMove}
                              onTouchEnd={handlePreviewTouchEnd}
                            >
                              <img
                                ref={previewImgRef}
                                src={previewUrl}
                                alt="preview"
                                draggable={false}
                                style={{
                                  width: "100%", height: "100%",
                                  objectFit: "cover",
                                  objectPosition: `50% ${uploadPositionY}%`,
                                  display: "block", pointerEvents: "none",
                                }}
                              />
                            </div>
                            <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 6, textAlign: "center" }}>
                              Arraste a imagem para enquadrar · <span style={{ color: "#D4A843", fontWeight: 700 }}>{uploadPositionY}%</span>
                            </p>
                          </>
                        ) : (
                          <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>
                            Selecione uma imagem para definir o enquadramento.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handleUpload} disabled={uploading} style={{ ...btnPrimary, flex: 1, opacity: uploading ? 0.6 : 1, cursor: uploading ? "not-allowed" : "pointer" }}>
                      {uploading ? "Enviando..." : "Salvar"}
                    </button>
                    <button onClick={resetModal} style={btnGhost}>Cancelar</button>
                  </div>
                </>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
