// SVGロゴプレビュー生成スクリプト
// public/logo-*.svg を amber 背景上 / 白背景上 のPNGに合成して
// docs/screenshots/ に保存し、各バリアントの見た目を確認できるようにする
//
// 使い方:
//   node scripts/render-logo-preview.mjs

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, "..");
const PUBLIC = path.join(APP_DIR, "public");
const OUT_DIR = path.resolve(APP_DIR, "..", "docs", "screenshots");

await fs.mkdir(OUT_DIR, { recursive: true });

// SVG → PNG にレンダリングしてから合成する
// （sharp の composite は元画像が背景より大きいと弾かれるため、SVGを先に欲しいサイズへPNG化）
async function rasterizeSvg(svgPath, targetWidth) {
  return await sharp(await fs.readFile(svgPath))
    .resize({ width: targetWidth, fit: "inside" })
    .png()
    .toBuffer();
}

async function renderOnAmber(svgPath, outName, w, h, logoWidth) {
  // amber-500 → amber-400 グラデーションをヘッダー背景として再現
  const bgSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#FBBF24"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>
  `;
  const logoPng = await rasterizeSvg(svgPath, logoWidth);
  const composite = await sharp(Buffer.from(bgSvg))
    .composite([{ input: logoPng, gravity: "center" }])
    .png()
    .toBuffer();
  await fs.writeFile(path.join(OUT_DIR, outName), composite);
  console.log(`  ✓ ${outName}`);
}

async function renderOnWhite(svgPath, outName, w, h, logoWidth) {
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#FAFAFA"/></svg>`;
  const logoPng = await rasterizeSvg(svgPath, logoWidth);
  const composite = await sharp(Buffer.from(bgSvg))
    .composite([{ input: logoPng, gravity: "center" }])
    .png()
    .toBuffer();
  await fs.writeFile(path.join(OUT_DIR, outName), composite);
  console.log(`  ✓ ${outName}`);
}

console.log("ロゴプレビュー生成中...");

// 横並び・白版（amberヘッダー想定）。背景: 600x150、ロゴ幅: 480
await renderOnAmber(
  path.join(PUBLIC, "logo-horizontal-white.svg"),
  "logo-preview-horizontal-on-amber.png",
  600,
  150,
  480
);

// 横並び・通常版（白背景）
await renderOnWhite(
  path.join(PUBLIC, "logo-horizontal.svg"),
  "logo-preview-horizontal-on-white.png",
  600,
  150,
  480
);

// マークのみ（白背景）
await renderOnWhite(
  path.join(PUBLIC, "logo-mark.svg"),
  "logo-preview-mark.png",
  300,
  300,
  220
);

// マーク白版（amber背景）
await renderOnAmber(
  path.join(PUBLIC, "logo-mark-white.svg"),
  "logo-preview-mark-white-on-amber.png",
  300,
  300,
  220
);

// 縦並び（白背景）
await renderOnWhite(
  path.join(PUBLIC, "logo-stacked.svg"),
  "logo-preview-stacked.png",
  400,
  500,
  280
);

// 縦並び・スプラッシュ用（amber背景・白ロゴ）。SodateluLogo の variant="white" layout="stacked" 想定
// SVG単体ファイルは用意していないが、login画面のスプラッシュ表示と同等のプレビューとして
// horizontal-white を流用しつつ stacked のフレームに乗せる近似プレビューを作成
// （厳密版は実機スクショを別途撮ってもらう）

// ホーム画面のヘッダーモック（ヘッダー高さ約120px、左にロゴ、右にアイコンスペース）
{
  const w = 390; // iPhone 16 Pro 幅
  const h = 140;
  const bgSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#FBBF24"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <!-- 右上アイコン2個のダミー（円） -->
      <circle cx="${w - 50}" cy="${h / 2 + 12}" r="14" fill="rgba(255,255,255,0.15)"/>
      <circle cx="${w - 16}" cy="${h / 2 + 12}" r="14" fill="rgba(255,255,255,0.15)"/>
    </svg>
  `;
  const logoPng = await sharp(
    await fs.readFile(path.join(PUBLIC, "logo-horizontal-white.svg"))
  )
    .resize({ height: 32 })
    .png()
    .toBuffer();
  const out = await sharp(Buffer.from(bgSvg))
    .composite([{ input: logoPng, top: h / 2 + 0, left: 20 }])
    .png()
    .toBuffer();
  await fs.writeFile(
    path.join(OUT_DIR, "01-home-header-with-logo.png"),
    out
  );
  console.log("  ✓ 01-home-header-with-logo.png");
}

console.log("\n完了:", OUT_DIR);
