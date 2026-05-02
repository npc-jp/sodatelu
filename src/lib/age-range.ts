// 月齢範囲ユーティリティ
//
// マイルストーンの age_hint 文字列（例: "生後3〜4ヶ月", "18〜24ヶ月", "3〜5歳", "12歳", "生後365日"）
// を解析し、月齢の下限・上限を取り出す。
// この値は「めやす範囲バー」の横軸描画に使う。
//
// 設計鉄則（docs/product-vision.md ver.2）:
//   - アプリは観察者であって医者ではない
//   - 「早い・遅い・標準・平均」のNGワードは使わない
//   - 「めやす」「個人差がある」「お子さまのペース」を中心言語にする
//
// この lib は数値の抽出に専念し、表示の言葉づかいは UI 側で担う。

/**
 * 月齢ベースの「めやす範囲」。すべて生後の累計月数で表現する。
 * - lowerMonths: 下限（含む）
 * - upperMonths: 上限（含む）
 * - midMonths: 中央値（参考表示用）
 */
export type AgeRange = {
  lowerMonths: number;
  upperMonths: number;
  midMonths: number;
};

/**
 * sodateluのスコープ最大月齢（12歳 = 144ヶ月）
 * バーの最大目盛りに使う。これより先は描画しない。
 */
export const MAX_SCOPE_MONTHS = 12 * 12;

/**
 * age_hint 文字列を解析して AgeRange を返す。
 * パース不可の場合は null を返す（UI 側で範囲バー非表示にできる）。
 *
 * 対応パターン:
 *   "生後4〜8週"          → 約1〜2ヶ月
 *   "生後3〜4ヶ月"        → 3〜4ヶ月
 *   "生後5〜6ヶ月"        → 5〜6ヶ月
 *   "生後10〜14ヶ月"      → 10〜14ヶ月
 *   "18〜24ヶ月"          → 18〜24ヶ月
 *   "2〜3歳"              → 24〜36ヶ月
 *   "3〜4歳"              → 36〜48ヶ月
 *   "5〜7歳"              → 60〜84ヶ月
 *   "12歳"                → 144〜144ヶ月（単一値）
 *   "生後365日"           → 約12ヶ月（単一値）
 *   "生後2年"             → 24ヶ月（単一値）
 *   "生後3年"             → 36ヶ月（単一値）
 */
export function parseAgeHint(ageHint: string): AgeRange | null {
  if (!ageHint) return null;

  // 全角チルダ・波ダッシュ・ハイフンを正規化
  const normalized = ageHint
    .replace(/〜/g, "~")
    .replace(/～/g, "~")
    .replace(/ー/g, "~")
    .replace(/-/g, "~")
    .trim();

  // パターン1: "生後N〜Mヶ月" / "N〜Mヶ月"
  const monthRange = normalized.match(/(?:生後)?(\d+)\s*~\s*(\d+)\s*ヶ月/);
  if (monthRange) {
    const lower = parseInt(monthRange[1], 10);
    const upper = parseInt(monthRange[2], 10);
    return makeRange(lower, upper);
  }

  // パターン2: "生後N〜M週" → 週数を月数に換算（1ヶ月 ≒ 4.345週）
  const weekRange = normalized.match(/(?:生後)?(\d+)\s*~\s*(\d+)\s*週/);
  if (weekRange) {
    const lowerWeeks = parseInt(weekRange[1], 10);
    const upperWeeks = parseInt(weekRange[2], 10);
    const lowerMonths = Math.round((lowerWeeks / 4.345) * 10) / 10;
    const upperMonths = Math.round((upperWeeks / 4.345) * 10) / 10;
    return makeRange(lowerMonths, upperMonths);
  }

  // パターン3: "N〜M歳"
  const yearRange = normalized.match(/(\d+)\s*~\s*(\d+)\s*歳/);
  if (yearRange) {
    const lower = parseInt(yearRange[1], 10) * 12;
    const upper = parseInt(yearRange[2], 10) * 12;
    return makeRange(lower, upper);
  }

  // パターン4: "N歳"（単一年齢）
  const singleYear = normalized.match(/^(\d+)\s*歳$/);
  if (singleYear) {
    const months = parseInt(singleYear[1], 10) * 12;
    return makeRange(months, months);
  }

  // パターン5: "生後N日"
  const dayMatch = normalized.match(/生後(\d+)\s*日/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    const months = Math.round((days / 30.44) * 10) / 10;
    return makeRange(months, months);
  }

  // パターン6: "生後N年"
  const yearOnly = normalized.match(/生後(\d+)\s*年/);
  if (yearOnly) {
    const months = parseInt(yearOnly[1], 10) * 12;
    return makeRange(months, months);
  }

  return null;
}

function makeRange(lower: number, upper: number): AgeRange {
  // 念のため上下を整える
  const lo = Math.min(lower, upper);
  const hi = Math.max(lower, upper);
  return {
    lowerMonths: lo,
    upperMonths: hi,
    midMonths: (lo + hi) / 2,
  };
}

/**
 * 生年月日と現在日時から、子どもの現在の月齢を返す（小数1位）。
 * 0未満は0に丸める（生まれる前のケース）。
 */
export function calcCurrentMonths(birthDate: Date, now: Date = new Date()): number {
  const diffMs = now.getTime() - birthDate.getTime();
  const months = diffMs / (30.44 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.round(months * 10) / 10);
}

/**
 * 月齢を「○歳○ヶ月」形式の表示文字列に整形する。
 * 0〜11ヶ月は「Nヶ月」、12ヶ月以降は「N歳Mヶ月」。
 */
export function formatMonthsAsAge(months: number): string {
  const m = Math.max(0, Math.round(months));
  if (m < 12) return `${m}ヶ月`;
  const y = Math.floor(m / 12);
  const rem = m % 12;
  return rem > 0 ? `${y}歳${rem}ヶ月` : `${y}歳`;
}
