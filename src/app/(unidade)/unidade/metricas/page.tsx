"use client";

import { HelpCircle } from "lucide-react";
import UserMetricsPage from "@/components/metrics/UserMetricsPage";
import { useTour } from "@/hooks/useTour";

export default function Page() {
  const { startTour } = useTour({
    pageKey: "unidade-metricas",
    steps: [
      {
        element: "[data-tour='kpi-cards']",
        popover: {
          title: "Indicadores principais",
          description: "Acompanhe o total de publicações, downloads e outros indicadores do período.",
          side: "bottom",
        },
      },
      {
        element: "[data-tour='grafico']",
        popover: {
          title: "Gráfico de publicações",
          description: "Visualize a evolução diária das publicações e a distribuição por formato.",
          side: "top",
        },
      },
      {
        popover: {
          title: "Pronto!",
          description: "Use as métricas para acompanhar o desempenho da unidade. O botão ? está disponível a qualquer momento.",
        },
      },
    ],
    autoStart: true,
    delay: 1000,
  });

  return (
    <>
      <UserMetricsPage />

      <button
        onClick={startTour}
        title="Ver tour guiado"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "var(--orange)",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          zIndex: 9999,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
        }}
      >
        <HelpCircle size={24} strokeWidth={2.5} />
      </button>
    </>
  );
}
