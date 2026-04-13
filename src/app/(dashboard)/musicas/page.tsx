"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Musica {
  id: string;
  nome: string;
  artista: string;
  url: string;
  public_id: string;
  duracao: number | null;
  inicio_segundos: number;
  ativa: boolean;
  created_at: string;
}

export default function MusicasPage() {
  const [musicas, setMusicas] = useState<Musica[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form para nova música
  const [form, setForm] = useState({ nome: "", artista: "", inicio_segundos: "0" });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("musicas")
      .select("*")
      .order("created_at", { ascending: false });
    setMusicas((data as Musica[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!form.nome.trim()) { alert("Preencha o nome da música"); return; }

    setUploading(true);
    try {
      // Upload para Cloudinary via sign API
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
      fd.append("resource_type", "video"); // Cloudinary usa "video" para áudio

      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloud_name}/video/upload`, {
        method: "POST",
        body: fd,
      });
      const upData = await upRes.json();
      if (!upData.secure_url) throw new Error(upData.error?.message || "Upload falhou");

      // Salva no banco
      const { error } = await supabase.from("musicas").insert({
        nome: form.nome.trim(),
        artista: form.artista.trim(),
        url: upData.secure_url,
        public_id: upData.public_id,
        duracao: upData.duration ? Math.round(upData.duration) : null,
        inicio_segundos: parseInt(form.inicio_segundos) || 0,
        ativa: true,
      });
      if (error) throw error;

      setForm({ nome: "", artista: "", inicio_segundos: "0" });
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
    const audio = new Audio(m.url);
    audio.currentTime = m.inicio_segundos;
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(m.id);
  }

  async function updateField(id: string, field: string, value: string | number) {
    setSaving(id);
    await supabase.from("musicas").update({ [field]: value }).eq("id", id);
    setMusicas(prev => prev.map(x => x.id === id ? { ...x, [field]: value } : x));
    setSaving(null);
  }

  const formatDur = (s: number | null) => {
    if (!s) return "--:--";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[var(--txt)]">Banco de Músicas</h1>
        <span className="text-[12px] text-[var(--txt3)]">{musicas.length} músicas</span>
      </div>

      {/* Upload form */}
      <div className="rounded-xl border border-[var(--bdr)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-[13px] font-semibold text-[var(--txt)]">Nova música</h2>
        <div className="grid grid-cols-3 gap-3">
          <input
            value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="Nome da música"
            className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
          />
          <input
            value={form.artista} onChange={e => setForm(f => ({ ...f, artista: e.target.value }))}
            placeholder="Artista"
            className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
          />
          <input
            type="number" min="0" value={form.inicio_segundos}
            onChange={e => setForm(f => ({ ...f, inicio_segundos: e.target.value }))}
            placeholder="Início (seg)"
            className="h-9 rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <input ref={fileRef} type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !form.nome.trim()}
            className="h-9 rounded-lg bg-[var(--orange)] px-5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? "Enviando..." : "Upload áudio"}
          </button>
          <span className="text-[10px] text-[var(--txt3)]">MP3, WAV, M4A, OGG</span>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-[13px] text-[var(--txt3)]">Carregando...</p>
      ) : musicas.length === 0 ? (
        <p className="text-[13px] text-[var(--txt3)]">Nenhuma música cadastrada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {musicas.map(m => (
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
                <input
                  value={m.nome}
                  onChange={e => setMusicas(prev => prev.map(x => x.id === m.id ? { ...x, nome: e.target.value } : x))}
                  onBlur={e => updateField(m.id, "nome", e.target.value)}
                  className="block w-full truncate bg-transparent text-[13px] font-semibold text-[var(--txt)] focus:outline-none"
                />
                <input
                  value={m.artista}
                  onChange={e => setMusicas(prev => prev.map(x => x.id === m.id ? { ...x, artista: e.target.value } : x))}
                  onBlur={e => updateField(m.id, "artista", e.target.value)}
                  className="block w-full truncate bg-transparent text-[10px] text-[var(--txt3)] focus:outline-none"
                />
              </div>

              {/* Duração */}
              <span className="shrink-0 text-[10px] font-mono text-[var(--txt3)]">{formatDur(m.duracao)}</span>

              {/* Início */}
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-[9px] text-[var(--txt3)]">Início:</span>
                <input
                  type="number" min="0" value={m.inicio_segundos}
                  onChange={e => setMusicas(prev => prev.map(x => x.id === m.id ? { ...x, inicio_segundos: parseInt(e.target.value) || 0 } : x))}
                  onBlur={e => updateField(m.id, "inicio_segundos", parseInt(e.target.value) || 0)}
                  className="h-6 w-12 rounded border border-[var(--bdr)] bg-transparent px-1.5 text-center text-[10px] text-[var(--txt)] focus:border-[var(--orange)] focus:outline-none"
                />
                <span className="text-[9px] text-[var(--txt3)]">s</span>
              </div>

              {/* Toggle ativa */}
              <button
                onClick={() => toggleAtiva(m)}
                disabled={saving === m.id}
                className={`h-6 w-10 shrink-0 rounded-full transition-colors ${m.ativa ? "bg-[var(--green)]" : "bg-[var(--bg3)]"}`}
              >
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${m.ativa ? "translate-x-5" : "translate-x-1"}`} />
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(m)}
                disabled={saving === m.id}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--bdr2)] text-[var(--txt3)] transition-colors hover:border-[var(--red3)] hover:bg-[var(--red3)] hover:text-[var(--red)]"
              >
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
