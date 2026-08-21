import { createCipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";

const DEFAULT_SCOPES = "user.view licenses.create licenses.view purchases.view";

export function getShutterstockConfig() {
  const clientId = process.env.SHUTTERSTOCK_CLIENT_ID;
  const clientSecret = process.env.SHUTTERSTOCK_CLIENT_SECRET;
  const redirectUri = process.env.SHUTTERSTOCK_REDIRECT_URI;
  const encryptionKey = process.env.SHUTTERSTOCK_TOKEN_ENCRYPTION_KEY;
  const scopes = process.env.SHUTTERSTOCK_OAUTH_SCOPES || DEFAULT_SCOPES;
  if (!clientId || !clientSecret || !redirectUri || !encryptionKey) return null;

  try {
    const callback = new URL(redirectUri);
    if (callback.protocol !== "https:" && callback.hostname !== "localhost") return null;
    if (callback.pathname !== "/api/shutterstock/callback") return null;
  } catch {
    return null;
  }

  return { clientId, clientSecret, redirectUri, encryptionKey, scopes };
}

const encode = (value: string | Buffer) => Buffer.from(value).toString("base64url");

export function signShutterstockState(payload: object, secret: string) {
  const body = encode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyShutterstockState(value: string, secret: string) {
  try {
    const [body, signature, extra] = value.split(".");
    if (!body || !signature || extra) return null;
    const expected = createHmac("sha256", secret).update(body).digest();
    const received = Buffer.from(signature, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {nonce?:string;userId?:string;exp?:number};
    if (!parsed.nonce || !parsed.userId || typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return null;
    return parsed as {nonce:string;userId:string;exp:number};
  } catch {
    return null;
  }
}

export function encryptShutterstockToken(token: string, encodedKey: string) {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("SHUTTERSTOCK_TOKEN_ENCRYPTION_KEY deve conter 32 bytes em Base64.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
