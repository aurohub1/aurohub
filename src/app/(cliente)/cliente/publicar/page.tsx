"use client";

import { HelpCircle } from "lucide-react";
import PublicarPageBase from "@/components/publish/PublicarPageBase";
import type { FullProfile } from "@/lib/auth";
import { useTour } from "@/hooks/useTour";

export default function ClientePublicarPage() {
  const { startTour, tourCompleted } = useTour({
    pageKey: "cliente-publicar",
    steps: [
      {
        popover: {
          title: "Bem-vindo à página de Publicar! 🎨",
          description: "Vamos fazer um tour rápido pelas principais funcionalidades. Clique em Próximo para continuar."
        }
      },
      {
        element: "[data-tour='template-tabs']",
        popover: {
          title: "Seletor de Template",
          description: "Escolha um template para criar sua arte. Cada template é personalizado para o seu negócio e pode ser usado em diferentes formatos (Stories, Feed, Reels, TV).",
          side: "bottom",
          align: "start"
        }
      },
      {
        element: "[data-tour='formulario']",
        popover: {
          title: "Formulário de Dados",
          description: "Preencha os dados do pacote ou produto que deseja divulgar. Os campos mudam de acordo com o tipo de template selecionado.",
          side: "right",
          align: "start"
        }
      },
      {
        element: "[data-tour='store-selector']",
        popover: {
          title: "Seletor de Loja",
          description: "Selecione qual loja receberá a publicação. Você pode publicar em múltiplas lojas ao mesmo tempo.",
          side: "top",
          align: "center"
        }
      },
      {
        element: "[data-tour='publish-button']",
        popover: {
          title: "Botão de Publicar",
          description: "Clique aqui para publicar diretamente no Instagram ou fazer download da arte para publicar depois.",
          side: "top",
          align: "center"
        }
      },
      {
        element: "[data-tour='preview']",
        popover: {
          title: "Preview ao Vivo",
          description: "Visualize em tempo real como ficará sua arte antes de publicar. O preview atualiza automaticamente conforme você preenche o formulário.",
          side: "left",
          align: "center"
        }
      },
      {
        popover: {
          title: "Pronto! 🎉",
          description: "Agora você já conhece as principais funcionalidades. Clique no botão ? a qualquer momento para ver este tour novamente."
        }
      }
    ]
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
          bottom: "80px",
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
