"use client";

import { useState, useEffect } from "react";
import { PublishQueueProvider } from "@/hooks/usePublishQueue";
import GerentePublicar from "@/app/(gerente)/gerente/publicar/page";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import {
  Plane, Target, Ticket, Ship, Moon, MessageSquare,
  Tv, ArrowRight, Infinity as InfinityIcon
} from "lucide-react";

type FormType = "pacote"|"campanha"|"passagem"|"cruzeiro"|"anoiteceu"|"quatro_destinos";

const TIPOS = [
  { id:"pacote" as FormType,          Icon:Plane,         nome:"Pacote",        desc:"Roteiro com hotel e serviços", color:"var(--brand-primary)" },
  { id:"campanha" as FormType,        Icon:Target,        nome:"Campanha",      desc:"Promoções e ofertas especiais", color:"#e05c1a" },
  { id:"passagem" as FormType,        Icon:Ticket,        nome:"Passagem",      desc:"Só a passagem aérea",          color:"#7c3aed" },
  { id:"cruzeiro" as FormType,        Icon:Ship,          nome:"Cruzeiro",      desc:"Roteiro marítimo completo",    color:"#0891b2" },
  { id:"anoiteceu" as FormType,       Icon:Moon,          nome:"Anoiteceu",     desc:"Última chamada do dia",        color:"#4f46e5" },
  { id:"quatro_destinos" as FormType, Icon:MessageSquare, nome:"Card WhatsApp", desc:"Arte para grupos e listas",   color:"#16a34a" },
];

interface PostCount { stories:number; feed:number; reels:number; tv:number; }

export default function ClientePublicarPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<FormType|null>(null);
  const [phase, setPhase] = useState<"in"|"out">("in");
  const [posts, setPosts] = useState<PostCount>({ stories:0, feed:0, reels:0, tv:0 });
  const [limits, setLimits] = useState({ stories:null as number|null, feed:5, reels:10, tv:0 });

  useEffect(() => {
    getProfile(supabase).then(setProfile);
  }, []);

  useEffect(() => {
    if (!profile?.licensee_id) return;
    const today = new Date().toISOString().slice(0,10);
    supabase
      .from("post_logs")
      .select("format")
      .eq("licensee_id", profile.licensee_id)
      .gte("created_at", today + "T00:00:00")
      .then(({ data }) => {
        if (!data) return;
        const c = { stories:0, feed:0, reels:0, tv:0 };
        data.forEach((r:any) => { if (r.format in c) c[r.format as keyof PostCount]++; });
        setPosts(c);
      });
  }, [profile]);

  function selecionarTipo(id: FormType) {
    setPhase("out");
    setTimeout(() => { setSelectedTipo(id); setPhase("in"); }, 280);
  }

  function voltar() {
    setPhase("out");
    setTimeout(() => { setSelectedTipo(null); setPhase("in"); }, 280);
  }

  if (selectedTipo) {
    return (
      <div style={{ opacity: phase==="in"?1:0, transform: phase==="in"?"translateX(0)":"translateX(40px)", transition:"opacity .28s, transform .28s", height:"100%" }}>
        <PublishQueueProvider>
          <GerentePublicar defaultTab={selectedTipo} onVoltar={voltar} />
        </PublishQueueProvider>
      </div>
    );
  }

  const cntItems = [
    { label:"Stories", val:posts.stories, limit:limits.stories, color:"var(--brand-primary)" },
    { label:"Feed",    val:posts.feed,    limit:limits.feed,    color:"#f59e0b" },
    { label:"Reels",   val:posts.reels,   limit:limits.reels,   color:"#22c55e" },
    { label:"TV",      val:posts.tv,      limit:limits.tv,      color:"#e05c1a" },
  ];

  return (
    <div style={{ opacity: phase==="in"?1:0, transform: phase==="in"?"translateX(0)":"translateX(-32px)", transition:"opacity .28s, transform .28s", padding:"24px", maxWidth:"900px", margin:"0 auto" }}>

      {/* Título */}
      <div style={{ marginBottom:"20px" }}>
        <h1 style={{ fontSize:"20px", fontWeight:800, color:"var(--txt1)" }}>Publicar</h1>
        <p style={{ fontSize:"12px", color:"var(--txt3)", marginTop:"3px" }}>Escolha o tipo de arte para criar</p>
      </div>

      {/* Barra do plano */}
      <div style={{ background:"var(--bg2)", border:"1px solid var(--bdr)", borderRadius:"12px", padding:"12px 16px", marginBottom:"20px", display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:"11px", fontWeight:700, color:"var(--brand-primary)", textTransform:"uppercase", letterSpacing:".08em" }}>Plano Pro</div>
          <div style={{ fontSize:"10px", color:"var(--txt3)", marginTop:"2px" }}>Posts de hoje</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:"20px", flexWrap:"wrap" }}>
          {cntItems.map(c => {
            const pct = c.limit ? (c.val/c.limit)*100 : 30;
            const warn = c.limit && c.val >= c.limit;
            return (
              <div key={c.label} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", minWidth:"44px" }}>
                <div style={{ fontSize:"14px", fontWeight:800, color: warn?"#f87171": c.limit===0?"var(--txt3)":c.color, lineHeight:1 }}>
                  {c.limit===null ? <InfinityIcon size={16}/> : c.limit===0 ? "—" : `${c.val}/${c.limit}`}
                </div>
                <div style={{ fontSize:"9px", color:"var(--txt3)", textTransform:"uppercase", letterSpacing:".06em" }}>{c.label}</div>
                {c.limit && c.limit>0 && (
                  <div style={{ width:"36px", height:"2px", background:"var(--bg3)", borderRadius:"2px", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:warn?"#f87171":c.color, borderRadius:"2px", transition:"width .5s" }}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid de tipos */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(155px, 1fr))", gap:"12px" }}>
        {TIPOS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => selecionarTipo(t.id)}
            style={{
              background:"var(--bg2)", border:"1.5px solid var(--bdr)", borderRadius:"14px",
              padding:"18px 16px 14px", cursor:"pointer", textAlign:"left",
              display:"flex", flexDirection:"column", gap:"10px",
              transition:"border-color .2s, transform .2s, box-shadow .2s",
              animation:`fadeUp .35s ease ${i*0.05}s both`,
              position:"relative", overflow:"hidden",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.borderColor = t.color;
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "0 8px 24px rgba(0,0,0,.25)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.borderColor = "var(--bdr)";
              el.style.transform = "translateY(0)";
              el.style.boxShadow = "none";
            }}
          >
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:t.color }}/>
            <div style={{ width:"38px", height:"38px", borderRadius:"10px", background:`color-mix(in srgb, ${t.color} 12%, transparent)`, display:"flex", alignItems:"center", justifyContent:"center", color:t.color }}>
              <t.Icon size={18} strokeWidth={2}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"13px", fontWeight:700, color:"var(--txt1)" }}>{t.nome}</div>
              <div style={{ fontSize:"11px", color:"var(--txt3)", marginTop:"3px", lineHeight:1.4 }}>{t.desc}</div>
            </div>
            <div style={{ alignSelf:"flex-end", color:"var(--txt3)" }}><ArrowRight size={13}/></div>
          </button>
        ))}
      </div>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
