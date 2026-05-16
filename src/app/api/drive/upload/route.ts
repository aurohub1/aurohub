import { NextRequest, NextResponse } from "next/server";
import { JWT } from "google-auth-library";

export const runtime = "nodejs";

function getAuthClient(): JWT {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!b64) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY não configurada");
  const creds = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  return new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, fileName, folderId } = await req.json();
    if (!imageBase64 || !fileName || !folderId) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const auth = getAuthClient();
    const tokenRes = await auth.getAccessToken();
    const accessToken = tokenRes.token;
    if (!accessToken) throw new Error("Falha ao obter access_token da Service Account");

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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
