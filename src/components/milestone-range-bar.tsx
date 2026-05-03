"use client";

// めやす範囲バー
//
// 役割: マイルストーンの「めやす範囲」を視覚的に表示する。
//   - 横軸: 0〜144ヶ月（12年）
//   - 範囲: age_hint から取り出した下限〜上限を中央でハイライト
//   - 縦線: 子どもの現在月齢（淡く表示）
//
// 設計鉄則（docs/product-vision.md ver.2）:
//   - 「早い・遅い・標準・平均」のNGワード絶対禁止
//   - 範囲外でもアラートやエラー色を使わない
//   - 範囲はハードな縁取りではなく、ふんわりしたハイライトで表現する
//
// 色設計（既存テーマと整合）:
//   - 範囲ハイライト: amber-200/40（うっすら）
//   - 子ども位置の縦線: slate-400（控えめ）
//   - 軸ラベル: slate-400 の text-[12px]

import { MAX_SCOPE_MONTHS, formatMonthsAsAge, type AgeRange } from "@/lib/age-range";

type Props = {
  /** めやす範囲（age_hint から parseAgeHint で取得） */
  range: AgeRange;
  /** 子どもの現在月齢（不要なら省略可） */
  currentMonths?: number;
  /** 軸の上限（デフォルト 144ヶ月 = 12年） */
  maxMonths?: number;
};

export default function MilestoneRangeBar({
  range,
  currentMonths,
  maxMonths = MAX_SCOPE_MONTHS,
}: Props) {
  // 各値を「全幅に対する％」に変換する
  const toPercent = (months: number): number => {
    const clamped = Math.max(0, Math.min(maxMonths, months));
    return (clamped / maxMonths) * 100;
  };

  const lowerPct = toPercent(range.lowerMonths);
  const upperPct = toPercent(range.upperMonths);
  // 範囲が単一値の場合、最小幅を確保（描画が消えないため）
  const widthPct = Math.max(upperPct - lowerPct, 1.5);

  const currentPct =
    typeof currentMonths === "number" ? toPercent(currentMonths) : null;

  // 軸ラベル: 0歳 / 3歳 / 6歳 / 9歳 / 12歳 の5点
  const axisTicks = [
    { months: 0, label: "0歳" },
    { months: 36, label: "3歳" },
    { months: 72, label: "6歳" },
    { months: 108, label: "9歳" },
    { months: 144, label: "12歳" },
  ];

  return (
    <div className="w-full">
      {/* バー本体 */}
      <div className="relative h-6 w-full rounded-full bg-slate-100">
        {/* めやす範囲のハイライト */}
        <div
          className="absolute top-0 h-full rounded-full bg-amber-200/70"
          style={{ left: `${lowerPct}%`, width: `${widthPct}%` }}
          aria-label="めやす範囲"
        />

        {/* 子どもの現在月齢を示す縦線（控えめに） */}
        {currentPct !== null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-slate-400"
            style={{ left: `${currentPct}%` }}
            aria-label="お子さまの現在月齢"
          />
        )}
      </div>

      {/* 軸ラベル */}
      <div className="relative mt-1 h-3 w-full">
        {axisTicks.map((tick) => {
          const pct = toPercent(tick.months);
          return (
            <span
              key={tick.months}
              className="absolute text-[12px] text-slate-400"
              style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
            >
              {tick.label}
            </span>
          );
        })}
      </div>

      {/* 範囲の文字説明 */}
      <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
        {range.lowerMonths === range.upperMonths ? (
          <>
            <span className="font-bold text-amber-700">
              {formatMonthsAsAge(range.midMonths)}
            </span>
            <span>ごろを目安にしている子が多いです</span>
          </>
        ) : (
          <>
            <span className="font-bold text-amber-700">
              {formatMonthsAsAge(range.lowerMonths)}〜
              {formatMonthsAsAge(range.upperMonths)}
            </span>
            <span>ごろになると、多くの子がこの記録を残しています</span>
          </>
        )}
      </p>
    </div>
  );
}
