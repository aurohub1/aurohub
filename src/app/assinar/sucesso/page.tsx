export default function AssinarSucessoPage() {
  return (
    <div style={{ minHeight: "100dvh", background: "#060D1A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 480, textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#e2e8f0", marginBottom: 12 }}>
          Pagamento confirmado!
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
          Você receberá um e-mail com seus dados de acesso em instantes.
        </p>
        <p style={{ color: "#6b7fa8", fontSize: 13, marginBottom: 40 }}>
          Verifique também sua caixa de spam.
        </p>
        <a
          href="/login"
          style={{
            display: "inline-block", padding: "14px 36px", borderRadius: 10,
            background: "#1A56C4", color: "#fff", fontSize: 15, fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Acessar o sistema →
        </a>
      </div>
    </div>
  );
}
