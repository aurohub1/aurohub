"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FileText, Search } from "lucide-react";

interface Licensee { id: string; name: string; email: string; plan: string; status: string; created_at: string; }

export default function OperadorClientesPage() {
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("licensees").select("id, name, email, plan, status, created_at").order("name");
    setLicensees((data ?? []) as Licensee[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? licensees.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase()))
    : licensees;

  return (
    <>
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--txt)]">Clientes</h2>
          <p className="mt-0.5 text-[13px] text-[var(--txt3)]">Visualização somente leitura</p>
        </div>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--txt3)]" />
          <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-transparent pl-9 pr-3 text-[13px] text-[var(--txt)] outline-none focus:border-[var(--txt3)]" />
        </div>
      </div>
      {loading ? (
        <div className="animate-pulse bg-[var(--bg2)] rounded-lg h-20 w-full" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--bdr)]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--bdr)] bg-[var(--bg2)] text-[11px] uppercase tracking-wider text-[var(--txt3)]">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="border-b border-[var(--bdr)] last:border-0 hover:bg-[var(--hover-bg)]">
                  <td className="px-4 py-3 font-medium text-[var(--txt)]">{l.name}</td>
                  <td className="px-4 py-3 text-[var(--txt2)]">{l.email}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-[var(--blue3)] px-2 py-0.5 text-[10px] font-bold text-[var(--blue)]">{l.plan}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${l.status === "active" ? "bg-[var(--green3)] text-[var(--green)]" : "bg-[var(--red3)] text-[var(--red)]"}`}>{l.status === "active" ? "Ativo" : "Inativo"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
