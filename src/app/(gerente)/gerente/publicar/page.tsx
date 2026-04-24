"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { useFormAdapter } from "@/components/publish/useFormAdapter";
import { PacoteForm, CardWhatsAppForm, AnoiteceuForm } from "@/components/publish/FormSections";
import { Plane, Target, Ticket, Ship, Moon, MessageSquare, ArrowLeft, Smartphone, Play, Square, Tv, Check, Loader2, Trash2 } from "lucide-react";
import { usePublishQueue } from "@/hooks/usePublishQueue";

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
interface StoreOption{id:string;name:string;}

const RIO_PRETO_STORE_ID="efab2a24-3c34-4d2b-82ee-5fef8018c589";
const AZV_GROUP_MATCHERS=["rio preto","barretos","damha"];
function canPublishToAllAZV(storeId:string|null|undefined):boolean{return storeId===RIO_PRETO_STORE_ID;}
function filterAZVGroup(stores:StoreOption[]):StoreOption[]{return stores.filter(s=>AZV_GROUP_MATCHERS.some(m=>s.name.toLowerCase().includes(m)));}

export default function GerentePublicarV2Page() {
  const [profile, setProfile] = useState<FullProfile|null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [feriados, setFeriados] = useState<string[]>([]);
  const [tab, setTab] = useState<FormType>("pacote");
  const [format, setFormat] = useState<Format>("stories");
  const [phase, setPhase] = useState<"selector"|"form">("selector");
  const [animOut, setAnimOut] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string|null>(null);
  const [publishTargets, setPublishTargets] = useState<StoreOption[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle"|"generating"|"uploading"|"publishing"|"success"|"error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const publishQueue = usePublishQueue();
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
  const stageRef = useRef<Konva.Stage | null>(null);

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
    getProfile(supabase).then(async p=>{
      setProfile(p);
      if(p?.licensee_id){
        loadTemplates(p.licensee_id);
        let allStores:StoreOption[]=[];
        if(p.role==="gerente"&&p.id){
          const{data:userStores}=await supabase.from("user_stores").select("store_id").eq("user_id",p.id);
          if(userStores&&userStores.length>0){
            const storeIds=userStores.map(us=>us.store_id);
            const{data:storesData}=await supabase.from("stores").select("id,name").in("id",storeIds).order("name");
            allStores=(storesData??[]) as StoreOption[];
          }
        }else{
          const{data:storesData}=await supabase.from("stores").select("id,name").eq("licensee_id",p.licensee_id).order("name");
          allStores=(storesData??[]) as StoreOption[];
        }
        let targets:StoreOption[]=[];
        if(canPublishToAllAZV(p.store_id)){
          targets=filterAZVGroup(allStores);
          if(targets.length===0) targets=allStores;
        }else if(p.store_id){
          const own=allStores.find(s=>s.id===p.store_id);
          targets=own?[own]:[];
        }
        setPublishTargets(targets);
        // Loja padrão: a própria loja do usuário, ou a primeira disponível
        const defaultStoreId = targets.find(t=>t.id===p.store_id)?.id || (targets.length>0?targets[0].id:"");
        setSelectedTargetIds(defaultStoreId ? [defaultStoreId] : []);
        console.log('publishTargets:', targets);
      }
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
    const{data}=await supabase.from("imgfundo").select("nome,url").order("nome").limit(1000);
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
    const nomes=[...new Set(rows.map(r=>r.nome))];
    return nomes.filter(n=>normalizar(n).includes(normalizar(q)));
  }
  async function loadHoteis(q:string=""){
    const rows=await loadHotelData();
    const seen=new Set<string>();
    return rows.map(r=>r.nome).filter(n=>{const k=normalizar(n);if(seen.has(k))return false;seen.add(k);return true;})
      .filter(n=>normalizar(n).includes(normalizar(q)));
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
    const dUrl=await fetchImgFundo(values.destino?.trim()||"");
    if(dUrl) setField("imgfundo",dUrl);
  }

  const{fields,set,servicos,setServicos}=useFormAdapter({tab,values,badges,setField,setBadge});

  const previewValues=useMemo(()=>{
    const m:Record<string,string>={...(values??{})};
    for(const[k,v] of Object.entries(badges??{})) m[k]=v?"true":"";
    return m;
  },[values,badges]);

  const availableTemplates=useMemo(()=>
    templates.filter(t=>t.formType===tab&&t.format===format),
  [templates,tab,format]);

  const needsTemplateSelection=useMemo(()=>
    !selectedTemplateId && availableTemplates.length > 1,
  [selectedTemplateId,availableTemplates]);

  const currentTemplate=useMemo(()=>{
    if(selectedTemplateId) return templates.find(t=>t.id===selectedTemplateId);
    if(availableTemplates.length===1) return availableTemplates[0];
    return templates.find(t=>t.formType===tab);
  },[templates,tab,format,selectedTemplateId,availableTemplates]);

  const templateBinds=useMemo(()=>{
    const b=new Set<string>();
    if(!currentTemplate?.schema?.elements) return b;
    for(const el of currentTemplate.schema.elements){
      if(el.bindParam) b.add(el.bindParam);
      if(el.imageBind) b.add(el.imageBind);
    }
    return b;
  },[currentTemplate]);

  function toggleTarget(id: string) {
    setSelectedTargetIds((prev) => {
      if (prev.includes(id)) {
        // Não permite desmarcar se for a única loja selecionada
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }

  /* ── Captura de imagem/vídeo ──────────────────── */

  function getPNGDataURL(): string | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const scale = stage.scaleX() || 1;
    return stage.toDataURL({ pixelRatio: 1 / scale, mimeType: "image/jpeg", quality: 0.92 });
  }

  async function recordCanvasWithAudio(durationSec: number): Promise<Blob | null> {
    const stage = stageRef.current;
    if (!stage) return null;

    const [W, H] = FORMAT_DIMS[format];
    const recCanvas = document.createElement("canvas");
    recCanvas.width = W;
    recCanvas.height = H;
    const recCtx = recCanvas.getContext("2d");
    if (!recCtx) return null;

    // Render loop: copia frame do Konva no canvas de gravação
    const scale = stage.scaleX() || 1;
    let rafId = 0;
    const drawFrame = () => {
      const srcCanvas = stage.toCanvas({ pixelRatio: 1 / scale });
      recCtx.drawImage(srcCanvas, 0, 0, W, H);
      rafId = requestAnimationFrame(drawFrame);
    };
    drawFrame();

    // Stream de vídeo
    const fps = 30;
    const videoStream = (recCanvas as HTMLCanvasElement).captureStream(fps);

    // MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";
    const recorder = new MediaRecorder(videoStream, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });

    recorder.start(100);

    await new Promise(r => setTimeout(r, durationSec * 1000));

    recorder.stop();
    cancelAnimationFrame(rafId);

    return done;
  }

  function handleClear() {
    setFormCache((c) => ({ ...c, [tab]: {...DEFAULTS} }));
    setBadgeCache((c) => ({ ...c, [tab]: {} }));
  }

  async function handleDownload() {
    setStatus("generating");
    setStatusMsg("Gerando imagem...");

    const dataUrl = getPNGDataURL();
    if (!dataUrl) {
      setStatus("error");
      setStatusMsg("Falha ao gerar imagem");
      setTimeout(() => { setStatus("idle"); setStatusMsg(""); }, 2000);
      return;
    }

    // Download local
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${currentTemplate?.name || "arte"}_${Date.now()}.jpg`;
    a.click();

    setStatus("success");
    setStatusMsg("Download iniciado");
    setTimeout(() => { setStatus("idle"); setStatusMsg(""); }, 2000);
  }

  async function handlePublish() {
    if (!profile?.licensee_id) { setStatus("error"); setStatusMsg("Sem licensee"); return; }
    if (selectedTargetIds.length === 0) { setStatus("error"); setStatusMsg("Selecione pelo menos uma loja"); return; }

    const targets = publishTargets.filter((t) => selectedTargetIds.includes(t.id));
    if (targets.length === 0) { setStatus("error"); setStatusMsg("Selecione pelo menos uma loja"); return; }

    try {
      setBusy(true);
      const hasAnimation = (currentTemplate?.schema?.elements ?? []).some((el: any) =>
        (el.animDelay && el.animDelay > 0) || (el.animDuration && el.animDuration > 0)
      );
      const isVideo = hasAnimation;
      let mediaBlob: Blob | undefined;
      let mediaDataUrl: string | undefined;

      if (isVideo) {
        setStatus("generating");
        setStatusMsg("Gravando vídeo...");
        const els = (currentTemplate?.schema?.elements ?? []) as Array<{ animDelay?: number; animDuration?: number }>;
        const maxAnim = els.reduce((m, el) => Math.max(m, (el.animDelay || 0) + (el.animDuration || 0.6)), 0);
        const durationSec = Math.min(15, Math.max(5, Math.ceil(maxAnim + 2)));
        const blob = await recordCanvasWithAudio(durationSec);
        if (!blob) throw new Error("Falha ao gravar vídeo");
        mediaBlob = blob;
      } else {
        setStatus("generating");
        setStatusMsg("Gerando imagem...");
        const dataUrl = getPNGDataURL();
        if (!dataUrl) throw new Error("Falha ao gerar imagem");
        mediaDataUrl = dataUrl;
      }

      setStatus("publishing");
      setStatusMsg(`Publicando em ${targets.length} loja(s)...`);

      for (const target of targets) {
        publishQueue.enqueue({
          storeId: target.id,
          storeName: target.name,
          destino: values.destino || null,
          format,
          isVideo,
          mediaBlob,
          mediaDataUrl,
          caption: "",
          licenseeId: profile.licensee_id,
          userId: profile.id,
          userRole: profile.role,
          templateId: currentTemplate?.id,
          templateName: currentTemplate?.name,
          onDone: () => {
            console.log(`Publicado em ${target.name}`);
          },
        });
      }

      setStatus("success");
      setStatusMsg(`Publicado em ${targets.length} loja(s)`);
      setTimeout(() => { setStatus("idle"); setStatusMsg(""); setBusy(false); }, 3000);
    } catch (error) {
      setStatus("error");
      setStatusMsg("Erro ao publicar");
      setBusy(false);
      setTimeout(() => { setStatus("idle"); setStatusMsg(""); }, 3000);
    }
  }

  const visibleFormats=useMemo(()=>{
    const s=new Set(templates.filter(t=>t.formType===tab).map(t=>t.format));
    return(["stories","feed","reels","tv"] as Format[]).filter(f=>s.has(f));
  },[templates,tab]);

  const schema=currentTemplate?.schema??{elements:[],background:"#0E1520",duration:5};
  const[pw,ph]=FORMAT_DIMS[format];

  function goToForm(tipo:FormType){
    setAnimOut(true);
    setTimeout(()=>{setTab(tipo);setSelectedTemplateId(null);setPhase("form");setAnimOut(false);},260);
  }
  function goBack(){
    setAnimOut(true);
    setTimeout(()=>{setPhase("selector");setSelectedTemplateId(null);setAnimOut(false);},260);
  }
  function switchTab(t:FormType){
    setTab(t);
    setSelectedTemplateId(null);
    const fmts=templates.filter(x=>x.formType===t).map(x=>x.format);
    if(fmts.length&&!fmts.includes(format)) setFormat(fmts[0]);
  }
  function selectTemplate(id:string){
    setSelectedTemplateId(id);
  }
  function backToTemplateSelector(){
    setAnimOut(true);
    setTimeout(()=>{setPhase("selector");setSelectedTemplateId(null);setAnimOut(false);},260);
  }

  // ===== SELEÇÃO DE TIPO =====
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

  // ===== SELEÇÃO DE TEMPLATE =====
  if(phase==="form" && needsTemplateSelection) return(
    <div style={{padding:"24px",width:"100%",transition:"opacity .26s",opacity:animOut?0:1}}>
      <button onClick={backToTemplateSelector} style={{display:"flex",alignItems:"center",gap:"6px",background:"none",border:"none",color:"var(--txt3)",fontSize:"12px",fontWeight:600,cursor:"pointer",padding:"8px 0",marginBottom:"16px"}}
        onMouseEnter={e=>e.currentTarget.style.color="var(--txt1)"}
        onMouseLeave={e=>e.currentTarget.style.color="var(--txt3)"}
      >
        <ArrowLeft size={14}/> Voltar
      </button>
      <h1 style={{fontSize:"20px",fontWeight:800,color:"var(--txt1)",marginBottom:"4px"}}>Escolher Template</h1>
      <p style={{fontSize:"12px",color:"var(--txt3)",marginBottom:"20px"}}>Selecione o template para {TIPOS.find(t=>t.id===tab)?.nome} {FORMAT_LABELS[format]}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:"16px"}}>
        {availableTemplates.map((tmpl,i)=>(
          <button key={tmpl.id} onClick={()=>selectTemplate(tmpl.id)}
            style={{background:"var(--bg2)",border:"1.5px solid var(--bdr)",borderRadius:"14px",padding:"0",cursor:"pointer",textAlign:"left",display:"flex",flexDirection:"column",overflow:"hidden",transition:"all .2s",animation:`fadeUp .3s ease ${i*.05}s both`}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--brand-primary)";e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bdr)";e.currentTarget.style.transform="translateY(0)";}}
          >
            <div style={{width:"100%",height:"160px",background:"linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
              {tmpl.schema?.thumbnail || (tmpl as any).thumbnail_url ? (
                <img src={tmpl.schema?.thumbnail || (tmpl as any).thumbnail_url} alt={tmpl.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              ) : (
                <span style={{fontSize:"32px",opacity:0.2}}>📄</span>
              )}
            </div>
            <div style={{padding:"12px"}}>
              <div style={{fontSize:"13px",fontWeight:700,color:"var(--txt1)",lineHeight:1.3}}>{tmpl.name}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ===== FORMULÁRIO =====
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",transition:"opacity .26s",opacity:animOut?0:1}}>

      {/* TOPNAV — espaço generoso */}
      <div style={{display:"flex",alignItems:"center",height:"56px",background:"var(--bg1)",borderBottom:"1px solid var(--bdr)",flexShrink:0,padding:"0 12px",gap:"4px",overflowX:"auto"}}>
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

        {/* FORMULÁRIO */}
        <div style={{width:"300px",height:"100%",flexShrink:0,background:"var(--bg1)",borderRight:"1px solid var(--bdr)",display:"flex",flexDirection:"column"}}>

          {/* Pills de formato */}
          {visibleFormats.length > 1 && (
            <div style={{padding:"14px 14px 0",borderBottom:"1px solid var(--bdr)",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:"4px",borderRadius:"12px",background:"var(--bg1)",border:"1px solid var(--bdr)",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",padding:"4px"}}>
                {(["stories","reels","feed","tv"] as Format[]).map(f=>{
                  const active=format===f;
                  const available=visibleFormats.includes(f);
                  const Icon=f==="stories"?Smartphone:f==="reels"?Play:f==="feed"?Square:Tv;
                  return(
                    <button
                      key={f}
                      onClick={()=>available&&setFormat(f)}
                      disabled={!available}
                      style={{
                        flex:1,
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"center",
                        gap:"4px",
                        borderRadius:"8px",
                        padding:"8px",
                        fontSize:"10px",
                        fontWeight:700,
                        textTransform:"uppercase",
                        letterSpacing:".06em",
                        border:"none",
                        cursor:available?"pointer":"not-allowed",
                        opacity:available?1:0.3,
                        transition:"all .15s",
                        background:active?"var(--brand-primary)":"transparent",
                        color:active?"#fff":"var(--txt3)",
                        position:"relative",
                        overflow:"hidden"
                      }}
                    >
                      {active&&<div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 60%)",pointerEvents:"none"}}/>}
                      <Icon size={13} strokeWidth={2.5} style={{position:"relative",zIndex:1}}/>
                      <span style={{position:"relative",zIndex:1}}>{FORMAT_LABELS[f]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Campos — scroll aqui */}
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
          <div style={{padding:"12px 14px",paddingBottom:"60px",borderTop:"1px solid var(--bdr)",display:"flex",flexDirection:"column",gap:"6px",flexShrink:0}}>
            {publishTargets.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                <label style={{fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"var(--txt3)"}}>Publicar em</label>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {publishTargets.map(t=>{
                    const active=selectedTargetIds.includes(t.id);
                    const single=publishTargets.length===1;
                    return(
                    <button key={t.id} type="button" onClick={()=>!single&&toggleTarget(t.id)} disabled={single}
                      style={{flex:1,minWidth:"90px",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",padding:"8px 10px",borderRadius:"8px",border:`1.5px solid ${active?"var(--brand-primary)":"var(--bdr)"}`,background:active?"rgba(59,130,246,0.1)":"transparent",color:active?"var(--brand-primary)":"var(--txt2)",fontSize:"11px",fontWeight:600,cursor:single?"default":"pointer",transition:"all .15s"}}
                    >
                      <span style={{width:"12px",height:"12px",borderRadius:"3px",border:`1.5px solid ${active?"var(--brand-primary)":"var(--bdr)"}`,background:active?"var(--brand-primary)":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {active&&<Check size={8} strokeWidth={3} color="#fff"/>}
                      </span>
                      {t.name}
                    </button>
                    );
                  })}
                </div>
              </div>
            )}
            {format !== "tv" && (
              <button onClick={handlePublish} disabled={busy||!currentTemplate} style={{width:"100%",padding:"11px",borderRadius:"10px",border:"none",background:busy?"#999":"linear-gradient(135deg,var(--brand-primary),var(--brand-secondary,#2D7DD2))",color:"#fff",fontSize:"13px",fontWeight:700,cursor:busy?"wait":"pointer",opacity:busy?0.7:1}}>
                {busy?<><Loader2 size={14} style={{display:"inline",marginRight:"6px",animation:"spin 1s linear infinite"}}/>Publicando...</>:"✈ Publicar no Instagram"}
              </button>
            )}
            <div style={{display:"flex",gap:"6px"}}>
              <button onClick={handleClear} style={{flex:1,padding:"8px",borderRadius:"8px",border:"1px solid var(--bdr)",background:"transparent",color:"var(--txt3)",fontSize:"11px",fontWeight:600,cursor:"pointer"}}>
                <Trash2 size={12} style={{display:"inline",marginRight:"4px"}}/>Limpar
              </button>
              <button onClick={handleDownload} style={{flex:1,padding:"8px",borderRadius:"8px",border:"1px solid var(--bdr)",background:"transparent",color:"var(--txt3)",fontSize:"11px",fontWeight:600,cursor:"pointer"}}>
                ⬇ Download
              </button>
            </div>
            {statusMsg&&(
              <div style={{fontSize:"10px",textAlign:"center",color:status==="error"?"#ef4444":status==="success"?"#10b981":"var(--txt3)",padding:"4px"}}>
                {statusMsg}
              </div>
            )}
          </div>
        </div>

        {/* PREVIEW — sem scroll, centralizado */}
        <div style={{flex:1,background:"var(--bg0)",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
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
              <PreviewStage schema={schema} width={pw} height={ph} values={previewValues} maxDisplay={Math.round(winH * 0.82)} onReady={(s) => { stageRef.current = s; }}/>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


