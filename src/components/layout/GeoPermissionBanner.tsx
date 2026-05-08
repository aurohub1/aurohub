"use client";
import { useEffect, useState } from "react";

export default function GeoPermissionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("geo_dismissed");
    const granted   = localStorage.getItem("geo_granted");
    if (!dismissed && !granted) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem("geo_dismissed", "true");
    setVisible(false);
  };

  const activate = () => {
    if (!navigator.geolocation) { dismiss(); return; }
    navigator.geolocation.getCurrentPosition(
      () => {
        localStorage.setItem("geo_granted", "true");
        localStorage.setItem("geo_dismissed", "true");
        setVisible(false);
        window.location.reload();
      },
      () => { dismiss(); },
      { timeout: 10000 }
    );
  };

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      left: 20,
      zIndex: 10000,
      background: "var(--bg1)",
      border: "1px solid var(--bdr2)",
      borderRadius: 12,
      padding: "10px 14px",
      maxWidth: 300,
      boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <p style={{ margin: 0, fontSize: 11.5, color: "var(--txt2)", lineHeight: 1.5 }}>
        Ative a localização para exibir a previsão do tempo e registrar logs de segurança de acesso.
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={activate} style={{
          flex: 1, height: 28, borderRadius: 8, border: "none",
          background: "var(--orange)", color: "#fff",
          fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>
          Ativar
        </button>
        <button onClick={dismiss} style={{
          flex: 1, height: 28, borderRadius: 8,
          border: "1px solid var(--bdr2)", background: "transparent",
          color: "var(--txt2)", fontSize: 11, cursor: "pointer",
        }}>
          Agora não
        </button>
      </div>
    </div>
  );
}
