// Buat ikon Mentok si Kurir (PNG) dari SVG — jalankan: bun scripts/make-icons.mjs
import sharp from "sharp";

const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#C75B2B"/>
  <ellipse cx="150" cy="392" rx="58" ry="40" fill="#F7C948"/>
  <ellipse cx="362" cy="392" rx="58" ry="40" fill="#F7C948"/>
  <circle cx="256" cy="272" r="152" fill="#F7C948"/>
  <path d="M 218 130 q 16 -30 38 -8 q 8 -24 32 -18 q -10 24 -26 36 Z" fill="#E8B12E"/>
  <circle cx="203" cy="252" r="15" fill="#33241C"/>
  <circle cx="309" cy="252" r="15" fill="#33241C"/>
  <circle cx="208" cy="246" r="5" fill="#FFFFFF"/>
  <circle cx="314" cy="246" r="5" fill="#FFFFFF"/>
  <path d="M 256 296 q 38 -16 76 0 q -12 34 -38 34 q -26 0 -38 -34 Z" fill="#E8862E"/>
  <path d="M 274 300 q 20 8 40 0" stroke="#C75B2B" stroke-width="5" fill="none" stroke-linecap="round"/>
</svg>`;

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icon-${size}.png`);
  console.log(`icon-${size}.png ok`);
}
