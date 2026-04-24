import { createClient } from "@supabase/supabase-js";

export type InstagramStatus = "valid" | "invalid" | "network-error" | "no-token";

export interface InstagramStatusResult {
  status: InstagramStatus;
  message: string;
}

export async function checkInstagramToken(
  storeId: string,
  supabase: ReturnType<typeof createClient>
): Promise<InstagramStatusResult> {
  try {
    const { data: cred, error } = await supabase
      .from("instagram_credentials")
      .select("access_token")
      .eq("store_id", storeId)
      .single();

    if (error || !cred?.access_token) {
      return { status: "no-token", message: "Sem token cadastrado" };
    }

    const token = cred.access_token;
    const url = `https://graph.instagram.com/me?fields=id&access_token=${token}`;

    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.id) {
        return { status: "valid", message: "Token válido" };
      }
    }

    const errorData = await response.json().catch(() => ({}));

    if (errorData.error?.code === 190) {
      return { status: "invalid", message: "Token inválido ou expirado" };
    }

    return { status: "network-error", message: "Erro ao verificar token" };

  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { status: "network-error", message: "Timeout ao verificar token" };
    }
    return { status: "network-error", message: "Erro de rede" };
  }
}
