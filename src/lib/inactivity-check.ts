import { createClient } from "@supabase/supabase-js";

export interface InactiveStore {
  storeId: string;
  storeName: string;
  daysSinceLastPost: number;
}

export async function getInactiveStores(
  supabase: ReturnType<typeof createClient>,
  licenseeId: string
): Promise<InactiveStore[]> {
  try {
    const { data: stores } = await supabase
      .from("stores")
      .select("id, name")
      .eq("licensee_id", licenseeId);

    if (!stores || stores.length === 0) return [];

    const now = new Date();
    const inactiveStores: InactiveStore[] = [];

    for (const store of stores) {
      const { data: lastPost } = await supabase
        .from("publication_history")
        .select("created_at")
        .eq("loja_id", store.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!lastPost) {
        continue;
      }

      const lastPostDate = new Date(lastPost.created_at);
      const diffMs = now.getTime() - lastPostDate.getTime();
      const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysSince >= 5) {
        inactiveStores.push({
          storeId: store.id,
          storeName: store.name,
          daysSinceLastPost: daysSince,
        });
      }
    }

    return inactiveStores;
  } catch (err) {
    console.error("[InactivityCheck] Error:", err);
    return [];
  }
}
