export default function AssinarErroPage() {
  return (
    <div style={{ minHeight: "100dvh", background: "#060D1A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 480, textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>❌</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#e2e8f0", marginBottom: 12 }}>
          Houve um problema com o pagamento
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>
          Seu pagamento não foi concluído. Nenhuma cobrança foi realizada.
          Você pode tentar novamente ou entrar em contato pelo{" "}
          <a href="mailto:contato@aurovista.com.br" style={{ color: "#3B82F6" }}>contato@aurovista.com.br</a>.
        </p>
        <a
          href="/assinar"
          style={{
            display: "inline-block", padding: "14px 36px", borderRadius: 10,
            background: "#1A56C4", color: "#fff", fontSize: 15, fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Tentar novamente
        </a>
      </div>
    </div>
  );
}
