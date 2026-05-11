// hooks/useRoteiro.ts
// ─────────────────────────────────────────────────────────────────────────────
// Hook central do AuroRoteiro.
// Gerencia: estado do formulário, extração de arquivo, geração streaming,
// download e (futuramente) envio para Drive.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from "react";

// ── TYPES ─────────────────────────────────────────────────────────────────────

export const STYLES = [
  { id: "cultural",    label: "Cultural",    icon: "🏛️" },
  { id: "aventura",    label: "Aventura",    icon: "🧗" },
  { id: "relaxamento", label: "Relaxamento", icon: "🏖️" },
  { id: "gastronomia", label: "Gastronomia", icon: "🍷" },
  { id: "romantico",   label: "Romântico",   icon: "💑" },
  { id: "familia",     label: "Família",     icon: "👨‍👩‍👧" },
  { id: "cruzeiro",    label: "Cruzeiro",    icon: "🚢" },
  { id: "ecoturismo",  label: "Ecoturismo",  icon: "🌿" },
  { id: "religioso",   label: "Religioso",   icon: "⛪" },
  { id: "negocios",    label: "Negócios",    icon: "💼" },
  { id: "mochileiro",  label: "Mochileiro",  icon: "🎒" },
  { id: "luxo",        label: "Ultra Luxo",  icon: "💎" },
] as const;

export const BUDGETS = ["Econômico", "Moderado", "Luxo", "Ultra Luxo"] as const;

export interface FormData {
  destination: string;
  days: string;
  travelers: string;
  budget: string;
  styles: string[];
  notes: string;
}

export interface PackageData {
  agencia: string; consultor: string; telefone: string;
  vooIdaOrigem: string; vooIdaDestino: string; vooIdaData: string;
  vooIdaHorario: string; vooIdaCia: string; vooIdaNum: string;
  vooVoltaOrigem: string; vooVoltaDestino: string; vooVoltaData: string;
  vooVoltaHorario: string; vooVoltaCia: string; vooVoltaNum: string;
  hotel: string; hotelCat: string; checkin: string; checkout: string; quarto: string;
  precoTotal: string; precoPessoa: string; parcelas: string;
  incTransfer: boolean; incCafe: boolean; incSeguro: boolean; incPasseios: boolean;
  obs: string;
  // contexto de faixa etária (privacidade — nunca data bruta)
  ageContext: string;
}

export interface RoteiroDay {
  title: string;
  items: string[];
}

export type Step = "form" | "pkg" | "generating" | "result";

// ── UTILS ─────────────────────────────────────────────────────────────────────

export function parseItinerary(text: string): RoteiroDay[] | null {
  const days: RoteiroDay[] = [];
  const lines = text.split("\n").filter(l => l.trim());
  let cur: RoteiroDay | null = null;

  for (const line of lines) {
    if (/^(\*?\*?dia\s*\d+)/i.test(line)) {
      if (cur) days.push(cur);
      cur = { title: line.replace(/\*\*/g, "").trim(), items: [] };
    } else if (cur && line.trim().length > 4) {
      const c = line.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "").trim();
      if (c) cur.items.push(c);
    }
  }
  if (cur) days.push(cur);
  return days.length > 0 ? days : null;
}

export function buildWhatsAppText(
  form: FormData,
  pkg: PackageData,
  parsed: RoteiroDay[] | null,
  storeName: string
): string {
  const sl = form.styles
    .map(s => STYLES.find(x => x.id === s)?.label)
    .filter(Boolean).join(", ");

  let t = storeName ? `🏢 *${storeName}*\n` : "";
  t += `✈ *ROTEIRO DE VIAGEM*\n📍 *${form.destination}* — ${form.days} dias\n`;
  t += `👥 ${form.travelers} viajante(s) | 💰 ${form.budget}\n`;
  if (sl) t += `🎯 ${sl}\n`;
  t += "\n";

  if (pkg.agencia || pkg.consultor) {
    t += `*AGÊNCIA*\n`;
    if (pkg.agencia) t += `${pkg.agencia}\n`;
    if (pkg.consultor) t += `Consultor: ${pkg.consultor}\n`;
    if (pkg.telefone) t += `📞 ${pkg.telefone}\n`;
    t += "\n";
  }

  const hasPkg = pkg.vooIdaOrigem || pkg.hotel || pkg.precoTotal;
  if (hasPkg) {
    t += `📦 *PACOTE*\n`;
    if (pkg.vooIdaOrigem) t += `✈ Ida: ${pkg.vooIdaOrigem}→${pkg.vooIdaDestino} | ${pkg.vooIdaData} ${pkg.vooIdaHorario} | ${pkg.vooIdaCia} ${pkg.vooIdaNum}\n`;
    if (pkg.vooVoltaOrigem) t += `✈ Volta: ${pkg.vooVoltaOrigem}→${pkg.vooVoltaDestino} | ${pkg.vooVoltaData} ${pkg.vooVoltaHorario}\n`;
    if (pkg.hotel) t += `🏨 ${pkg.hotel}${pkg.hotelCat ? ` (${pkg.hotelCat}★)` : ""} | ${pkg.checkin}→${pkg.checkout}${pkg.quarto ? " | " + pkg.quarto : ""}\n`;
    if (pkg.precoTotal) t += `💵 R$ ${pkg.precoTotal}${pkg.precoPessoa ? " (R$ " + pkg.precoPessoa + "/pax)" : ""}${pkg.parcelas ? " | " + pkg.parcelas : ""}\n`;
    const inc = [pkg.incTransfer && "Transfer", pkg.incCafe && "Café manhã", pkg.incSeguro && "Seguro", pkg.incPasseios && "Passeios"].filter(Boolean);
    if (inc.length) t += `✅ ${inc.join(" · ")}\n`;
    if (pkg.obs) t += `📝 ${pkg.obs}\n`;
    t += "\n";
  }

  if (parsed) {
    t += `🗺 *ROTEIRO*\n\n`;
    parsed.forEach((d, i) => {
      t += `*Dia ${i + 1}: ${d.title.replace(/^dia\s*\d+:?\s*/i, "")}*\n`;
      d.items.forEach(it => (t += `• ${it}\n`));
      t += "\n";
    });
  }

  return t.trim();
}

// ── HOOK ──────────────────────────────────────────────────────────────────────

const defaultForm: FormData = {
  destination: "", days: "7", travelers: "2",
  budget: "Moderado", styles: ["cultural"], notes: "",
};

const defaultPkg: PackageData = {
  agencia: "", consultor: "", telefone: "",
  vooIdaOrigem: "", vooIdaDestino: "", vooIdaData: "", vooIdaHorario: "", vooIdaCia: "", vooIdaNum: "",
  vooVoltaOrigem: "", vooVoltaDestino: "", vooVoltaData: "", vooVoltaHorario: "", vooVoltaCia: "", vooVoltaNum: "",
  hotel: "", hotelCat: "", checkin: "", checkout: "", quarto: "",
  precoTotal: "", precoPessoa: "", parcelas: "",
  incTransfer: false, incCafe: false, incSeguro: false, incPasseios: false,
  obs: "", ageContext: "",
};

export function useRoteiro() {
  const [step, setStep] = useState<Step>("form");
  const [activeDay, setActiveDay] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [pkg, setPkg] = useState<PackageData>(defaultPkg);
  const [parsed, setParsed] = useState<RoteiroDay[] | null>(null);
  const [streamText, setStreamText] = useState("");
  const [progress, setProgress] = useState(0);

  // upload
  const [extracting, setExtracting] = useState(false);
  const [extractErr, setExtractErr] = useState("");
  const [autoFields, setAutoFields] = useState<Record<string, boolean>>({});
  const [fileName, setFileName] = useState("");

  const progRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── form helpers ────────────────────────────────────────────────────────
  const setF = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));
  const setP = <K extends keyof PackageData>(k: K, v: PackageData[K]) =>
    setPkg(p => ({ ...p, [k]: v }));
  const toggleStyle = (id: string) =>
    setForm(f => ({
      ...f,
      styles: f.styles.includes(id) ? f.styles.filter(s => s !== id) : [...f.styles, id],
    }));
  const isAuto = (k: string) => !!autoFields[k];

  // ── extract from file ────────────────────────────────────────────────────
  const extractFromFile = useCallback(async (file: File) => {
    const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      setExtractErr("Formato não suportado. Use PDF, JPG ou PNG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setExtractErr("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setExtracting(true);
    setExtractErr("");
    setFileName(file.name);
    setAutoFields({});

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/roteiro/extract", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Erro na extração");

      const ext = json.data;
      const newAuto: Record<string, boolean> = {};

      const FORM_KEYS: (keyof FormData)[] = ["destination", "days", "travelers", "budget", "styles", "notes"];
      const PKG_KEYS: (keyof PackageData)[] = [
        "agencia", "consultor", "telefone",
        "vooIdaOrigem", "vooIdaDestino", "vooIdaData", "vooIdaHorario", "vooIdaCia", "vooIdaNum",
        "vooVoltaOrigem", "vooVoltaDestino", "vooVoltaData", "vooVoltaHorario", "vooVoltaCia", "vooVoltaNum",
        "hotel", "hotelCat", "checkin", "checkout", "quarto",
        "precoTotal", "precoPessoa", "parcelas",
        "incTransfer", "incCafe", "incSeguro", "incPasseios",
        "obs", "ageContext",
      ];

      setForm(f => {
        const n = { ...f };
        FORM_KEYS.forEach(k => {
          const v = ext[k];
          if (v != null && (Array.isArray(v) ? v.length > 0 : v !== "") && v !== false) {
            (n as Record<string, unknown>)[k] = v;
            newAuto[k] = true;
          }
        });
        return n;
      });

      setPkg(p => {
        const n = { ...p };
        PKG_KEYS.forEach(k => {
          const v = ext[k];
          if (v != null && v !== "" && v !== false) {
            (n as Record<string, unknown>)[k] = v;
            newAuto[k] = true;
          }
        });
        return n;
      });

      setAutoFields(newAuto);
      if (!Object.keys(newAuto).length)
        setExtractErr("Nenhum dado encontrado. Preencha manualmente.");

    } catch (e) {
      setExtractErr("Erro ao processar o arquivo. Tente novamente.");
    } finally {
      setExtracting(false);
    }
  }, []);

  // ── generate ─────────────────────────────────────────────────────────────
  const generate = async () => {
    setStep("generating");
    setStreamText("");
    setParsed(null);
    setProgress(0);

    progRef.current = setInterval(
      () => setProgress(p => Math.min(p + Math.random() * 2.5, 90)),
      400
    );

    try {
      const res = await fetch("/api/roteiro/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...pkg }),
      });

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") break;
            try {
              const d = JSON.parse(raw);
              if (d.text) { full += d.text; setStreamText(full); }
            } catch { /* ignorar linhas malformadas */ }
          }
        }
      }

      clearInterval(progRef.current!);
      setProgress(100);
      setParsed(parseItinerary(full));
      setTimeout(() => { setStep("result"); setActiveDay(0); }, 400);

    } catch {
      clearInterval(progRef.current!);
      setStreamText("Erro ao gerar o roteiro. Tente novamente.");
    }
  };

  // ── download txt ─────────────────────────────────────────────────────────
  const downloadTxt = (waText: string, destination: string) => {
    const blob = new Blob([waText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roteiro-${destination.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── google drive (desabilitado — implementado mas não ativo) ─────────────
  // TODO: ativar quando integração Google Drive for liberada pelo ADM
  // const sendToDrive = async (content: string, fileName: string) => {
  //   await fetch("/api/drive/roteiro", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ content, fileName }),
  //   });
  // };

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep("form");
    setStreamText("");
    setParsed(null);
    setProgress(0);
    setAutoFields({});
    setFileName("");
    setExtractErr("");
    setForm(defaultForm);
    setPkg(defaultPkg);
    setActiveDay(0);
  };

  return {
    // state
    step, setStep,
    activeDay, setActiveDay,
    form, pkg,
    parsed, streamText, progress,
    extracting, extractErr, autoFields, fileName,
    // helpers
    setF, setP, toggleStyle, isAuto,
    autoCount: Object.keys(autoFields).length,
    // actions
    extractFromFile, generate, reset, downloadTxt,
  };
}
