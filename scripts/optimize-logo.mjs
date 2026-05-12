import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = resolve(__dirname, "../public");

const jobs = [
  { src: "logo-aurohub.png", out: "logo-aurohub.webp", size: 80 },
  { src: "logo-dark.png",    out: "logo-dark.webp",    size: 160 },
  { src: "logo-light.png",   out: "logo-light.webp",   size: 160 },
];

for (const { src, out, size } of jobs) {
  const input  = `${pub}/${src}`;
  const output = `${pub}/${out}`;
  const { size: before } = await sharp(input).metadata();
  await sharp(input).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toFile(output);
  const info = await sharp(output).metadata();
  const { size: after } = await import("fs").then(fs => ({ size: fs.statSync(output).size }));
  const beforeKB = (await import("fs").then(fs => fs.statSync(input).size) / 1024).toFixed(0);
  console.log(`${src} → ${out}: ${beforeKB}KB → ${(after / 1024).toFixed(0)}KB (${size}×${size}px)`);
}
