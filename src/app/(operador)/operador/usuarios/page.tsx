"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Search } from "lucide-react";

interface User { id: string; name: string; email: string; role: string; status: string; licensee_id: string | null; }

const ROLE_LABELS: Record<string, string> = { adm: "ADM", operador: "Operador", cliente: "Cliente", unidade: "Unidade", gerente: "Gerente", vendedor: "Consultor" };

export default function OperadorUsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, name, email, role, status, licensee_id").order("name");
    setUsers((data ?? []) as User[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <>
      <div className="flex items-end justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--txt)]">Usuários</h2>
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
          <Users className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--bdr)]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--bdr)] bg-[var(--bg2)] text-[11px] uppercase tracking-wider text-[var(--txt3)]">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-[var(--bdr)] last:border-0 hover:bg-[var(--hover-bg)]">
                  <td className="px-4 py-3 font-medium text-[var(--txt)]">{u.name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--txt2)]">{u.email}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-[var(--bg3)] px-2 py-0.5 text-[10px] font-bold text-[var(--txt2)]">{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.status === "active" ? "bg-[var(--green3)] text-[var(--green)]" : "bg-[var(--red3)] text-[var(--red)]"}`}>{u.status === "active" ? "Ativo" : "Inativo"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
