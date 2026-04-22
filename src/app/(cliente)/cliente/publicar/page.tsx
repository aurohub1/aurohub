"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { getProfile, type FullProfile } from "@/lib/auth";
import { PublishQueueProvider } from "@/hooks/usePublishQueue";
import { useFormAdapter } from "@/components/publish/useFormAdapter";
import { PacoteForm, QuatroDestinosForm } from "@/components/publish/FormSections";
import {
  Plane, Target, Ticket, Ship, Moon, MessageSquare, Tv,
  ArrowRight, Infinity as InfinityIcon, ArrowLeft
} from "lucide-react";

const PreviewStage = dynamic(() => import("@/app/(gerente)/gerente/publicar/PreviewStage"), { ssr: false });

type FormType = "pacote"|"campanha"|"passagem"|"cruzeiro"|"anoiteceu"|"quatro_destinos";
type Format = "stories"|"feed"|"reels"|"tv";

const TIPOS = [
  { id:"pacote" as FormType,           Icon:Plane,         nome:"Pacote",        desc:"Roteiro com hotel e serviços",  color:"var(--brand-primary)" },
  { id:"campanha" as FormType,         Icon:Target,        nome:"Campanha",      desc:"Promoções e ofertas especiais", color:"#e05c1a" },
  { id:"passagem" as FormType,         Icon:Ticket,        nome:"Passagem",      desc:"Só a passagem aérea",           color:"#7c3aed" },
  { id:"cruzeiro" as FormType,         Icon:Ship,          nome:"Cruzeiro",      desc:"Roteiro marítimo completo",     color:"#0891b2" },
  { id:"anoiteceu" as FormType,        Icon:Moon,          nome:"Anoiteceu",     desc:"Última chamada do dia",         color:"#4f46e5" },
  { id:"quatro_destinos" as FormType,  Icon:MessageSquare, nome:"Card WhatsApp", desc:"Arte para grupos e listas",     color:"#16a34a" },
];

const FORMAT_DIMS: Record<Format, [number,number]> = {
  stories:[1080,1920], feed:[1080,1080], reels:[1080,1920], tv:[1920,1080],
};
const FORMAT_LABELS: Record<Format, string> = {
  stories:"Stories", feed:"Feed", reels:"Reels", tv:"TV",
};

interface TemplateRow {
  id: string;
  name: string;
  formType: FormType;
  format: Format;
  schema: any;
  width: number;
  height: number;
}

const DEFAULTS = { formapagamento:"Cartão de Crédito", tipovoo:"( Voo Direto )" };

export default function ClientePublicarPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<FullProfile|null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [tab, setTab] = useState<FormType>("pacote");
  const [format, setFormat] = useState<Format>("stories");
  const [phase, setPhase] = useState<"selector"|"form">("selector");
  const [animOut, setAnimOut] = useState(false);
  const [formCache, setFormCache] = useState<Record<FormType, Record<string,string>>>({
    pacote:{...DEFAULTS}, campanha:{...DEFAULTS}, passagem:{...DEFAULTS},
    cruzeiro:{...DEFAULTS}, anoiteceu:{...DEFAULTS}, quatro_destinos:{...DEFAULTS},
  });
  const [badgeCache] = useState<Record<FormType,Record<string,boolean>>>({
    pacote:{}, campanha:{}, passagem:{}, cruzeiro:{}, anoiteceu:{}, quatro_destinos:{},
  });

  useEffect(() => {
    getProfile(supabase).then(p => {
      setProfile(p);
      if (p?.licensee_id) loadTemplates(p.licensee_id);
    });
  }, []);

  async function loadTemplates(licenseeId: string) {
    const { data } = await supabase
      .from("form_templates")
      .select("*")
      .or(`is_base.eq.true,licensee_id.eq.${licenseeId}`)
      .eq("active", true)
      .order("form_type").order("format").order("name");
    if (data) setTemplates(data.map((r:any) => ({
      id: r.id,
      name: r.name,
      formType: r.form_type || "pacote",
      format: r.format || "stories",
      schema: r.schema || { elements:[], background:"#0E1520", duration:5 },
      width: r.width || 1080,
      height: r.height || 1920,
    })));
  }

  const currentTemplate = useMemo(() =>
    templates.find(t => t.formType === tab && t.format === format) ||
    templates.find(t => t.formType === tab),
  [templates, tab, format]);

  const templateBinds = useMemo(() => {
    const binds = new Set<string>();
    if (!currentTemplate?.schema?.elements) return binds;
    for (const el of currentTemplate.schema.elements) {
      if (el.bindParam) binds.add(el.bindParam);
      if (el.imageBind) binds.add(el.imageBind);
    }
    return binds;
  }, [currentTemplate]);

  const values = formCache[tab] ?? DEFAULTS;
  const badges = badgeCache[tab] ?? {};

  const setField = useCallback((k: string, v: string) => {
    setFormCache(c => ({ ...c, [tab]: { ...c[tab], [k]: v } }));
  }, [tab]);

  const { fields, set, servicos, setServicos } = useFormAdapter({
    tab, values, badges,
    setField,
    setBadge: () => {},
  });

  const previewValues = useMemo(() => {
    const merged: Record<string,string> = { ...(values ?? {}) };
    for (const [k,v] of Object.entries(badges ?? {})) merged[k] = v ? "true" : "";
    return merged;
  }, [values, badges]);

  function goToForm(tipo: FormType) {
    setAnimOut(true);
    setTimeout(() => { setTab(tipo); setPhase("form"); setAnimOut(false); }, 260);
  }
  function goBack() {
    setAnimOut(true);
    setTimeout(() => { setPhase("selector"); setAnimOut(false); }, 260);
  }
  function switchTab(t: FormType) {
    setTab(t);
    const fmts = templates.filter(x => x.formType === t).map(x => x.format);
    if (fmts.length && !fmts.includes(format)) setFormat(fmts[0]);
  }

  const visibleFormats = useMemo(() => {
    const s = new Set(templates.filter(t => t.formType === tab).map(t => t.format));
    return (["stories","feed","reels","tv"] as Format[]).filter(f => s.has(f));
  }, [templates, tab]);

  const schema = currentTemplate?.schema ?? { elements:[], background:"#0E1520", duration:5 };
  const [pw, ph] = FORMAT_DIMS[format];

  // ===== TELA DE SELEÇÃO =====
  if (phase === "selector") return (
    <div style={{ padding:"24px", maxWidth:"960px", margin:"0 auto", transition:"opacity .26s, transform .26s", opacity:animOut?0:1, transform:animOut?"translateX(-24px)":"translateX(0)" }}>
      <h1 style={{ fontSize:"20px", fontWeight:800, color:"var(--txt1)", marginBottom:"4px" }}>Publicar</h1>
      <p style={{ fontSize:"12px", color:"var(--txt3)", marginBottom:"20px" }}>Escolha o tipo de arte para criar</p>

      {/* Plano */}
      <div style={{ background:"var(--bg2)", border:"1px solid var(--bdr)", borderRadius:"12px", padding:"12px 20px", marginBottom:"20px", display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:"11px", fontWeight:700, color:"var(--brand-primary)", textTransform:"uppercase", letterSpacing:".08em" }}>Plano Pro</div>
          <div style={{ fontSize:"10px", color:"var(--txt3)", marginTop:"1px" }}>Posts de hoje</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:"24px" }}>
          {[
            { l:"Stories", v:"∞", c:"var(--brand-primary)" },
            { l:"Feed",    v:"0/5", c:"#f59e0b" },
            { l:"Reels",   v:"0/10", c:"#22c55e" },
          ].map(x => (
            <div key={x.l} style={{ textAlign:"center" }}>
              <div style={{ fontSize:"14px", fontWeight:800, color:x.c, lineHeight:1 }}>{x.v}</div>
              <div style={{ fontSize:"9px", color:"var(--txt3)", textTransform:"uppercase", letterSpacing:".06em", marginTop:"2px" }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:"12px" }}>
        {TIPOS.map((t, i) => (
          <button key={t.id} onClick={() => goToForm(t.id)}
            style={{ background:"var(--bg2)", border:"1.5px solid var(--bdr)", borderRadius:"14px", padding:"18px 14px 14px", cursor:"pointer", textAlign:"left", display:"flex", flexDirection:"column", gap:"10px", transition:"all .2s", animation:`fadeUp .3s ease ${i*.05}s both`, position:"relative", overflow:"hidden" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=t.color; e.currentTarget.style.transform="translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="var(--bdr)"; e.currentTarget.style.transform="translateY(0)"; }}
          >
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:t.color }} />
            <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:`color-mix(in srgb, ${t.color} 12%, transparent)`, display:"flex", alignItems:"center", justifyContent:"center", color:t.color }}>
              <t.Icon size={17} strokeWidth={2} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"13px", fontWeight:700, color:"var(--txt1)" }}>{t.nome}</div>
              <div style={{ fontSize:"11px", color:"var(--txt3)", marginTop:"2px", lineHeight:1.4 }}>{t.desc}</div>
            </div>
            <ArrowRight size={12} style={{ alignSelf:"flex-end", color:"var(--txt3)" }} />
          </button>
        ))}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );

  // ===== TELA DO FORMULÁRIO =====
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", transition:"opacity .26s", opacity:animOut?0:1 }}>

      {/* TOPNAV */}
      <div style={{ display:"flex", alignItems:"center", height:"46px", background:"var(--bg1)", borderBottom:"1px solid var(--bdr)", flexShrink:0, paddingLeft:"8px", gap:"4px", overflowX:"auto" }}>
        <button onClick={goBack} style={{ display:"flex", alignItems:"center", gap:"5px", background:"none", border:"none", color:"var(--txt3)", fontSize:"12px", fontWeight:600, cursor:"pointer", padding:"8px 10px", borderRadius:"8px", flexShrink:0 }}>
          <ArrowLeft size={14} /> Voltar
        </button>
        <div style={{ width:"1px", height:"20px", background:"var(--bdr)", margin:"0 4px", flexShrink:0 }} />
        {TIPOS.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)}
            style={{ display:"flex", alignItems:"center", gap:"4px", padding:"0 12px", height:"46px", border:"none", background:"none", fontSize:"11px", fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", color: tab===t.id ? "var(--brand-primary)" : "var(--txt3)", cursor:"pointer", position:"relative", flexShrink:0, whiteSpace:"nowrap", borderBottom: tab===t.id ? "2px solid var(--brand-primary)" : "2px solid transparent", transition:"color .15s" }}
          >
            <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:t.color }} />
            {t.nome}
          </button>
        ))}
      </div>

      {/* BODY */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* FORMULÁRIO */}
        <div style={{ width:"340px", flexShrink:0, background:"var(--bg1)", borderRight:"1px solid var(--bdr)", display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Pills formato + legenda */}
          <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 12px", borderBottom:"1px solid var(--bdr)", flexShrink:0, flexWrap:"wrap" }}>
            {visibleFormats.map(f => (
              <button key={f} onClick={() => setFormat(f)}
                style={{ padding:"4px 12px", borderRadius:"20px", border:"1px solid", borderColor: format===f ? "var(--brand-primary)" : "var(--bdr)", background: format===f ? "var(--brand-primary)" : "transparent", color: format===f ? "#fff" : "var(--txt3)", fontSize:"10px", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", cursor:"pointer", transition:"all .15s" }}
              >{FORMAT_LABELS[f]}</button>
            ))}
          </div>

          {/* Campos */}
          <div style={{ flex:1, overflowY:"auto", padding:"12px", display:"flex", flexDirection:"column", gap:"10px" }}>
            {!currentTemplate ? (
              <div style={{ padding:"24px", textAlign:"center", color:"var(--txt3)", fontSize:"12px" }}>
                Nenhum template de {tab} disponível.
              </div>
            ) : tab === "pacote" ? (
              <PacoteForm
                fields={fields} set={set} servicos={servicos} setServicos={setServicos}
                today={new Date().toISOString().slice(0,10)}
                loadDestinos={async () => []}
                loadHoteis={async () => []}
                binds={templateBinds}
              />
            ) : tab === "quatro_destinos" ? (
              <QuatroDestinosForm
                fields={fields} set={set}
                today={new Date().toISOString().slice(0,10)}
                binds={templateBinds}
              />
            ) : (
              <div style={{ padding:"24px", textAlign:"center", color:"var(--txt3)", fontSize:"12px" }}>
                Formulário de {tab} em breve.
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding:"12px", borderTop:"1px solid var(--bdr)", display:"flex", flexDirection:"column", gap:"6px", flexShrink:0 }}>
            <button style={{ width:"100%", padding:"11px", borderRadius:"10px", border:"none", background:"linear-gradient(135deg, var(--brand-primary), var(--brand-secondary, #2D7DD2))", color:"#fff", fontSize:"13px", fontWeight:700, cursor:"pointer" }}>
              ✈ Publicar no Instagram
            </button>
            <div style={{ display:"flex", gap:"6px" }}>
              <button style={{ flex:1, padding:"8px", borderRadius:"8px", border:"1px solid var(--bdr)", background:"transparent", color:"var(--txt3)", fontSize:"11px", fontWeight:600, cursor:"pointer" }}>🗑 Limpar</button>
              <button style={{ flex:1, padding:"8px", borderRadius:"8px", border:"1px solid var(--bdr)", background:"transparent", color:"var(--txt3)", fontSize:"11px", fontWeight:600, cursor:"pointer" }}>⬇ Download</button>
            </div>
          </div>

          {/* Contadores */}
          <div style={{ display:"flex", gap:"14px", padding:"6px 12px", borderTop:"1px solid var(--bdr)", flexShrink:0 }}>
            {[{l:"Stories",c:"var(--brand-primary)"},{l:"Feed",c:"#f59e0b"},{l:"Reels",c:"#22c55e"}].map(x => (
              <div key={x.l} style={{ display:"flex", alignItems:"center", gap:"4px", fontSize:"10px", color:"var(--txt3)" }}>
                <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:x.c }} />
                {x.l} <b style={{ color:"var(--txt2)" }}>0∞</b>
              </div>
            ))}
          </div>
        </div>

        {/* PREVIEW */}
        <div style={{ flex:1, background:"var(--bg0)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid var(--bdr)", flexShrink:0 }}>
            <span style={{ fontSize:"10px", fontWeight:700, color:"var(--txt3)", textTransform:"uppercase", letterSpacing:".1em" }}>Preview ao vivo</span>
            <span style={{ fontSize:"10px", color:"var(--txt3)", background:"var(--bg2)", padding:"3px 8px", borderRadius:"6px", border:"1px solid var(--bdr)" }}>{pw} × {ph}</span>
          </div>
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", overflow:"hidden" }}>
            <PreviewStage schema={schema} width={pw} height={ph} values={previewValues} maxDisplay={420} />
          </div>
        </div>

      </div>
    </div>
  );
}
