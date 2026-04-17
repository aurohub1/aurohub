"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Musica {
  id: string;
  nome: string;
  artista: string;
  cloudinary_url: string;
  cloudinary_public_id: string;
  duracao_segundos: number | null;
  inicio_segundos: number;
  licensee_id: string | null;
  ativa: boolean;
  created_at: string;
}

interface Licensee { id: string; name: string; }

export default function MusicasPage() {
  const [musicas, setMusicas] = useState<Musica[]>([]);
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ nome: "", artista: "", inicio_segundos: "0", licensee_id: "" });

  const load = useCallback(async () => {
    const [mRes, lRes] = await Promise.all([
      supabase.from("musicas").select("*").order("created_at", { ascending: false }),
      supabase.from("licensees").select("id, name").eq("status", "active").order("name"),
    ]);
    setMusicas((mRes.data as Musica[]) ?? []);
    setLicensees((lRes.data as Licensee[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const licMap = Object.fromEntries(licensees.map(l => [l.id, l.name]));

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!form.nome.trim()) { alert("Preencha o nome da música"); return; }

    setUploading(true);
    try {
      const signRes = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "aurohubv2/musicas" }),
      });
      const signData = await signRes.json();
      if (!signData.signature) throw new Error("Falha ao assinar upload");

      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", signData.api_key);
      fd.append("timestamp", String(signData.timestamp));
      fd.append("folder", signData.folder);
      fd.append("signature", signData.signature);

      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloud_name}/video/upload`, {
        method: "POST",
        body: fd,
      });
      const upData = await upRes.json();
      if (!upData.secure_url) {
        console.error("Cloudinary error:", upData);
        console.error("Status:", upRes.status, upRes.statusText);
        console.error("Sign data used:", signData);
        throw new Error(upData.error?.message || `Upload falhou (${upRes.status})`);
      }

      // Detecta duração via Audio API
      let duracao_segundos: number | null = upData.duration ? Math.round(upData.duration) : null;
      if (!duracao_segundos) {
        duracao_segundos = await new Promise<number | null>((resolve) => {
          const audio = new Audio(upData.secure_url);
          audio.addEventListener("loadedmetadata", () => resolve(Math.round(audio.duration)));
          audio.addEventListener("error", () => resolve(null));
          setTimeout(() => resolve(null), 5000);
        });
      }

      const { error } = await supabase.from("musicas").insert({
        nome: form.nome.trim(),
        artista: form.artista.trim(),
        cloudinary_url: upData.secure_url,
        cloudinary_public_id: upData.public_id,
        duracao_segundos,
        inicio_segundos: parseInt(form.inicio_segundos) || 0,
        licensee_id: form.licensee_id || null,
        ativa: true,
      });
      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error(`${error.message} (${error.code || "?"})`);
      }

      setForm({ nome: "", artista: "", inicio_segundos: "0", licensee_id: "" });
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro no upload");
    } finally { setUploading(false); }
  }

  async function toggleAtiva(m: Musica) {
    setSaving(m.id);
    await supabase.from("musicas").update({ ativa: !m.ativa }).eq("id", m.id);
    setMusicas(prev => prev.map(x => x.id === m.id ? { ...x, ativa: !x.ativa } : x));
    setSaving(null);
  }

  async function handleDelete(m: Musica) {
    if (!confirm(`Excluir "${m.nome}"?`)) return;
    setSaving(m.id);
    await supabase.from("musicas").delete().eq("id", m.id);
    setMusicas(prev => prev.filter(x => x.id !== m.id));
    if (playingId === m.id) { audioRef.current?.pause(); setPlayingId(null); }
    setSaving(null);
  }

  function handlePlay(m: Musica) {
    if (playingId === m.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(m.cloudinary_url);
    audio.currentTime = m.inicio_segundos;
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(m.id);
  }

  async function updateField(id: string, field: string, value: string | number | null) {
    setSaving(id);
    await supabase.from("musicas").update({ [field]: value }).eq("id", id);
    setMusicas(prev => prev.map(x => x.id === id ? { ...x, [field]: value } : x));
    setSaving(null);
  }

  const fmt = (s: number | null) => s ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` : "--:--";

  const filtered = musicas.filter(m =>
    filter === "all" ? true : filter === "public" ? !m.licensee_id : !!m.licensee_id
  );

  return (
    <div className="flex flex-col gap-6 page-fade">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[var(--txt)]">Banco de Músicas</h1>
        <div className="flex items-center gap-2">
          {(["all", "public", "private"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-colors ${filter === f ? "bg-[var(--orange)] text-white" : "bg-[var(--bg2)] text-[var(--txt3)]"}`}>
              {f === "all" ? `Todas (${musicas.length})` : f === "public" ? `Públicas (${musicas.filter(m => !m.licensee_id).length})` : `Exclusivas (${musicas.filter(m => m.licensee_id).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Upload form */}
      <div className="rounded-xl border border-[var(--bdr)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-[13px] font-semibold text-[var(--txt)]">Nova música</h2>
        <div className="grid grid-cols-4 gap-3">
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="Nome da música"
            className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none" />
          <input value={form.artista} onChange={e => setForm(f => ({ ...f, artista: e.target.value }))}
            placeholder="Artista"
            className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none" />
          <input type="number" min="0" value={form.inicio_segundos}
            onChange={e => setForm(f => ({ ...f, inicio_segundos: e.target.value }))}
            placeholder="Início (seg)"
            className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none" />
          <select value={form.licensee_id} onChange={e => setForm(f => ({ ...f, licensee_id: e.target.value }))}
            className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] focus:border-[var(--orange)] focus:outline-none">
            <option value="">Pública (todos)</option>
            {licensees.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <input ref={fileRef} type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            disabled={uploading || !form.nome.trim()}
            className="h-9 rounded-lg bg-[var(--orange)] px-5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
            {uploading ? "Enviando..." : "Upload áudio"}
          </button>
          <span className="text-[10px] text-[var(--txt3)]">MP3, WAV, M4A, OGG</span>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-[13px] text-[var(--txt3)]">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-[13px] text-[var(--txt3)]">Nenhuma música encontrada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(m => (
            <div key={m.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${m.ativa ? "border-[var(--bdr)] bg-[var(--card-bg)]" : "border-[var(--bdr)] bg-[var(--bg2)] opacity-60"}`}>
              {/* Play */}
              <button onClick={() => handlePlay(m)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--bdr2)] text-[var(--txt2)] transition-colors hover:bg-[var(--orange3)] hover:text-[var(--orange)]">
                {playingId === m.id ? (
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1" /><rect x="9" y="2" width="4" height="12" rx="1" /></svg>
                ) : (
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor"><path d="M4 2l10 6-10 6V2z" /></svg>
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <input value={m.nome}
                  onChange={e => setMusicas(prev => prev.map(x => x.id === m.id ? { ...x, nome: e.target.value } : x))}
                  onBlur={e => updateField(m.id, "nome", e.target.value)}
                  className="block w-full truncate bg-transparent text-[13px] font-semibold text-[var(--txt)] focus:outline-none" />
                <input value={m.artista}
                  onChange={e => setMusicas(prev => prev.map(x => x.id === m.id ? { ...x, artista: e.target.value } : x))}
                  onBlur={e => updateField(m.id, "artista", e.target.value)}
                  className="block w-full truncate bg-transparent text-[10px] text-[var(--txt3)] focus:outline-none" />
              </div>

              {/* Duração */}
              <span className="shrink-0 text-[10px] font-mono text-[var(--txt3)]">{fmt(m.duracao_segundos)}</span>

              {/* Início */}
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-[9px] text-[var(--txt3)]">Início:</span>
                <input type="number" min="0" value={m.inicio_segundos}
                  onChange={e => setMusicas(prev => prev.map(x => x.id === m.id ? { ...x, inicio_segundos: parseInt(e.target.value) || 0 } : x))}
                  onBlur={e => updateField(m.id, "inicio_segundos", parseInt(e.target.value) || 0)}
                  className="h-6 w-12 rounded border border-[var(--bdr)] bg-transparent px-1.5 text-center text-[10px] text-[var(--txt)] focus:border-[var(--orange)] focus:outline-none" />
                <span className="text-[9px] text-[var(--txt3)]">s</span>
              </div>

              {/* Licensee badge */}
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${m.licensee_id ? "bg-[var(--blue3)] text-[var(--blue)]" : "bg-[var(--green3)] text-[var(--green)]"}`}>
                {m.licensee_id ? (licMap[m.licensee_id] || "Exclusiva") : "Pública"}
              </span>

              {/* Toggle */}
              <button onClick={() => toggleAtiva(m)} disabled={saving === m.id}
                className={`h-6 w-10 shrink-0 rounded-full transition-colors ${m.ativa ? "bg-[var(--green)]" : "bg-[var(--bg3)]"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${m.ativa ? "translate-x-5" : "translate-x-1"}`} />
              </button>

              {/* Delete */}
              <button onClick={() => handleDelete(m)} disabled={saving === m.id}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--bdr2)] text-[var(--txt3)] transition-colors hover:border-[var(--red3)] hover:bg-[var(--red3)] hover:text-[var(--red)]">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
