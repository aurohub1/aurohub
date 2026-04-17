const CLOUD = "dxgj4bcch";
const UPLOAD_PRESET = "aurohub17";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`;
const DELIVERY_BASE = `https://res.cloudinary.com/${CLOUD}/image/upload/`;

export function cldUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return DELIVERY_BASE + path.replace(/^\/+/, "");
}

export async function uploadToCloudinary(file: File, folder = "aurohubv2/profile"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", folder);

  const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `Upload falhou (${res.status})`;
    console.error("[Cloudinary]", msg, data);
    throw new Error(msg);
  }
  return data.secure_url as string;
}
