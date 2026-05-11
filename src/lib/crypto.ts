import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
const KEY = process.env.ENCRYPTION_KEY!;
export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const key = Buffer.from(KEY, "hex");
  const c = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return `${iv.toString("hex")}:${c.getAuthTag().toString("hex")}:${enc.toString("hex")}`;
}
export function decrypt(data: string): string {
  const [ivH, tagH, encH] = data.split(":");
  const key = Buffer.from(KEY, "hex");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(ivH, "hex"));
  d.setAuthTag(Buffer.from(tagH, "hex"));
  return d.update(Buffer.from(encH, "hex")) + d.final("utf8");
}
export const isEncrypted = (v: string) => v?.split(":").length === 3;
