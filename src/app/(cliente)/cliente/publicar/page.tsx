"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { useFormAdapter } from "@/components/publish/useFormAdapter";
import { PacoteForm, CardWhatsAppForm, AnoiteceuForm } from "@/components/publish/FormSections";
import { Plane, Target, Ticket, Ship, Moon, MessageSquare, ArrowLeft } from "lucide-react";

const PreviewStage = dynamic(
  () => import("@/app/(gerente)/gerente/publicar/PreviewStage"),
  { ssr: false }
);

type FormType = "pacote"|"campanha"|"passagem"|"cruzeiro"|"anoiteceu"|"card_whatsapp";
type Format = "stories"|"feed"|"reels"|"tv";

const TIPOS = [
  { id:"pacote" as FormType,          Icon:Plane,         nome:"Pacote",        desc:"Roteiro com hotel e serviços",  color:"var(--brand-primary)" },
  { id:"campanha" as FormType,        Icon:Target,        nome:"Campanha",      desc:"Promoções e ofertas especiais", color:"#e05c1a" },
  { id:"passagem" as FormType,        Icon:Ticket,        nome:"Passagem",      desc:"Só a passagem aérea",           color:"#7c3aed" },
  { id:"cruzeiro" as FormType,        Icon:Ship,          nome:"Cruzeiro",      desc:"Roteiro marítimo completo",     color:"#0891b2" },
  { id:"anoiteceu" as FormType,       Icon:Moon,          nome:"Anoiteceu",     desc:"Última chamada do dia",         color:"#4f46e5" },
  { id:"card_whatsapp" as FormType, Icon:MessageSquare, nome:"Card WhatsApp", desc:"Arte para grupos e listas",     color:"#16a34a" },
];

const FORMAT_DIMS: Record<Format,[number,number]> = {
  stories:[1080,1920], feed:[1080,1080], reels:[1080,1920], tv:[1920,1080],
};
const FORMAT_LABELS: Record<Format,string> = {
  stories:"Stories", feed:"Feed", reels:"Reels", tv:"TV",
};
const DEFAULTS = { formapagamento:"Cartão de Crédito", tipovoo:"( Voo Direto )" };

function normalizar(s:string){return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();}
function slugify(s:string){return normalizar(s).replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");}
function proximaImagem(key:string,urls:string[]):string{
  if(!urls.length)return"";
  try{const i=localStorage.getItem("img_idx_"+key);const idx=i?(parseInt(i)+1)%urls.length:0;localStorage.setItem("img_idx_"+key,String(idx));return urls[idx];}
  catch{return urls[0];}
}
function capitalizeBR(s:string){
  const skip=new Set(["de","da","do","das","dos","e","em","a","o","as","os"]);
  return s.toLowerCase().split(" ").map((w,i)=>(i===0||!skip.has(w))?w.charAt(0).toUpperCase()+w.slice(1):w).join(" ");
}

interface TemplateRow{id:string;name:string;formType:FormType;format:Format;schema:any;width:number;height:number;}

export default function ClientePublicarPage() {
  const [profile, setProfile] = useState<FullProfile|null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [feriados, setFeriados] = useState<string[]>([]);
  const [tab, setTab] = useState<FormType>("pacote");
  const [format, setFormat] = useState<Format>("stories");
  const [phase, setPhase] = useState<"selector"|"form">("selector");
  const [animOut, setAnimOut] = useState(false);
  const [formCache, setFormCache] = useState<Record<FormType,Record<string,string>>>({
    pacote:{...DEFAULTS},campanha:{...DEFAULTS},passagem:{...DEFAULTS},
    cruzeiro:{...DEFAULTS},anoiteceu:{...DEFAULTS},card_whatsapp:{...DEFAULTS},
  });
  const [badgeCache, setBadgeCache] = useState<Record<FormType,Record<string,boolean>>>({
    pacote:{},campanha:{},passagem:{},cruzeiro:{},anoiteceu:{},card_whatsapp:{},
  });
  const destinoDataRef = useRef<{nome:string;url:string}[]|null>(null);
  const hotelDataRef = useRef<{nome:string;url:string}[]|null>(null);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const tabsWrapRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  function movePill(btn: HTMLButtonElement) {
    const wrap = tabsWrapRef.current;
    const pill = pillRef.current;
    if (!wrap || !pill) return;
    const wr = wrap.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    pill.style.left = (br.left - wr.left + wrap.scrollLeft) + 'px';
    pill.style.width = br.width + 'px';
  }
  const [winH, setWinH] = useState(typeof window !== 'undefined' ? window.innerHeight : 900);
  useEffect(() => {
    const onResize = () => setWinH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const wrap = tabsWrapRef.current;
    if (!wrap) return;
    setTimeout(() => {
      const activeBtn = wrap.querySelector(`button[data-active="true"]`) as HTMLButtonElement;
      if (activeBtn) movePill(activeBtn);
    }, 300);
  }, [tab, phase]);

  useEffect(()=>{
    getProfile(supabase).then(p=>{
      setProfile(p);
      if(p?.licensee_id) loadTemplates(p.licensee_id);
    });
    supabase.from("feriados").select("nome").order("nome").then(({data})=>{
      if(data) setFeriados(data.map((r:any)=>r.nome));
    });
  },[]);


  async function loadTemplates(lid:string){
    const{data}=await supabase.from("form_templates").select("*")
      .or(`is_base.eq.true,licensee_id.eq.${lid}`)
      .eq("active",true).order("form_type").order("format").order("name");
    if(data) setTemplates(data.map((r:any)=>({
      id:r.id,name:r.name,formType:r.form_type||"pacote",
      format:r.format||"stories",
      schema:r.schema||{elements:[],background:"#0E1520",duration:5},
      width:r.width||1080,height:r.height||1920,
    })));
  }

  async function loadDestinoData(){
    if(destinoDataRef.current) return destinoDataRef.current;
    const{data}=await supabase.from("imgfundo").select("nome,url").limit(1000);
    destinoDataRef.current=(data??[]) as{nome:string;url:string}[];
    return destinoDataRef.current;
  }
  async function loadHotelData(){
    if(hotelDataRef.current) return hotelDataRef.current;
    const{data}=await supabase.from("imghotel").select("nome,url").limit(1000);
    hotelDataRef.current=(data??[]) as{nome:string;url:string}[];
    return hotelDataRef.current;
  }
  async function fetchImgFundo(destino:string){
    const rows=await loadDestinoData();
    const t=normalizar(destino);
    const m=rows.filter(r=>normalizar(r.nome)===t);
    if(!m.length) return null;
    return proximaImagem("dest_"+slugify(destino),m.map(r=>r.url));
  }
  async function fetchImgHotel(hotel:string){
    const rows=await loadHotelData();
    const t=normalizar(hotel);
    const m=rows.filter(r=>normalizar(r.nome)===t);
    if(!m.length) return null;
    return proximaImagem("hotel_"+slugify(hotel),m.map(r=>r.url));
  }
  async function loadDestinos(q:string=""){
    const rows=await loadDestinoData();
    const seen=new Set<string>();
    return rows.map(r=>r.nome).filter(n=>{const k=normalizar(n);if(seen.has(k))return false;seen.add(k);return true;})
      .filter(n=>normalizar(n).includes(normalizar(q))).slice(0,20);
  }
  async function loadHoteis(q:string=""){
    const rows=await loadHotelData();
    const seen=new Set<string>();
    return rows.map(r=>r.nome).filter(n=>{const k=normalizar(n);if(seen.has(k))return false;seen.add(k);return true;})
      .filter(n=>normalizar(n).includes(normalizar(q))).slice(0,20);
  }

  const setField=useCallback((k:string,v:string)=>{
    setFormCache(c=>({...c,[tab]:{...c[tab],[k]:v}}));
  },[tab]);
  const setBadge=useCallback((k:string,v:boolean)=>{
    setBadgeCache(c=>({...c,[tab]:{...c[tab],[k]:v}}));
  },[tab]);

  const values=formCache[tab]??DEFAULTS;
  const badges=badgeCache[tab]??{};

  async function onImgFundo(url:string){setField("imgfundo",url);}
  async function onHotelBlur(hotel?:string){
    const h=(hotel??values.hotel)?.trim();
    if(!h) return;
    const hCap=capitalizeBR(h);
    if(hCap!==values.hotel) setField("hotel",hCap);
    const hUrl=await fetchImgHotel(h);
    if(hUrl){setField("imgfundo",hUrl);return;}
    if(values.imgfundo) return;
    const dUrl=await fetchImgFundo(values.destino?.trim()||"");
    if(dUrl) setField("imgfundo",dUrl);
  }

  const{fields,set,servicos,setServicos}=useFormAdapter({tab,values,badges,setField,setBadge});

  const previewValues=useMemo(()=>{
    const m:Record<string,string>={...(values??{})};
    for(const[k,v] of Object.entries(badges??{})) m[k]=v?"true":"";
    return m;
  },[values,badges]);

  const currentTemplate=useMemo(()=>
    templates.find(t=>t.formType===tab&&t.format===format)||
    templates.find(t=>t.formType===tab),
  [templates,tab,format]);

  const templateBinds=useMemo(()=>{
    const b=new Set<string>();
    if(!currentTemplate?.schema?.elements) return b;
    for(const el of currentTemplate.schema.elements){
      if(el.bindParam) b.add(el.bindParam);
      if(el.imageBind) b.add(el.imageBind);
    }
    return b;
  },[currentTemplate]);

  const visibleFormats=useMemo(()=>{
    const s=new Set(templates.filter(t=>t.formType===tab).map(t=>t.format));
    return(["stories","feed","reels","tv"] as Format[]).filter(f=>s.has(f));
  },[templates,tab]);

  const schema=currentTemplate?.schema??{elements:[],background:"#0E1520",duration:5};
  const[pw,ph]=FORMAT_DIMS[format];

  function goToForm(tipo:FormType){
    setAnimOut(true);
    setTimeout(()=>{setTab(tipo);setPhase("form");setAnimOut(false);},260);
  }
  function goBack(){
    setAnimOut(true);
    setTimeout(()=>{setPhase("selector");setAnimOut(false);},260);
  }
  function switchTab(t:FormType){
    setTab(t);
    const fmts=templates.filter(x=>x.formType===t).map(x=>x.format);
    if(fmts.length&&!fmts.includes(format)) setFormat(fmts[0]);
  }

  // ===== SELEÇÃO =====
  if(phase==="selector") return(
    <div style={{padding:"24px",width:"100%",transition:"opacity .26s,transform .26s",opacity:animOut?0:1,transform:animOut?"translateX(-24px)":"translateX(0)"}}>
      <h1 style={{fontSize:"20px",fontWeight:800,color:"var(--txt1)",marginBottom:"4px"}}>Publicar</h1>
      <p style={{fontSize:"12px",color:"var(--txt3)",marginBottom:"20px"}}>Escolha o tipo de arte para criar</p>
      <div style={{background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:"12px",padding:"12px 20px",marginBottom:"20px",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:"11px",fontWeight:700,color:"var(--brand-primary)",textTransform:"uppercase",letterSpacing:".08em"}}>Plano Pro</div>
          <div style={{fontSize:"10px",color:"var(--txt3)",marginTop:"1px"}}>Posts de hoje</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:"24px"}}>
          {[{l:"Stories",v:"∞",c:"var(--brand-primary)"},{l:"Feed",v:"0/5",c:"#f59e0b"},{l:"Reels",v:"0/10",c:"#22c55e"}].map(x=>(
            <div key={x.l} style={{textAlign:"center"}}>
              <div style={{fontSize:"14px",fontWeight:800,color:x.c,lineHeight:1}}>{x.v}</div>
              <div style={{fontSize:"9px",color:"var(--txt3)",textTransform:"uppercase",letterSpacing:".06em",marginTop:"2px"}}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))",gap:"12px"}}>
        {TIPOS.map((t,i)=>(
          <button key={t.id} onClick={()=>goToForm(t.id)}
            style={{background:"var(--bg2)",border:"1.5px solid var(--bdr)",borderRadius:"14px",padding:"18px 14px 14px",cursor:"pointer",textAlign:"left",display:"flex",flexDirection:"column",gap:"10px",transition:"all .2s",animation:`fadeUp .3s ease ${i*.05}s both`,position:"relative",overflow:"hidden"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=t.color;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bdr)";e.currentTarget.style.transform="translateY(0)";}}
          >
            <div style={{position:"absolute",top:0,left:0,right:0,height:"3px",background:t.color}}/>
            <div style={{width:"36px",height:"36px",borderRadius:"10px",background:`color-mix(in srgb, ${t.color} 12%, transparent)`,display:"flex",alignItems:"center",justifyContent:"center",color:t.color}}>
              <t.Icon size={17} strokeWidth={2}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:"13px",fontWeight:700,color:"var(--txt1)"}}>{t.nome}</div>
              <div style={{fontSize:"11px",color:"var(--txt3)",marginTop:"2px",lineHeight:1.4}}>{t.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );

  // ===== FORMULÁRIO =====
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",transition:"opacity .26s",opacity:animOut?0:1}}>

      {/* TOPNAV — espaço generoso */}
      <div style={{display:"flex",alignItems:"center",height:"56px",background:"var(--bg1)",borderBottom:"1px solid var(--bdr)",flexShrink:0,padding:"0 12px",marginTop:"8px",gap:"4px",overflowX:"auto"}}>
        <button onClick={goBack} style={{display:"flex",alignItems:"center",gap:"6px",background:"none",border:"none",color:"var(--txt3)",fontSize:"12px",fontWeight:600,cursor:"pointer",padding:"8px 14px",borderRadius:"8px",flexShrink:0,whiteSpace:"nowrap",transition:"color .15s"}}
          onMouseEnter={e=>e.currentTarget.style.color="var(--txt1)"}
          onMouseLeave={e=>e.currentTarget.style.color="var(--txt3)"}
        >
          <ArrowLeft size={14}/> Voltar
        </button>
        <div style={{width:"1px",height:"22px",background:"var(--bdr)",margin:"0 6px",flexShrink:0}}/>
        <div ref={tabsWrapRef} style={{position:"relative",background:"color-mix(in srgb, var(--brand-primary) 8%, var(--bg2))",borderRadius:"12px",padding:"3px",display:"flex",gap:"0",overflowX:"auto",scrollbarWidth:"none",flex:1}}>
          <div ref={pillRef} style={{position:"absolute",top:"3px",height:"calc(100% - 6px)",background:"linear-gradient(180deg,rgba(0,0,0,0.0) 0%,var(--bg1) 100%)",borderRadius:"9px",boxShadow:"0 0 0 0.5px var(--bdr),inset 0 1px 0 rgba(255,255,255,0.9),inset 0 -1px 0 rgba(0,0,0,0.04),0 1px 3px rgba(0,0,0,0.1)",transition:"left .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1)",pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
            <div id="pill-bar" style={{position:"absolute",top:0,left:0,right:0,height:"2.5px",borderRadius:"2px 2px 0 0",background:TIPOS.find(t=>t.id===tab)?.color||"var(--brand-primary)",transition:"background .28s"}}/><div style={{position:"absolute",top:0,left:0,right:0,height:"55%",background:"linear-gradient(180deg,rgba(0,0,0,0.03) 0%,rgba(255,255,255,0) 100%)",borderRadius:"9px 9px 0 0",pointerEvents:"none"}}/>
          </div>
          {TIPOS.map(t=>(
            <button key={t.id}
              data-active={tab===t.id?"true":"false"}
              onClick={(e)=>{switchTab(t.id);movePill(e.currentTarget);const bar=pillRef.current?.querySelector('#pill-bar') as HTMLElement|null;if(bar)bar.style.background=t.color;}}
              style={{position:"relative",zIndex:1,padding:"5px 13px",borderRadius:"9px",border:"none",background:"transparent",fontSize:"11px",fontWeight:tab===t.id?600:500,letterSpacing:".05em",textTransform:"uppercase",color:tab===t.id?"var(--txt1)":"var(--txt3)",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",transition:"color .2s, font-weight .2s"}}
            >
              {t.nome}
            </button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>

        {/* FORMULÁRIO — scroll só aqui */}
        <div style={{width:"360px",flexShrink:0,background:"var(--bg1)",borderRight:"1px solid var(--bdr)",display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>

          {/* Pills formato */}
          <div style={{display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderBottom:"1px solid var(--bdr)",flexShrink:0}}>
            {visibleFormats.map(f=>(
              <button key={f} onClick={()=>setFormat(f)}
                style={{padding:"5px 14px",borderRadius:"20px",border:"1px solid",borderColor:format===f?"var(--brand-primary)":"var(--bdr)",background:format===f?"var(--brand-primary)":"transparent",color:format===f?"#fff":"var(--txt3)",fontSize:"10px",fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",cursor:"pointer",transition:"all .15s"}}
              >{FORMAT_LABELS[f]}</button>
            ))}
          </div>

          {/* Campos — SCROLL APENAS AQUI */}
          <div style={{flex:1,minHeight:0,overflowY:"auto",overflowX:"hidden",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
            {!currentTemplate?(
              <div style={{padding:"32px",textAlign:"center",color:"var(--txt3)",fontSize:"12px"}}>Nenhum template disponível para {tab}.</div>
            ):tab==="pacote"?(
              <PacoteForm
                fields={fields} set={set} servicos={servicos} setServicos={setServicos}
                today={new Date().toISOString().slice(0,10)}
                feriadoOpts={feriados}
                loadDestinos={loadDestinos} loadHoteis={loadHoteis}
                onImgFundo={onImgFundo} onHotelBlur={onHotelBlur}
                binds={templateBinds}
              />
            ):tab==="card_whatsapp"?(
              <CardWhatsAppForm fields={fields} set={set} today={new Date().toISOString().slice(0,10)} binds={templateBinds}/>
            ):(
              tab==="anoiteceu"?(
              <AnoiteceuForm fields={fields} set={set} binds={templateBinds}/>
            ):(
              <div style={{padding:"32px",textAlign:"center",color:"var(--txt3)",fontSize:"12px"}}>Formulário de {tab} em breve.</div>
            )
            )}
          </div>

          {/* Footer */}
          <div style={{padding:"12px 14px",borderTop:"1px solid var(--bdr)",display:"flex",flexDirection:"column",gap:"6px",flexShrink:0}}>
            <button style={{width:"100%",padding:"11px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,var(--brand-primary),var(--brand-secondary,#2D7DD2))",color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer"}}>
              ✈ Publicar no Instagram
            </button>
            <div style={{display:"flex",gap:"6px"}}>
              <button style={{flex:1,padding:"8px",borderRadius:"8px",border:"1px solid var(--bdr)",background:"transparent",color:"var(--txt3)",fontSize:"11px",fontWeight:600,cursor:"pointer"}}>🗑 Limpar</button>
              <button style={{flex:1,padding:"8px",borderRadius:"8px",border:"1px solid var(--bdr)",background:"transparent",color:"var(--txt3)",fontSize:"11px",fontWeight:600,cursor:"pointer"}}>⬇ Download</button>
            </div>
          </div>

          {/* Contadores */}
          <div style={{display:"flex",gap:"16px",padding:"7px 14px",borderTop:"1px solid var(--bdr)",flexShrink:0}}>
            {[{l:"Stories",c:"var(--brand-primary)"},{l:"Feed",c:"#f59e0b"},{l:"Reels",c:"#22c55e"}].map(x=>(
              <div key={x.l} style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"10px",color:"var(--txt3)"}}>
                <div style={{width:"5px",height:"5px",borderRadius:"50%",background:x.c}}/>
                {x.l} <b style={{color:"var(--txt2)"}}>0∞</b>
              </div>
            ))}
          </div>
        </div>

        {/* PREVIEW — sem scroll, centralizado */}
        <div style={{flex:1,background:"var(--bg0)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid var(--bdr)",flexShrink:0}}>
            <span style={{fontSize:"10px",fontWeight:700,color:"var(--txt3)",textTransform:"uppercase",letterSpacing:".1em"}}>Preview ao vivo</span>
            <span style={{fontSize:"10px",color:"var(--txt3)",background:"var(--bg2)",padding:"3px 8px",borderRadius:"6px",border:"1px solid var(--bdr)"}}>{pw} × {ph}</span>
          </div>
          {/* Área do preview — centralizada, sem scroll */}
          <div ref={previewAreaRef} style={{flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",overflow:"hidden",paddingTop:"16px"}}>
            <div style={{
              position:"relative",
              width: Math.round((Math.round(winH * 0.82))*(pw/ph)) + "px",
              height: Math.round(winH * 0.82) + "px",
              overflow:"hidden",
              flexShrink:0
            }}>
              <PreviewStage schema={schema} width={pw} height={ph} values={previewValues} maxDisplay={Math.round(winH * 0.82)}/>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


