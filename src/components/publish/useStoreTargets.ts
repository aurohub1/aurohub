import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { FullProfile } from "@/lib/auth";

export interface StoreOption {
  id: string;
  name: string;
}

/**
 * Hook para carregar e gerenciar as lojas disponíveis para publicação.
 *
 * Regras:
 * - Todos os roles buscam lojas via user_stores
 * - Se user_stores vazio, fallback para profile.store_id
 * - Loja padrão selecionada: a própria loja do usuário, ou a primeira disponível
 */
export function useStoreTargets(profile: FullProfile | null) {
  const [publishTargets, setPublishTargets] = useState<StoreOption[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStores() {
      if (!profile?.id || !profile?.licensee_id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      let targets: StoreOption[] = [];

      try {
        // 1. Buscar lojas via user_stores
        const { data: userStores } = await supabase
          .from("user_stores")
          .select("store_id")
          .eq("user_id", profile.id);

        if (userStores && userStores.length > 0) {
          // Usuário tem lojas atribuídas via user_stores
          const storeIds = userStores.map((us) => us.store_id);
          const { data: storesData } = await supabase
            .from("stores")
            .select("id,name")
            .in("id", storeIds)
            .order("name");

          targets = (storesData ?? []) as StoreOption[];
        } else if (profile.store_id) {
          // Fallback: usar a loja do próprio usuário
          const { data: ownStore } = await supabase
            .from("stores")
            .select("id,name")
            .eq("id", profile.store_id)
            .single();

          if (ownStore) {
            targets = [ownStore as StoreOption];
          }
        }

        setPublishTargets(targets);

        // Selecionar loja padrão: a própria loja do usuário, ou a primeira disponível
        const defaultStoreId =
          targets.find((t) => t.id === profile.store_id)?.id ||
          (targets.length > 0 ? targets[0].id : "");

        setSelectedTargetIds(defaultStoreId ? [defaultStoreId] : []);
      } catch (error) {
        console.error("Erro ao carregar lojas:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStores();
  }, [profile?.id, profile?.licensee_id, profile?.store_id]);

  function toggleTarget(id: string) {
    setSelectedTargetIds((prev) => {
      if (prev.includes(id)) {
        // Não permite desmarcar se for a única loja selecionada
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }

  return {
    publishTargets,
    selectedTargetIds,
    toggleTarget,
    isLoading,
  };
}
