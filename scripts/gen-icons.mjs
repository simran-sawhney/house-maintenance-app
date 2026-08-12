// Regenerate PWA raster icons from public/icons/icon.svg.
// Run: node scripts/gen-icons.mjs   (requires devDependency `sharp`)
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/icons/icon.svg"));
const out = (f) => join(root, "public/icons", f);

const bg = "#2c2822";

async function main() {
  await sharp(svg).resize(192, 192).png().toFile(out("icon-192.png"));
  await sharp(svg).resize(512, 512).png().toFile(out("icon-512.png"));
  await sharp(svg).resize(180, 180).png().toFile(out("apple-touch-icon.png"));

  // Maskable: pad the mark onto a full-bleed background so it survives the
  // safe-zone crop on Android.
  const inner = await sharp(svg).resize(360, 360).png().toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: inner, gravity: "centre" }])
    .png()
    .toFile(out("icon-maskable-512.png"));

  console.log("Icons generated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
