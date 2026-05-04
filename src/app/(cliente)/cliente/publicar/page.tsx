"use client";

import { HelpCircle } from "lucide-react";
import PublicarPageBase from "@/components/publish/PublicarPageBase";
import { useTour } from "@/hooks/useTour";

export default function ClientePublicarPage() {
  const { startTour } = useTour({
    pageKey: "cliente-publicar",
    steps: [
      {
        element: "[data-tour='template-tabs']",
        popover: {
          title: "Escolha o tipo de arte",
          description: "Selecione o tipo de conteúdo que deseja criar: Pacote, Campanha, Passagem, Cruzeiro ou Card WhatsApp. Depois escolha o formato (Stories, Feed, Reels ou TV).",
          side: "bottom"
        }
      },
      {
        popover: {
          title: "Como funciona",
          description: "Após escolher o template, você preencherá os dados do pacote (destino, preço, datas, etc) e poderá publicar diretamente no Instagram ou fazer download da arte."
        }
      },
      {
        popover: {
          title: "Pronto!",
          description: "Comece escolhendo um tipo de arte acima. O botão ? está disponível a qualquer momento para rever este tour."
        }
      }
    ],
    autoStart: true,
    delay: 1000
  });

  return (
    <>
      <PublicarPageBase
        role="cliente"
        enablePublishing={true}
        getNomeLoja={(profile, selectedTargetIds, publishTargets) => {
          // 1 loja selecionada → passa store.name da loja selecionada
          // 2+ lojas selecionadas → passa undefined (legenda genérica)
          if (selectedTargetIds.length === 1) {
            const selectedStore = publishTargets.find(
              (t) => t.id === selectedTargetIds[0]
            );
            return selectedStore?.name;
          }
          return undefined;
        }}
      />

      {/* Botão de ajuda fixo */}
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
