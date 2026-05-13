"use client";

import Link from "next/link";

export default function BriefingConcluidoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "#060D1A" }}>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl mb-2">✅</div>
        <h1 className="text-2xl font-bold text-white">
          Briefing enviado com sucesso!
        </h1>
        <p className="text-gray-400 text-base leading-relaxed">
          Nossa equipe já recebeu suas informações e entrará em contato para
          confirmar os detalhes antes de iniciar a criação dos seus templates.
        </p>
        <p className="text-gray-500 text-sm">
          Prazo estimado: <span className="text-white font-semibold">3 dias úteis</span>
        </p>
        <Link
          href="/login"
          className="inline-block mt-4 px-8 py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
          style={{ background: "#1A56C4" }}
        >
          Acessar minha conta
        </Link>
      </div>
    </div>
  );
}
