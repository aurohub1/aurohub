"use client";

import { useEffect, useRef, useState } from "react";
import { driver, DriveStep, type Driver } from "driver.js";
import "@/styles/driver-theme.css";
import { supabase } from "@/lib/supabase";

interface UseTourOptions {
  pageKey: string;
  steps: DriveStep[];
  autoStart?: boolean; // default true
  delay?: number; // default 1000ms
}

export function useTour({ pageKey, steps, autoStart = true, delay = 1000 }: UseTourOptions) {
  const [userId, setUserId] = useState<string | null>(null);
  const [tourPages, setTourPages] = useState<string[]>([]);
  const driverRef = useRef<Driver | null>(null);
  const hasStartedRef = useRef(false);

  // Carrega os dados do usuário ao montar
  useEffect(() => {
    async function loadUser() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      setUserId(userData.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("tour_pages")
        .eq("id", userData.user.id)
        .single();

      if (profile) {
        setTourPages((profile.tour_pages as string[]) || []);
      }
    }

    loadUser();
  }, []);

  // Verifica se o tour já foi feito
  const tourCompleted = tourPages.includes(pageKey);

  // Salva no Supabase que o tour foi concluído
  const markTourAsCompleted = async () => {
    if (!userId) return;

    try {
      const currentPages = tourPages || [];
      if (currentPages.includes(pageKey)) return;

      const updatedPages = [...currentPages, pageKey];

      const { error } = await supabase
        .from("profiles")
        .update({ tour_pages: updatedPages })
        .eq("id", userId);

      if (error) {
        console.error("Erro ao salvar tour:", error);
      } else {
        setTourPages(updatedPages);
      }
    } catch (err) {
      console.error("Erro ao marcar tour como concluído:", err);
    }
  };

  // Inicia o tour manualmente
  const startTour = () => {
    if (!driverRef.current) {
      driverRef.current = driver({
        showProgress: true,
        showButtons: ["next", "previous", "close"],
        steps,
        onDestroyed: () => {
          markTourAsCompleted();
        },
        onDestroyStarted: () => {
          // Salva mesmo se o usuário pular/fechar o tour
          markTourAsCompleted();
        },
      });
    }

    driverRef.current.drive();
  };

  useEffect(() => {
    // Não inicia automaticamente se:
    // - autoStart desabilitado
    // - tour já foi concluído
    // - já foi iniciado nesta sessão
    // - usuário não está autenticado
    if (!autoStart || tourCompleted || hasStartedRef.current || !userId) {
      return;
    }

    const timer = setTimeout(() => {
      hasStartedRef.current = true;
      startTour();
    }, delay);

    return () => {
      clearTimeout(timer);
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [autoStart, tourCompleted, delay, userId]);

  return {
    startTour,
    tourCompleted,
  };
}
