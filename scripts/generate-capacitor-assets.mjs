// Capacitor アプリアイコン・スプラッシュ画面の素材生成スクリプト
//
// 使い方:
//   node scripts/generate-capacitor-assets.mjs
//
// 生成物:
//   assets/icon.png        (1024x1024 - @capacitor/assets が iOS/Android 全サイズに展開)
//   assets/icon-foreground.png (1024x1024 - Android adaptive icon の前景レイヤー)
//   assets/icon-background.png (1024x1024 - Android adaptive icon の背景レイヤー)
//   assets/splash.png      (2732x2732 - スプラッシュ画面、amber-100 背景に中央ロゴ)
//   assets/splash-dark.png (2732x2732 - ダークモード版、暗色背景に中央ロゴ)
//
// 後段:
//   npx capacitor-assets generate
//   ↑ 上記 PNG を ios/ android/ プロジェクトの全解像度アイコン・スプラッシュへ自動展開
//
// 設計:
// - 既存 PWA 用 logo.svg を再利用（PWA との見た目統一）
// - 背景色 #fef3c7（amber-100）は capacitor.config.ts と統一
// - splash の中央ロゴは 700x700（2732x2732 中心配置で適切な余白）

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(APP_ROOT, "public");
const ASSETS_DIR = path.join(APP_ROOT, "assets");

const LOGO_SVG = path.join(PUBLIC_DIR, "logo.svg");
const LOGO_MASKABLE_SVG = path.join(PUBLIC_DIR, "logo-maskable.svg");

const BG_LIGHT = "#fef3c7"; // amber-100
const BG_DARK = "#1f2937"; // gray-800（ダークモード用）

async function ensureAssetsDir() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
}

async function generateIcon() {
  // アイコン本体: 1024x1024 で透過 PNG。@capacitor/assets が iOS/Android の各サイズへ展開する
  // 入力 SVG が透過済みなのでそのままリサイズして PNG 化
  const out = path.join(ASSETS_DIR, "icon.png");
  await sharp(LOGO_SVG)
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  console.log("✓ assets/icon.png (1024x1024)");
}

async function generateAndroidAdaptiveIcon() {
  // Android adaptive icon: foreground（ロゴ・透過）と background（単色）の2レイヤー
  const fgOut = path.join(ASSETS_DIR, "icon-foreground.png");
  const bgOut = path.join(ASSETS_DIR, "icon-background.png");

  // foreground: 中央 60% にロゴ配置（adaptive icon の安全領域に合わせる）
  // 1024x1024 のうち中央 660x660 にロゴを置く
  const fgLogo = await sharp(LOGO_MASKABLE_SVG).resize(660, 660).png().toBuffer();
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: fgLogo, gravity: "center" }])
    .png()
    .toFile(fgOut);
  console.log("✓ assets/icon-foreground.png (1024x1024)");

  // background: amber-100 のベタ塗り
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: BG_LIGHT },
  })
    .png()
    .toFile(bgOut);
  console.log("✓ assets/icon-background.png (1024x1024)");
}

async function generateSplash(outName, bgColor) {
  // splash: 2732x2732（@capacitor/assets が iPad Pro まで対応するため最大サイズ推奨）
  // amber-100（または dark）背景の中央に 700x700 のロゴ
  const out = path.join(ASSETS_DIR, outName);
  const logoBuf = await sharp(LOGO_SVG).resize(700, 700).png().toBuffer();
  await sharp({
    create: { width: 2732, height: 2732, channels: 4, background: bgColor },
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png()
    .toFile(out);
  console.log(`✓ assets/${outName} (2732x2732, bg=${bgColor})`);
}

async function main() {
  // 入力ファイル存在チェック
  await fs.access(LOGO_SVG);
  await fs.access(LOGO_MASKABLE_SVG);

  await ensureAssetsDir();

  await generateIcon();
  await generateAndroidAdaptiveIcon();
  await generateSplash("splash.png", BG_LIGHT);
  await generateSplash("splash-dark.png", BG_DARK);

  console.log("\nCapacitor 素材生成完了");
  console.log("次: npx capacitor-assets generate で iOS/Android の全解像度に展開");
}

main().catch((err) => {
  console.error("Capacitor 素材生成失敗:", err);
  process.exit(1);
});
