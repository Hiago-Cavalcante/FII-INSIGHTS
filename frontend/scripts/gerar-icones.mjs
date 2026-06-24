// Gera os PNGs do PWA a partir de public/icons/icon.svg.
// One-off (provenance): requer `npm i -D sharp` para rodar, depois pode remover.
//   node scripts/gerar-icones.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const dirIcons = join(aqui, "../public/icons");
const svg = readFileSync(join(dirIcons, "icon.svg"));

const alvos = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["icon-maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [nome, tamanho] of alvos) {
  await sharp(svg).resize(tamanho, tamanho).png().toFile(join(dirIcons, nome));
  console.log("gerado:", nome, `${tamanho}x${tamanho}`);
}
