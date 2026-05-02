// sodatelu アイコン生成スクリプト
// public/logo-mark.svg と logo-maskable.svg から PWA / favicon / apple-touch-icon 用の PNG を生成する
//
// 使い方:
//   node scripts/generate-icons.mjs
//
// 生成物:
//   public/icon-192.png        (192x192 - PWA 標準)
//   public/icon-512.png        (512x512 - PWA 標準)
//   public/icon-maskable-192.png (192x192 maskable)
//   public/icon-maskable-512.png (512x512 maskable)
//   public/apple-touch-icon.png  (180x180 - iOS ホーム画面)
//   public/favicon-16.png      (16x16 favicon用素材)
//   public/favicon-32.png      (32x32 favicon用素材)
//
// 入力:
//   public/logo-mark.svg     - 円+芽（マークのみ）。アプリアイコン・ストア向け
//   public/logo-maskable.svg - PWA maskable safe zone 80%対応
//
// 注意: favicon.ico (マルチサイズ) の生成は src/app/favicon.ico を別途配置する。
//       sharp 単体では .ico (マルチサイズ) を出せないので、
//       既存の favicon.ico を残すか、icon.svg ベースで Next.js に任せる方針。

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

// マーク単独ロゴ（円 + 白い芽）。logo.svg は後方互換として残しつつ、新規入力は logo-mark.svg に統一
const LOGO_SVG = path.join(PUBLIC_DIR, "logo-mark.svg");
const LOGO_MASKABLE_SVG = path.join(PUBLIC_DIR, "logo-maskable.svg");

async function generate(svgPath, outName, size) {
  const outPath = path.join(PUBLIC_DIR, outName);
  await sharp(svgPath)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ ${outName} (${size}x${size})`);
}

async function main() {
  // 入力ファイル存在チェック
  await fs.access(LOGO_SVG);
  await fs.access(LOGO_MASKABLE_SVG);

  // PWA 標準アイコン
  await generate(LOGO_SVG, "icon-192.png", 192);
  await generate(LOGO_SVG, "icon-512.png", 512);

  // PWA maskable アイコン
  await generate(LOGO_MASKABLE_SVG, "icon-maskable-192.png", 192);
  await generate(LOGO_MASKABLE_SVG, "icon-maskable-512.png", 512);

  // iOS apple-touch-icon (180x180 推奨)
  await generate(LOGO_SVG, "apple-touch-icon.png", 180);

  // favicon 用の素材 (.ico は別工程)
  await generate(LOGO_SVG, "favicon-16.png", 16);
  await generate(LOGO_SVG, "favicon-32.png", 32);

  console.log("\nアイコン生成完了");
}

main().catch((err) => {
  console.error("アイコン生成失敗:", err);
  process.exit(1);
});
