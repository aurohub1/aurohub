export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Posts este mês", value: "0", color: "var(--color-gold)" },
          { label: "Stories este mês", value: "0", color: "var(--color-orange)" },
          { label: "Agendados", value: "0", color: "var(--color-info)" },
          { label: "Créditos restantes", value: "0", color: "var(--color-success)" },
        ].map((stat) => (
          <div key={stat.label} className="card p-5">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className="text-3xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Ações rápidas */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
        <div className="flex gap-3 flex-wrap">
          <a href="/publish" className="btn-primary text-sm">
            Nova Publicação
          </a>
          <a href="/editor" className="btn-secondary text-sm">
            Abrir Editor
          </a>
          <a href="/schedule" className="btn-secondary text-sm">
            Agendamentos
          </a>
        </div>
      </div>
    </div>
  );
}
