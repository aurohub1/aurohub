"use client";

import { useEffect, useRef } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "@/styles/driver-theme.css";
import { supabase } from "@/lib/supabase";

export type WelcomeRole = "cliente" | "vendedor" | "gerente" | "unidade";

function buildSteps(role: WelcomeRole, firstName: string): DriveStep[] {
  const step0: DriveStep = {
    element: "aside",
    popover: {
      title: `Bem-vindo ao Aurohub, ${firstName}! 👋`,
      description: "Aqui estão todas as suas ferramentas.",
    },
  };

  switch (role) {
    case "cliente":
      return [
        step0,
        {
          element: 'a[href="/cliente/publicar"]',
          popover: { title: "Publicar", description: "Crie e publique artes no Instagram das suas lojas." },
        },
        {
          element: 'a[href="/cliente/historico"]',
          popover: { title: "Histórico", description: "Veja todas as publicações das suas lojas." },
        },
        {
          element: 'a[href="/cliente/metricas"]',
          popover: { title: "Métricas", description: "Acompanhe o desempenho das publicações." },
        },
        {
          element: 'a[href="/cliente/calendario"]',
          popover: { title: "Calendário", description: "Agende publicações futuras." },
        },
        {
          element: 'a[href="/cliente/usuarios"]',
          popover: { title: "Usuários", description: "Gerencie sua equipe." },
        },
      ];

    case "gerente":
      return [
        { ...step0, popover: { ...step0.popover, description: "Suas ferramentas de gerente." } },
        {
          element: 'a[href="/gerente/publicar"]',
          popover: { title: "Publicar", description: "Publique artes para sua loja." },
        },
        {
          element: 'a[href="/gerente/consultores"]',
          popover: { title: "Consultores", description: "Gerencie sua equipe de consultores." },
        },
        {
          element: 'a[href="/gerente/metricas"]',
          popover: { title: "Métricas", description: "Acompanhe o desempenho da loja." },
        },
        {
          element: 'a[href="/gerente/calendario"]',
          popover: { title: "Calendário", description: "Visualize agendamentos." },
        },
      ];

    case "vendedor":
      return [
        {
          element: "aside",
          popover: {
            title: `Bem-vindo ao Aurohub, ${firstName}! 👋`,
            description: "Bem-vindo ao Aurohub!",
          },
        },
        {
          element: 'a[href="/consultor/publicar"]',
          popover: { title: "Publicar", description: "Aqui você cria e publica as artes." },
        },
        {
          element: 'a[href="/consultor/historico"]',
          popover: { title: "Histórico", description: "Veja suas publicações." },
        },
        {
          element: 'a[href="/consultor/calendario"]',
          popover: { title: "Calendário", description: "Seus agendamentos." },
        },
      ];

    case "unidade":
      return [
        { ...step0, popover: { ...step0.popover, description: "Suas ferramentas." } },
        {
          element: 'a[href="/unidade/publicar"]',
          popover: { title: "Publicar", description: "Crie e publique artes." },
        },
        {
          element: 'a[href="/unidade/metricas"]',
          popover: { title: "Métricas", description: "Acompanhe os resultados." },
        },
      ];
  }
}

export default function WelcomeTour({ role }: { role: WelcomeRole }) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, tour_pages")
        .eq("id", userData.user.id)
        .single();

      if (!profile) return;

      const tourPages: string[] = (profile.tour_pages as string[]) ?? [];
      if (tourPages.includes("welcome") || tourPages.includes("desativado")) return;
      if (startedRef.current) return;

      const firstName = ((profile.name as string) || "").split(" ")[0] || "por aí";
      const steps = buildSteps(role, firstName);

      const markDone = async () => {
        if (tourPages.includes("welcome")) return;
        try {
          await supabase
            .from("profiles")
            .update({ tour_pages: [...tourPages, "welcome"] })
            .eq("id", userData.user.id);
        } catch { /* silent */ }
      };

      timer = setTimeout(() => {
        if (startedRef.current) return;
        startedRef.current = true;

        const d = driver({
          showProgress: true,
          showButtons: ["next", "previous", "close"],
          smoothScroll: true,
          animate: true,
          nextBtnText: "Próximo",
          prevBtnText: "Anterior",
          doneBtnText: "Concluir",
          steps,
          onDestroyed: () => {
            markDone();
            driverRef.current = null;
          },
        });

        driverRef.current = d;
        d.drive();
      }, 1500);
    }

    init();

    return () => {
      clearTimeout(timer);
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [role]);

  return null;
}
