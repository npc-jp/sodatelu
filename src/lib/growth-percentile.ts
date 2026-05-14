// 成長曲線パーセンタイル取得ユーティリティ（成長機能 Phase 2 / P2-T03）
//
// 仕様書: docs/growth-feature-spec-v1-2026-05-14.md A-4 / D-1 / D-2
//
// データソース:
//   - こども家庭庁 令和5年（2023年）乳幼児身体発育調査（0〜72ヶ月）
//   - 文部科学省 学校保健統計調査（72〜204ヶ月 = 6〜17歳）
//
// 設計:
//   - JSONはキー月齢のみ持つ。中間月齢は線形補間で算出。
//   - 6歳境界（72ヶ月）でCFA→MEXT を線形補間で接続。
//   - 男女両方の p50 を同時取得する API（getBothMedians）を別に提供して
//     グラフコンポーネントが「男女両中央値ライン」を簡単に描けるようにする。

type PercentilePoint = {
  ageMonths: number;
  p3: number;
  p10: number;
  p50: number;
  p90: number;
  p97: number;
};

type GenderData = {
  height: PercentilePoint[];
  weight: PercentilePoint[];
};

type GrowthDataset = {
  source: string;
  publishedDate: string;
  license: string;
  ageRange: { min: number; max: number };
  male: GenderData;
  female: GenderData;
};

export type Gender = "男の子" | "女の子" | "じぶんらしく";
export type GenderForChart = "male" | "female"; // 内部表現
export type Metric = "height" | "weight";
export type Percentiles = {
  p3: number;
  p10: number;
  p50: number;
  p90: number;
  p97: number;
};

// === キャッシュ ===
// dev / prod 両方で 1度 fetch したらクライアントメモリに保持。
let cfaCache: GrowthDataset | null = null;
let mextCache: GrowthDataset | null = null;
let loadingPromise: Promise<void> | null = null;

const CFA_URL = "/data/growth-percentiles-cfa2023.json";
const MEXT_URL = "/data/growth-percentiles-mext-school.json";

// 6歳境界（CFA → MEXT の切替点）
const BOUNDARY_MONTHS = 72;

// === データロード ===
// クライアントサイドのみ。並列ロード + キャッシュ。
export async function loadGrowthData(): Promise<void> {
  if (cfaCache && mextCache) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      const [cfaRes, mextRes] = await Promise.all([
        fetch(CFA_URL, { cache: "force-cache" }),
        fetch(MEXT_URL, { cache: "force-cache" }),
      ]);
      if (!cfaRes.ok || !mextRes.ok) {
        throw new Error(
          `成長曲線データの取得に失敗: CFA=${cfaRes.status} / MEXT=${mextRes.status}`
        );
      }
      cfaCache = (await cfaRes.json()) as GrowthDataset;
      mextCache = (await mextRes.json()) as GrowthDataset;
    } catch (err) {
      console.error("[growth-percentile] データロード失敗:", err);
      throw err;
    } finally {
      loadingPromise = null;
    }
  })();
  return loadingPromise;
}

// gender の正規化（「じぶんらしく」は male/female どちらかを引数で指定可能に）
export function normalizeGender(
  gender: Gender,
  fallback: GenderForChart = "male"
): GenderForChart {
  if (gender === "男の子") return "male";
  if (gender === "女の子") return "female";
  return fallback;
}

// === 配列から ageMonths を補間 ===
function interpolateAt(
  points: PercentilePoint[],
  ageMonths: number
): Percentiles | null {
  if (points.length === 0) return null;
  // 範囲外は端を返す（外挿はしない）
  if (ageMonths <= points[0].ageMonths) {
    const p = points[0];
    return { p3: p.p3, p10: p.p10, p50: p.p50, p90: p.p90, p97: p.p97 };
  }
  const last = points[points.length - 1];
  if (ageMonths >= last.ageMonths) {
    return {
      p3: last.p3,
      p10: last.p10,
      p50: last.p50,
      p90: last.p90,
      p97: last.p97,
    };
  }
  // 該当区間を探す
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a.ageMonths <= ageMonths && b.ageMonths >= ageMonths) {
      const t = (ageMonths - a.ageMonths) / (b.ageMonths - a.ageMonths);
      return {
        p3: lerp(a.p3, b.p3, t),
        p10: lerp(a.p10, b.p10, t),
        p50: lerp(a.p50, b.p50, t),
        p90: lerp(a.p90, b.p90, t),
        p97: lerp(a.p97, b.p97, t),
      };
    }
  }
  return null;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// === 6歳境界の接続（線形補間）===
// CFAデータの72ヶ月終点とMEXTデータの72ヶ月始点をブレンドする。
// CFA は p3 込みの正確値、MEXTは正規分布近似なので、境界±6ヶ月幅で滑らかに繋ぐ。
function blendBoundary(
  cfaPoint: Percentiles,
  mextPoint: Percentiles,
  weight: number
): Percentiles {
  // weight: 0 = CFA優先 / 1 = MEXT優先
  return {
    p3: lerp(cfaPoint.p3, mextPoint.p3, weight),
    p10: lerp(cfaPoint.p10, mextPoint.p10, weight),
    p50: lerp(cfaPoint.p50, mextPoint.p50, weight),
    p90: lerp(cfaPoint.p90, mextPoint.p90, weight),
    p97: lerp(cfaPoint.p97, mextPoint.p97, weight),
  };
}

// === 単一性別・単一メトリックのパーセンタイル取得 ===
// ageMonths: 0 〜 204
// 戻り値: { p3, p10, p50, p90, p97 } もしくは null（データなし）
export function getMonthlyPercentiles(
  ageMonths: number,
  gender: GenderForChart,
  metric: Metric
): Percentiles | null {
  if (!cfaCache || !mextCache) return null;

  const cfa = cfaCache[gender][metric];
  const mext = mextCache[gender][metric];

  // 72ヶ月未満: CFAのみ
  if (ageMonths < BOUNDARY_MONTHS - 6) {
    return interpolateAt(cfa, ageMonths);
  }
  // 78ヶ月超: MEXTのみ
  if (ageMonths > BOUNDARY_MONTHS + 6) {
    return interpolateAt(mext, ageMonths);
  }
  // 境界周辺（66〜78ヶ月）: 両者をブレンド
  const cfaP = interpolateAt(cfa, Math.min(ageMonths, BOUNDARY_MONTHS));
  const mextP = interpolateAt(mext, Math.max(ageMonths, BOUNDARY_MONTHS));
  if (!cfaP || !mextP) {
    return cfaP || mextP;
  }
  // 66ヶ月 → weight=0, 78ヶ月 → weight=1
  const weight = (ageMonths - (BOUNDARY_MONTHS - 6)) / 12;
  return blendBoundary(cfaP, mextP, Math.max(0, Math.min(1, weight)));
}

// === 全月齢×全パーセンタイル のサンプル列を生成 ===
// グラフ描画用に「月齢の刻み」を指定して一括取得する。
// step: 月齢の刻み（例 1 = 全月齢、3 = 3ヶ月ごと）
export function generatePercentileSeries(
  gender: GenderForChart,
  metric: Metric,
  minMonths: number,
  maxMonths: number,
  step: number
): Array<{ ageMonths: number } & Percentiles> {
  const out: Array<{ ageMonths: number } & Percentiles> = [];
  for (let m = minMonths; m <= maxMonths; m += step) {
    const p = getMonthlyPercentiles(m, gender, metric);
    if (p) {
      out.push({ ageMonths: m, ...p });
    }
  }
  return out;
}

// === 男女両方の p50 を取得 ===
// グラフで「男児中央値（青）+ 女児中央値（赤）」を重ね描きするための専用API
export function getBothMedians(
  ageMonths: number,
  metric: Metric
): { male: number | null; female: number | null } {
  const male = getMonthlyPercentiles(ageMonths, "male", metric);
  const female = getMonthlyPercentiles(ageMonths, "female", metric);
  return {
    male: male ? male.p50 : null,
    female: female ? female.p50 : null,
  };
}

// === 計測値のパーセンタイル位置を推定 ===
// 計測点ツールチップで「○○ちゃんは50パーセンタイル付近」を出すための補助。
// 戻り値: そのage/性別/メトリックでの推定パーセンタイル順位（3 / 10 / 50 / 90 / 97 のうち最近接）
export function estimatePercentileBand(
  value: number,
  ageMonths: number,
  gender: GenderForChart,
  metric: Metric
): "3未満" | "3〜10" | "10〜50" | "50〜90" | "90〜97" | "97超" | null {
  const p = getMonthlyPercentiles(ageMonths, gender, metric);
  if (!p) return null;
  if (value < p.p3) return "3未満";
  if (value < p.p10) return "3〜10";
  if (value < p.p50) return "10〜50";
  if (value < p.p90) return "50〜90";
  if (value < p.p97) return "90〜97";
  return "97超";
}

// === キャッシュ済みかチェック ===
// グラフコンポーネントが初期ローディング判定に使う
export function isGrowthDataLoaded(): boolean {
  return !!(cfaCache && mextCache);
}

// === データのageRange取得 ===
// グラフのX軸最大値の自動決定に使う
export function getGrowthDataAgeRange(): { min: number; max: number } {
  return { min: 0, max: 204 };
}
