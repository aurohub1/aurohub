export default function AssinarPendentePage() {
  return (
    <div style={{ minHeight: "100dvh", background: "#060D1A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 480, textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#e2e8f0", marginBottom: 12 }}>
          Pagamento em processamento
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>
          Assim que o pagamento for confirmado, enviaremos seus dados de acesso por e-mail.
          Isso pode levar alguns instantes.
        </p>
        <a
          href="https://app.aurovista.com.br"
          style={{
            display: "inline-block", padding: "12px 28px", borderRadius: 10,
            border: "1.5px solid rgba(255,255,255,0.15)", color: "#94a3b8",
            fontSize: 14, textDecoration: "none",
          }}
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}
