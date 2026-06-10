import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://emcafedppvwparimvtob.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2FmZWRwcHZ3cGFyaW12dG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzMjYxNywiZXhwIjoyMDkwODA4NjE3fQ.HW_hnK0mNjR2qyBBFv6FymNFKq7GkAZB7gw4LnsY7cM";
const CLOUDINARY_CLOUD = "dxgj4bcch";
const CLOUDINARY_API_KEY = "467148493144542";
const CLOUDINARY_API_SECRET = "_3nr1rO5nB3wfI2P1-vAqOl_Q-8";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function authHeader() {
  return "Basic " + Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString("base64");
}

function extractPublicId(url) {
  if (!url) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
  return match ? match[1] : null;
}

async function fetchDims(publicId) {
  const encoded = publicId.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/resources/image/upload/${encoded}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return null;
  const data = await res.json();
  return { width: data.width, height: data.height };
}

async function main() {
  const { data: rows, error } = await supabase
    .from("imgfundo")
    .select("id, nome, url, public_id, tipo, formato")
    .order("id");

  if (error) throw error;
  console.log(`Total registros: ${rows.length}\n`);

  const items = rows.map(row => {
    const pid = row.public_id || extractPublicId(row.url);
    return { row, pid };
  }).filter(x => x.pid && !x.pid.match(/^[0-9a-f-]{36}$/)); // ignora UUIDs

  console.log(`Com public_id válido (excluindo UUIDs): ${items.length}\n`);

  const results = [];
  for (let i = 0; i < items.length; i += 10) {
    const batch = items.slice(i, i + 10);
    const dims = await Promise.all(batch.map(x => fetchDims(x.pid)));
    for (let j = 0; j < batch.length; j++) {
      if (dims[j]) {
        results.push({ pid: batch[j].pid, row: batch[j].row, ...dims[j] });
      }
    }
    process.stdout.write(`\r  ${Math.min(i + 10, items.length)}/${items.length}…`);
    if (i + 10 < items.length) await new Promise(r => setTimeout(r, 100));
  }
  console.log("\n");

  const horizontal = results.filter(x => x.width > x.height);
  const vertical   = results.filter(x => x.height >= x.width);

  console.log(`Horizontal (width > height): ${horizontal.length}`);
  console.log(`Vertical   (height >= width): ${vertical.length}`);
  console.log(`Falhou/sem dims: ${items.length - results.length}`);

  console.log("\n=== Primeiros 10 com dimensões ===");
  results.slice(0, 10).forEach(x => {
    const orient = x.width > x.height ? "HORIZONTAL" : "vertical  ";
    console.log(`  [${orient}]  ${x.pid.padEnd(50).slice(0,50)}  ${x.width}x${x.height}`);
  });

  if (horizontal.length) {
    console.log("\n=== Todos os HORIZONTAIS ===");
    horizontal.forEach(x => {
      console.log(`  ${x.pid}  ${x.width}x${x.height}  tipo=${x.row.tipo}  formato=${x.row.formato}`);
    });
  }
}

main().catch(e => { console.error("\nERRO:", e.message); process.exit(1); });
