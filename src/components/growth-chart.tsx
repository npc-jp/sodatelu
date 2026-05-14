"use client";

// 成長曲線グラフ — Bloom デザイン適用（成長機能 Phase 2 / P2-T04〜P2-T06）
//
// 仕様書: docs/growth-feature-spec-v1-2026-05-14.md A-4
//
// 表示要素:
//   - パーセンタイル帯（3/10/50/90/97%）→ その子の性別側のみ塗り
//   - 中央値ライン（50%）→ 男児=青実線 + 女児=赤実線 を両方重ねて表示
//   - 子供の計測点（その子の性別色でプロット＋線で結ぶ）
//   - 現在月齢ガイド線（縦の点線）
//   - 凡例（グラフ下部）
//   - 出典クレジット
//
// 設計方針:
//   - 外部チャートライブラリなし。手書きSVG (viewBox + preserveAspectRatio)
//   - レスポンシブ: SVG自体は固定アスペクト比、コンテナ幅に合わせて伸縮
//   - ツールチップ: タップした計測点の日付・値・性別中央値との比較を表示
//
// props:
//   - childName: 計測点凡例で「○○ちゃんの計測値」と表示
//   - gender: その子の性別。「じぶんらしく」は男児側として描画（暫定）
//   - birthDate: 計測点のX座標決定用
//   - measurements: 表示する計測データ（measured_date 降順想定）
//   - metric: 'height' | 'weight' 切替（親が制御）

import { useEffect, useMemo, useRef, useState } from "react";
import type { Timestamp } from "firebase/firestore";
import type { Measurement } from "@/lib/firestore";
import {
  generatePercentileSeries,
  getBothMedians,
  getMonthlyPercentiles,
  isGrowthDataLoaded,
  loadGrowthData,
  normalizeGender,
  type Gender,
  type GenderForChart,
  type Metric,
} from "@/lib/growth-percentile";

type Props = {
  childName: string;
  gender: Gender;
  birthDate: Timestamp;
  measurements: (Measurement & { id: string })[];
  metric: Metric;
};

// SVG viewBox の寸法（横長16:9）
const VIEW_W = 800;
const VIEW_H = 480;
const MARGIN = { top: 20, right: 20, bottom: 56, left: 56 };
const PLOT_W = VIEW_W - MARGIN.left - MARGIN.right;
const PLOT_H = VIEW_H - MARGIN.top - MARGIN.bottom;

// 月齢の刻み（描画用）。1=全月齢の塗りつぶしが滑らかになる
const STEP_MONTHS = 1;

export default function GrowthChart({
  childName,
  gender,
  birthDate,
  measurements,
  metric,
}: Props) {
  // データロード状態
  const [dataReady, setDataReady] = useState(isGrowthDataLoaded());
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (dataReady) return;
    let mounted = true;
    loadGrowthData()
      .then(() => {
        if (mounted) setDataReady(true);
      })
      .catch((err) => {
        if (mounted) setLoadError(err?.message ?? "成長曲線データの読込に失敗しました");
      });
    return () => {
      mounted = false;
    };
  }, [dataReady]);

  // その子の性別（chart 用）
  const childChartGender: GenderForChart = useMemo(
    () => normalizeGender(gender, "male"),
    [gender]
  );

  // 計測点（measured_date 昇順に並べる）
  const sortedMeasurements = useMemo(() => {
    const filtered = measurements.filter((m) =>
      metric === "height" ? m.height_cm != null : m.weight_kg != null
    );
    return [...filtered].sort(
      (a, b) => a.measured_date.seconds - b.measured_date.seconds
    );
  }, [measurements, metric]);

  // 現在月齢
  const currentAgeMonths = useMemo(
    () => calcAgeMonths(birthDate.toDate(), new Date()),
    [birthDate]
  );

  // 表示範囲の決定
  // X軸: 0 〜 子供の現在月齢 + 24ヶ月（ただし最大 204ヶ月 = 17歳）
  // 計測点がX軸最大値を超える場合はそこまで広げる
  const xMax = useMemo(() => {
    const measMax =
      sortedMeasurements.length > 0
        ? calcAgeMonths(
            birthDate.toDate(),
            sortedMeasurements[sortedMeasurements.length - 1].measured_date.toDate()
          )
        : 0;
    const wanted = Math.max(currentAgeMonths + 24, measMax + 6, 36); // 最低36ヶ月分は見せる
    return Math.min(204, Math.max(12, wanted));
  }, [currentAgeMonths, sortedMeasurements, birthDate]);

  const xMin = 0;

  // パーセンタイル系列（その子の性別側）
  const percentileSeries = useMemo(() => {
    if (!dataReady) return [];
    return generatePercentileSeries(
      childChartGender,
      metric,
      xMin,
      xMax,
      STEP_MONTHS
    );
  }, [dataReady, childChartGender, metric, xMin, xMax]);

  // 男女両方の中央値系列（重ね表示用）
  const bothMedianSeries = useMemo(() => {
    if (!dataReady) return [];
    const out: { ageMonths: number; male: number; female: number }[] = [];
    for (let m = xMin; m <= xMax; m += STEP_MONTHS) {
      const both = getBothMedians(m, metric);
      if (both.male != null && both.female != null) {
        out.push({ ageMonths: m, male: both.male, female: both.female });
      }
    }
    return out;
  }, [dataReady, metric, xMin, xMax]);

  // Y軸の最小・最大（パーセンタイル帯 + 計測値を含めるよう自動決定）
  const { yMin, yMax } = useMemo(() => {
    if (percentileSeries.length === 0) {
      return { yMin: 0, yMax: 100 };
    }
    let lo = Infinity;
    let hi = -Infinity;
    percentileSeries.forEach((p) => {
      lo = Math.min(lo, p.p3);
      hi = Math.max(hi, p.p97);
    });
    // 計測値も含める
    sortedMeasurements.forEach((m) => {
      const v = metric === "height" ? m.height_cm : m.weight_kg;
      if (v != null) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    });
    const padding = (hi - lo) * 0.08;
    return {
      yMin: Math.max(0, lo - padding),
      yMax: hi + padding,
    };
  }, [percentileSeries, sortedMeasurements, metric]);

  // 月齢 → X座標
  function xScale(ageMonths: number) {
    return MARGIN.left + ((ageMonths - xMin) / (xMax - xMin)) * PLOT_W;
  }

  // 値 → Y座標（上下反転）
  function yScale(value: number) {
    return (
      MARGIN.top + PLOT_H - ((value - yMin) / (yMax - yMin)) * PLOT_H
    );
  }

  // パーセンタイル帯の polygon point文字列を生成
  // (p3〜p10 / p10〜p50 / p50〜p90 / p90〜p97 の4帯)
  function buildBandPath(lower: keyof Omit<typeof percentileSeries[number], "ageMonths">, upper: keyof Omit<typeof percentileSeries[number], "ageMonths">) {
    if (percentileSeries.length === 0) return "";
    const top = percentileSeries
      .map((p) => `${xScale(p.ageMonths)},${yScale(p[upper] as number)}`)
      .join(" ");
    const bottom = [...percentileSeries]
      .reverse()
      .map((p) => `${xScale(p.ageMonths)},${yScale(p[lower] as number)}`)
      .join(" ");
    return `${top} ${bottom}`;
  }

  // ライン用 polyline points
  function buildLinePoints(
    series: { ageMonths: number; [k: string]: number }[],
    key: string
  ) {
    return series
      .map((p) => `${xScale(p.ageMonths)},${yScale(p[key])}`)
      .join(" ");
  }

  // === 色設定 ===
  // パーセンタイル帯は性別問わず Bloom グリーン系で統一（Azuフィードバック 2026-05-14）
  // → 「アプリのトーンの一部」として見え、男女中央値ライン（青・赤）と色が被らない
  const bandOuter = "rgba(123, 168, 95, 0.15)"; // bloom-primary #7BA85F 15%
  const bandInner = "rgba(123, 168, 95, 0.32)"; // bloom-primary #7BA85F 32%

  // 計測点折れ線（その子の性別色は維持）
  const isMaleChild = childChartGender === "male";
  const measureStroke = isMaleChild
    ? "var(--bloom-blue-accent)"
    : "var(--bloom-accent)";

  // X軸ラベル位置（モバイル幅では間引き）
  const xTicks = useMemo(() => buildXTicks(xMax), [xMax]);
  const yTicks = useMemo(() => buildYTicks(yMin, yMax), [yMin, yMax]);

  // === ツールチップ state ===
  const [hoverPoint, setHoverPoint] = useState<
    | {
        ageMonths: number;
        value: number;
        date: Date;
      }
    | null
  >(null);

  // SVGコンテナの DOM ref（タップ判定で領域外閉じに使う）
  const svgWrapRef = useRef<HTMLDivElement | null>(null);

  // SVG 外のタップで閉じる
  useEffect(() => {
    if (!hoverPoint) return;
    function onDocClick(e: Event) {
      if (!svgWrapRef.current) return;
      if (!svgWrapRef.current.contains(e.target as Node)) {
        setHoverPoint(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, [hoverPoint]);

  if (loadError) {
    return (
      <div
        className="rounded-[18px] p-4 text-center"
        style={{
          background: "#fff",
          border: "2px solid var(--bloom-line-soft)",
        }}
      >
        <p className="text-[0.8125rem]" style={{ color: "var(--bloom-ink-soft)" }}>
          グラフデータの読み込みに失敗しました。
          <br />
          ネット接続を確認のうえ、ページを再読み込みしてください。
        </p>
      </div>
    );
  }

  if (!dataReady) {
    return (
      <div
        className="flex h-[260px] items-center justify-center rounded-[18px]"
        style={{
          background: "#fff",
          border: "2px solid var(--bloom-line-soft)",
        }}
      >
        <p
          className="font-hand text-[0.8125rem]"
          style={{ color: "var(--bloom-ink-soft)" }}
        >
          グラフデータを読み込み中…
        </p>
      </div>
    );
  }

  const metricLabel = metric === "height" ? "身長 (cm)" : "体重 (kg)";

  // ホバー時の比較情報
  const hoverCompare = hoverPoint
    ? getMonthlyPercentiles(hoverPoint.ageMonths, childChartGender, metric)
    : null;

  return (
    <div ref={svgWrapRef} style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`${childName}の${metricLabel}成長曲線`}
      >
        {/* 背景 */}
        <rect
          x={0}
          y={0}
          width={VIEW_W}
          height={VIEW_H}
          fill="#FFFFFF"
          stroke="none"
        />

        {/* パーセンタイル帯（その子の性別側）*/}
        {/* 外帯 (3-10% / 90-97%) → bandOuter */}
        <polygon points={buildBandPath("p3", "p10")} fill={bandOuter} />
        <polygon points={buildBandPath("p90", "p97")} fill={bandOuter} />
        {/* 内帯 (10-50% / 50-90%) → bandInner */}
        <polygon points={buildBandPath("p10", "p50")} fill={bandInner} />
        <polygon points={buildBandPath("p50", "p90")} fill={bandInner} />

        {/* Y軸グリッド線 */}
        {yTicks.map((t) => (
          <line
            key={`y-${t}`}
            x1={MARGIN.left}
            x2={MARGIN.left + PLOT_W}
            y1={yScale(t)}
            y2={yScale(t)}
            stroke="var(--bloom-line-soft)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        ))}

        {/* X軸グリッド線 */}
        {xTicks.map((t) => (
          <line
            key={`x-${t}`}
            x1={xScale(t)}
            x2={xScale(t)}
            y1={MARGIN.top}
            y2={MARGIN.top + PLOT_H}
            stroke="var(--bloom-line-soft)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        ))}

        {/* 男女両方の中央値ライン（青実線 + 赤実線） */}
        <polyline
          points={buildLinePoints(bothMedianSeries, "male")}
          fill="none"
          stroke="var(--bloom-blue)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={buildLinePoints(bothMedianSeries, "female")}
          fill="none"
          stroke="var(--bloom-pink-deep)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 現在月齢ガイド線 */}
        {currentAgeMonths >= xMin && currentAgeMonths <= xMax && (
          <>
            <line
              x1={xScale(currentAgeMonths)}
              x2={xScale(currentAgeMonths)}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_H}
              stroke="var(--bloom-ink-soft)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
            />
            <text
              x={xScale(currentAgeMonths)}
              y={MARGIN.top - 4}
              textAnchor="middle"
              fontSize={11}
              fill="var(--bloom-ink-soft)"
              fontFamily="Yusei Magic, sans-serif"
            >
              いま
            </text>
          </>
        )}

        {/* 子供の計測点・折れ線 */}
        {sortedMeasurements.length > 0 && (
          <>
            {/* 線 */}
            <polyline
              points={sortedMeasurements
                .map((m) => {
                  const v = metric === "height" ? m.height_cm! : m.weight_kg!;
                  const ageM = calcAgeMonths(
                    birthDate.toDate(),
                    m.measured_date.toDate()
                  );
                  return `${xScale(ageM)},${yScale(v)}`;
                })
                .join(" ")}
              fill="none"
              stroke={measureStroke}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 点 */}
            {sortedMeasurements.map((m) => {
              const v = metric === "height" ? m.height_cm! : m.weight_kg!;
              const ageM = calcAgeMonths(
                birthDate.toDate(),
                m.measured_date.toDate()
              );
              return (
                <circle
                  key={m.id}
                  cx={xScale(ageM)}
                  cy={yScale(v)}
                  r={5}
                  fill="#FFFFFF"
                  stroke={measureStroke}
                  strokeWidth={2.2}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoverPoint({
                      ageMonths: ageM,
                      value: v,
                      date: m.measured_date.toDate(),
                    });
                  }}
                />
              );
            })}
          </>
        )}

        {/* 軸線（プロット範囲を囲む）*/}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={PLOT_W}
          height={PLOT_H}
          fill="none"
          stroke="var(--bloom-ink)"
          strokeWidth={1.5}
        />

        {/* X軸ラベル */}
        {xTicks.map((t) => (
          <text
            key={`x-label-${t}`}
            x={xScale(t)}
            y={MARGIN.top + PLOT_H + 16}
            textAnchor="middle"
            fontSize={11}
            fill="var(--bloom-ink)"
          >
            {formatAgeTick(t)}
          </text>
        ))}
        <text
          x={MARGIN.left + PLOT_W / 2}
          y={VIEW_H - 12}
          textAnchor="middle"
          fontSize={12}
          fill="var(--bloom-ink-soft)"
          fontFamily="Yusei Magic, sans-serif"
        >
          年齢
        </text>

        {/* Y軸ラベル */}
        {yTicks.map((t) => (
          <text
            key={`y-label-${t}`}
            x={MARGIN.left - 8}
            y={yScale(t) + 4}
            textAnchor="end"
            fontSize={11}
            fill="var(--bloom-ink)"
          >
            {t}
          </text>
        ))}
        <text
          x={14}
          y={MARGIN.top + PLOT_H / 2}
          textAnchor="middle"
          fontSize={12}
          fill="var(--bloom-ink-soft)"
          transform={`rotate(-90 14 ${MARGIN.top + PLOT_H / 2})`}
          fontFamily="Yusei Magic, sans-serif"
        >
          {metricLabel}
        </text>
      </svg>

      {/* ツールチップ（SVG外 absolute）*/}
      {hoverPoint && hoverCompare && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "#fff",
            border: "2px solid var(--bloom-ink)",
            borderRadius: 10,
            padding: "8px 10px",
            boxShadow: "2px 2px 0 var(--bloom-ink)",
            fontSize: "0.75rem",
            color: "var(--bloom-ink)",
            maxWidth: 200,
            lineHeight: 1.6,
          }}
        >
          <div className="font-hand" style={{ fontSize: "0.8125rem" }}>
            {formatJpDate(hoverPoint.date)}
          </div>
          <div style={{ marginTop: 2 }}>
            {childName || "この子"}: <strong>{hoverPoint.value}</strong>
            {metric === "height" ? " cm" : " kg"}
          </div>
          <div style={{ color: "var(--bloom-ink-soft)", marginTop: 4 }}>
            その月齢の中央値:
            <br />
            {hoverCompare.p50.toFixed(1)}
            {metric === "height" ? " cm" : " kg"}
          </div>
          <button
            type="button"
            onClick={() => setHoverPoint(null)}
            style={{
              marginTop: 6,
              fontSize: "0.6875rem",
              color: "var(--bloom-ink-soft)",
              textDecoration: "underline",
            }}
          >
            閉じる
          </button>
        </div>
      )}

      {/* 凡例（グラフ下部）*/}
      <ChartLegend childName={childName} childGender={childChartGender} />

      {/* 出典クレジット */}
      <p
        className="mt-2 text-[0.6875rem]"
        style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.55 }}
      >
        データ出典: こども家庭庁「令和5年（2023年）乳幼児身体発育調査」 ＋
        文部科学省「学校保健統計調査」
      </p>
    </div>
  );
}

// === 凡例コンポーネント ===
function ChartLegend({
  childName,
  childGender,
}: {
  childName: string;
  childGender: GenderForChart;
}) {
  const measureColor =
    childGender === "male"
      ? "var(--bloom-blue-accent)"
      : "var(--bloom-accent)";
  return (
    <div
      className="mt-2 flex flex-wrap gap-x-3 gap-y-1"
      style={{ fontSize: "0.6875rem", color: "var(--bloom-ink-soft)" }}
    >
      <LegendItem
        kind="line"
        color="var(--bloom-blue)"
        label="男児中央値 (50%)"
      />
      <LegendItem
        kind="line"
        color="var(--bloom-pink-deep)"
        label="女児中央値 (50%)"
      />
      <LegendItem
        kind="dot"
        color={measureColor}
        label={`${childName || "この子"}の計測値`}
      />
    </div>
  );
}

function LegendItem({
  kind,
  color,
  label,
}: {
  kind: "line" | "dot";
  color: string;
  label: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {kind === "line" ? (
        <span
          style={{
            display: "inline-block",
            width: 18,
            height: 0,
            borderTop: `2.5px solid ${color}`,
          }}
        />
      ) : (
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#fff",
            border: `2px solid ${color}`,
          }}
        />
      )}
      {label}
    </span>
  );
}

// === ユーティリティ ===

// 月齢を浮動小数で算出（日割り考慮）
function calcAgeMonths(birth: Date, target: Date): number {
  const ms = target.getTime() - birth.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return days / 30.4375; // 平均月日数
}

// X軸ラベルテキスト
function formatAgeTick(months: number): string {
  if (months === 0) return "0";
  if (months < 24) return `${months}m`;
  const years = Math.round(months / 12);
  return `${years}歳`;
}

// X軸の目盛り
function buildXTicks(xMax: number): number[] {
  // xMax に応じて適切な間隔を選ぶ
  if (xMax <= 24) {
    // 0〜24ヶ月 → 3ヶ月刻み
    return [0, 3, 6, 9, 12, 15, 18, 21, 24].filter((t) => t <= xMax);
  }
  if (xMax <= 48) {
    return [0, 6, 12, 18, 24, 30, 36, 42, 48].filter((t) => t <= xMax);
  }
  if (xMax <= 72) {
    return [0, 12, 24, 36, 48, 60, 72].filter((t) => t <= xMax);
  }
  if (xMax <= 144) {
    return [0, 12, 24, 36, 48, 60, 72, 96, 120, 144].filter((t) => t <= xMax);
  }
  return [0, 24, 48, 72, 96, 120, 144, 168, 192, 204].filter((t) => t <= xMax);
}

// Y軸の目盛り（自動間隔）
function buildYTicks(yMin: number, yMax: number): number[] {
  const range = yMax - yMin;
  let step = 10;
  if (range > 100) step = 20;
  else if (range > 50) step = 10;
  else if (range > 20) step = 5;
  else if (range > 10) step = 2;
  else step = 1;
  const start = Math.ceil(yMin / step) * step;
  const out: number[] = [];
  for (let v = start; v <= yMax; v += step) {
    out.push(v);
  }
  return out;
}

function formatJpDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
