// build-growth-percentiles-mext-school.mjs
// 文部科学省「学校保健統計調査」令和6年度（2024年度）公表確定値に基づいて
// 6〜17歳（72〜204ヶ月）の身長・体重パーセンタイル値（p3/p10/p50/p90/p97）を
// JSON化するスクリプト。
//
// データソース（公式PDF・2026-05-14 取得・突合済み）:
//   - 文部科学省 令和6年度学校保健統計（確定値）の公表について
//     https://www.mext.go.jp/content/20250213-mxt_chousa01-000040132_1.pdf
//     （令和7年2月12日公表 / 学校保健統計調査の結果）
//   - 学校保健統計調査ページ:
//     https://www.mext.go.jp/b_menu/toukei/chousa05/hoken/1268826.htm
//
// 著作権:
//   政府標準利用規約 第2.0版（商用利用可・出典明記必須）
//
// 算出方針:
//   文科省学校保健統計の公表PDF（調査結果のポイント）は「平均値」のみを掲載しており、
//   標準偏差（SD）は別途 e-Stat の統計表で提供されている。
//   本ファイルでは:
//     - 平均値（p50）: 令和6年度公表値（PDF 4ページ目）を直接転記
//     - SD: 令和5年度公表値ベース（年度間の変動は小さいため継続使用）
//     - p3 / p10 / p90 / p97: 正規分布近似で算出
//       p3  = mean - 1.881 * SD
//       p10 = mean - 1.282 * SD
//       p90 = mean + 1.282 * SD
//       p97 = mean + 1.881 * SD
//   この近似は LMS法に比べて精度は劣るが、CFA データとの境界
//   接続のための実用範囲として使用する。
//
// 既存版（令和5年度・〜2026-05-14）との主な差分:
//   - 男子: 12歳の身長 153.0→154.0 (+1.0cm)、13歳 160.3→161.1 (+0.8cm)、14歳 165.6→166.1 (+0.5cm)
//   - 女子: 体重・身長ともほぼ横ばい（±0.3 以内）
//   - 5歳枠は CFA データ（〜72ヶ月）に含まれるため本ファイル未掲載
//
// 出力: app/public/data/growth-percentiles-mext-school.json
//
// 実行: node scripts/build-growth-percentiles-mext-school.mjs

import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(
  __dirname,
  "../public/data/growth-percentiles-mext-school.json"
);

// 正規分布の Z値
const Z3 = -1.881; // p3
const Z10 = -1.282; // p10
const Z90 = 1.282; // p90
const Z97 = 1.881; // p97

// === 文科省「学校保健統計調査」令和6年度（2024年度）公表値 ===
// 平均値: 令和6年度 PDF（20250213-mxt_chousa01-000040132_1.pdf）4ページ目より直接転記
// 標準偏差: 令和5年度値を継続使用（年度間で大きな変動はないと判断）
// 年齢: 6 (満年齢) = 小1, ..., 17 = 高3
//
// 男児: [age, heightMean(R6), heightSD(R5), weightMean(R6), weightSD(R5)]
const MALE_DATA = [
  [6, 116.7, 4.92, 21.4, 3.46],
  [7, 122.6, 5.22, 24.2, 4.20],
  [8, 128.5, 5.40, 27.6, 5.04],
  [9, 134.0, 5.74, 31.2, 6.05],
  [10, 139.7, 6.22, 35.2, 7.04],
  [11, 146.0, 7.18, 39.6, 8.18],
  [12, 154.0, 8.18, 45.3, 9.32],
  [13, 161.1, 7.79, 50.5, 9.43],
  [14, 166.1, 6.84, 55.0, 9.31],
  [15, 168.6, 5.93, 59.0, 9.32],
  [16, 169.9, 5.83, 60.5, 9.49],
  [17, 170.8, 5.78, 62.2, 9.79],
];

// 女児: [age, heightMean(R6), heightSD(R5), weightMean(R6), weightSD(R5)]
const FEMALE_DATA = [
  [6, 115.8, 4.94, 21.0, 3.34],
  [7, 121.8, 5.27, 23.7, 3.94],
  [8, 127.7, 5.69, 26.9, 4.69],
  [9, 134.1, 6.34, 30.5, 5.59],
  [10, 141.1, 6.83, 35.0, 6.45],
  [11, 147.8, 6.55, 40.1, 7.27],
  [12, 152.3, 5.95, 44.4, 7.61],
  [13, 155.0, 5.51, 47.5, 7.46],
  [14, 156.4, 5.31, 49.6, 7.40],
  [15, 157.1, 5.34, 51.1, 7.66],
  [16, 157.7, 5.36, 52.0, 7.84],
  [17, 158.0, 5.39, 52.5, 7.93],
];

// === 月齢化 + パーセンタイル算出 ===
// age 歳 → ageMonths = age * 12
function toPercentiles(rows, kind /* 'height' | 'weight' */) {
  return rows.map(([age, hM, hSD, wM, wSD]) => {
    const mean = kind === "height" ? hM : wM;
    const sd = kind === "height" ? hSD : wSD;
    return {
      ageMonths: age * 12,
      p3: round(mean + Z3 * sd),
      p10: round(mean + Z10 * sd),
      p50: round(mean),
      p90: round(mean + Z90 * sd),
      p97: round(mean + Z97 * sd),
    };
  });
}

function round(v) {
  return Math.round(v * 100) / 100;
}

const json = {
  source: "文部科学省 学校保健統計調査（令和6年度・2024年度確定値）",
  publishedDate: "2025-02-13",
  license:
    "政府標準利用規約 第2.0版（出典明記・商用利用可・https://www.e-stat.go.jp/terms-of-use）",
  sourcePdfUrl:
    "https://www.mext.go.jp/content/20250213-mxt_chousa01-000040132_1.pdf",
  sourcePdfNote:
    "令和6年度学校保健統計（確定値）公表PDF（令和7年2月12日公表）4ページ目「身長・体重の平均値」を 2026-05-14 に直接転記。標準偏差は令和5年度値を継続使用（年度間変動は小さい）。",
  generatedAt: new Date().toISOString(),
  unit: { age: "months", height: "cm", weight: "kg" },
  ageRange: { min: 72, max: 204 },
  notes:
    "文科省学校保健統計は平均値・標準偏差のみ公表のため、正規分布近似 (Z=-1.881/-1.282/0/1.282/1.881) で p3/p10/p50/p90/p97 を算出。LMS法の代替であり目安。",
  male: {
    height: toPercentiles(MALE_DATA, "height"),
    weight: toPercentiles(MALE_DATA, "weight"),
  },
  female: {
    height: toPercentiles(FEMALE_DATA, "height"),
    weight: toPercentiles(FEMALE_DATA, "weight"),
  },
};

await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
await fs.writeFile(OUT_PATH, JSON.stringify(json, null, 2), "utf-8");

console.log(`✔ 生成完了: ${OUT_PATH}`);
console.log(
  `  - 男児: 身長 ${json.male.height.length} 点 / 体重 ${json.male.weight.length} 点`
);
console.log(
  `  - 女児: 身長 ${json.female.height.length} 点 / 体重 ${json.female.weight.length} 点`
);
