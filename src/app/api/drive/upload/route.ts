import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const cachedToken = { token: "", expiresAt: 0 };

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getRefreshToken(): Promise<string> {
  const { data } = await admin()
    .from("system_config")
    .select("value")
    .eq("key", "google_drive_refresh_token")
    .single();
  return data?.value ?? process.env.GOOGLE_REFRESH_TOKEN!;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken.token && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const refreshToken = await getRefreshToken();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    await admin().from("system_config").upsert(
      { key: "drive_token_error", value: "true" },
      { onConflict: "key" }
    );
    throw new Error("Falha ao obter access_token do Google");
  }
  await admin().from("system_config").upsert(
    { key: "drive_token_error", value: "false" },
    { onConflict: "key" }
  );
  cachedToken.token = data.access_token;
  cachedToken.expiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken.token;
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, fileName, folderId } = await req.json();
    if (!imageBase64 || !fileName || !folderId) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const mimeType = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    const boundary = "aurohub_" + Date.now();
    const metadata = JSON.stringify({ name: fileName, parents: [folderId] });

    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
      ),
      buffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "Content-Length": body.length.toString(),
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const file = await uploadRes.json();
    return NextResponse.json({ fileId: file.id, webViewLink: file.webViewLink });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
