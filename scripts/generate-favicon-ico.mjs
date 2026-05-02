// favicon.ico (マルチサイズ 16x16 / 32x32) 生成スクリプト
// sharp で PNG を作って、独自に ICO ファイルヘッダを書いてマルチサイズ ico を生成する
// 依存: sharp (既存)
//
// 使い方:
//   node scripts/generate-favicon-ico.mjs
//
// 出力: src/app/favicon.ico

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const APP_DIR = path.resolve(__dirname, "..", "src", "app");

const LOGO_SVG = path.join(PUBLIC_DIR, "logo.svg");

// PNG バッファを ICO エントリ形式にラップする
// 参考: https://en.wikipedia.org/wiki/ICO_(file_format)
function buildIco(pngBuffers) {
  // ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes * count)
  const count = pngBuffers.length;
  const headerSize = 6 + 16 * count;

  const sizes = [16, 32];
  let offset = headerSize;

  // ICONDIR
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type 1 = ICO
  dir.writeUInt16LE(count, 4); // image count

  // ICONDIRENTRY 配列
  const entries = [];
  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i];
    const size = sizes[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // data size
    entry.writeUInt32LE(offset, 12); // data offset
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([dir, ...entries, ...pngBuffers]);
}

async function main() {
  await fs.access(LOGO_SVG);

  const png16 = await sharp(LOGO_SVG).resize(16, 16).png().toBuffer();
  const png32 = await sharp(LOGO_SVG).resize(32, 32).png().toBuffer();

  const ico = buildIco([png16, png32]);
  const outPath = path.join(APP_DIR, "favicon.ico");
  await fs.writeFile(outPath, ico);
  console.log(`✓ favicon.ico (16x16, 32x32) -> ${outPath}`);
}

main().catch((err) => {
  console.error("favicon.ico 生成失敗:", err);
  process.exit(1);
});
