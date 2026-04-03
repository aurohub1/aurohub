const GRAPH_URL = "https://graph.instagram.com";

// IDs fixos AZV — NUNCA alterar
export const AZV_ACCOUNTS = {
  rio_preto: { id: "24935761849433430", name: "Rio Preto" },
  barretos:  { id: "26142577712029524", name: "Barretos" },
  damha:     { id: "26585470474377899", name: "Damha" },
} as const;

export async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string,
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" = "IMAGE"
) {
  // Step 1: Create media container
  const createRes = await fetch(`${GRAPH_URL}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      media_type: mediaType,
      access_token: accessToken,
    }),
  });
  const { id: containerId } = await createRes.json();

  // Step 2: Publish
  const publishRes = await fetch(`${GRAPH_URL}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: accessToken,
    }),
  });

  return publishRes.json();
}
