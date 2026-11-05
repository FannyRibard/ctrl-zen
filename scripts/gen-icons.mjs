// Génère les icônes PNG de l'app (version « Abricot » : touche ctrl + Zen + pousse + racines).
// Le texte est converti en tracés avec la police DM Sans, puis rendu en PNG.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import opentype from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const fontPath = (w) => require.resolve(`@fontsource/dm-sans/files/dm-sans-latin-${w}-normal.woff`);
const bold = opentype.loadSync(fontPath(800));
const semi = opentype.loadSync(fontPath(700));

function textPath(font, text, size, x, y, anchor = 'start') {
  const w = font.getAdvanceWidth(text, size);
  const x0 = anchor === 'middle' ? x - w / 2 : x;
  return font.getPath(text, x0, y, size).toPathData(2);
}

// Dessin de la touche, dans un repère 72 × 62 (comme sur la maquette).
const face = `
  <rect width="72" height="62" rx="14" fill="#FFF8F0"/>
  <path d="${textPath(semi, 'ctrl', 8, 7, 11)}" fill="#8A6A4A"/>
  <g stroke="#3F6B4A" stroke-width="1.3" stroke-linejoin="round">
    <path d="M36 23v-6" fill="none" stroke-width="2" stroke-linecap="round"/>
    <path d="M36 18c-4.5 0-7-2.2-7-5.5 4.5 0 7 2.2 7 5.5Z" fill="#9CC3A4"/>
    <path d="M36 16c3.5 0 5.8-2.2 5.8-5-3.5 0-5.8 2.2-5.8 5Z" fill="#9CC3A4"/>
  </g>
  <path d="${textPath(bold, 'Zen', 21, 36, 39, 'middle')}" fill="#3F6B4A"/>
  <g fill="none" stroke="#9A6B3E" stroke-width="2" stroke-linecap="round">
    <path d="M29 43c0 4-2 6-5 8"/><path d="M36 43v9"/><path d="M43 43c0 4 2 6 5 8"/>
  </g>`;

function iconSvg({ scale = 1 } = {}) {
  // Repère 96 × 96 ; la touche (74 × 70) est centrée.
  const s = scale;
  const t = 48 - 48 * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <rect width="96" height="96" fill="#F9E3CC"/>
  <g transform="translate(${t} ${t}) scale(${s})">
    <rect x="11" y="13" width="74" height="70" rx="15" fill="#E3C29D"/>
    <g transform="translate(11 13) scale(${74 / 72} ${64 / 62})">${face}</g>
  </g>
</svg>`;
}

function png(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });
const normal = iconSvg();
const maskable = iconSvg({ scale: 0.76 });

writeFileSync(new URL('apple-touch-icon.png', out), png(normal, 180));
writeFileSync(new URL('icon-192.png', out), png(normal, 192));
writeFileSync(new URL('icon-512.png', out), png(normal, 512));
writeFileSync(new URL('icon-maskable-512.png', out), png(maskable, 512));
writeFileSync(new URL('icon.svg', out), normal);
console.log('Icônes générées dans public/icons/');
