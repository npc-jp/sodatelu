// sodatelu ロゴ・インラインSVG コンポーネント
// - 横並び（マーク+テキスト）と縦並び（スタック）を切替可能
// - amber上で使う「白版」と通常背景上で使う「カラー版」を variant で切替
// - <img> 経由ではなくインライン SVG にすることで currentColor 制御や hi-DPI 表示を確実にする

import type { ReactElement } from "react";

type Variant = "default" | "white";
type Layout = "horizontal" | "stacked" | "mark";

type Props = {
  /** ロゴのバリアント。amber背景上では "white" を使う */
  variant?: Variant;
  /** レイアウト: horizontal=マーク+テキスト、stacked=マーク上下にテキスト、mark=マークのみ */
  layout?: Layout;
  /** 高さ（CSSピクセル）。横並びは 32〜40 推奨、縦並びは 80〜120 推奨 */
  height?: number;
  /** 追加クラス */
  className?: string;
  /** スクリーンリーダー用ラベル。装飾用なら "" を渡す */
  ariaLabel?: string;
};

// 芽のSVG断片（共通利用）
function Sprout({ color }: { color: string }): ReactElement {
  return (
    <>
      {/* 茎 */}
      <path
        d="M256 360 L256 250"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      {/* 左の葉 */}
      <path
        d="M256 270 C 256 230, 220 200, 170 200 C 170 240, 210 270, 256 270 Z"
        fill={color}
      />
      {/* 右の葉 */}
      <path
        d="M256 270 C 256 230, 292 200, 342 200 C 342 240, 302 270, 256 270 Z"
        fill={color}
      />
    </>
  );
}

export default function SodateluLogo({
  variant = "default",
  layout = "horizontal",
  height,
  className,
  ariaLabel = "sodatelu",
}: Props): ReactElement {
  const isWhite = variant === "white";
  // 白版: 円=白塗り / 芽=amber / テキスト=白
  // 通常: 円=amber / 芽=白 / テキスト=slate-800
  const circleFill = isWhite ? "#ffffff" : "#F59E0B";
  const sproutColor = isWhite ? "#F59E0B" : "#ffffff";
  const sproutCenterFill = isWhite ? "#ffffff" : "#F59E0B";
  const textFill = isWhite ? "#ffffff" : "#1E293B";

  // 共通フォント
  const fontFamily =
    "'DM Sans', 'Geist', 'Inter', system-ui, -apple-system, sans-serif";

  if (layout === "mark") {
    const h = height ?? 40;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 120"
        width={h}
        height={h}
        role="img"
        aria-label={ariaLabel || undefined}
        aria-hidden={ariaLabel === "" ? true : undefined}
        className={className}
      >
        <circle cx="60" cy="60" r="45" fill={circleFill} />
        <g transform="translate(15,15) scale(0.1758)">
          <Sprout color={sproutColor} />
          <circle cx="256" cy="270" r="8" fill={sproutCenterFill} />
        </g>
      </svg>
    );
  }

  if (layout === "stacked") {
    const h = height ?? 100;
    // viewBox 240x320, アスペクト比 0.75
    const w = h * 0.75;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 240 320"
        width={w}
        height={h}
        role="img"
        aria-label={ariaLabel || undefined}
        aria-hidden={ariaLabel === "" ? true : undefined}
        className={className}
      >
        <circle cx="120" cy="110" r="90" fill={circleFill} />
        <g transform="translate(30,20) scale(0.3516)">
          <Sprout color={sproutColor} />
          <circle cx="256" cy="270" r="8" fill={sproutCenterFill} />
        </g>
        <text
          x="120"
          y="270"
          textAnchor="middle"
          dominantBaseline="auto"
          fill={textFill}
          fontFamily={fontFamily}
          fontSize="42"
          fontWeight="600"
          letterSpacing="-0.5"
        >
          sodatelu
        </text>
      </svg>
    );
  }

  // horizontal（デフォルト）
  const h = height ?? 32;
  // viewBox 480x120, アスペクト比 4
  const w = h * 4;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 480 120"
      width={w}
      height={h}
      role="img"
      aria-label={ariaLabel || undefined}
      aria-hidden={ariaLabel === "" ? true : undefined}
      className={className}
    >
      <circle cx="60" cy="60" r="45" fill={circleFill} />
      <g transform="translate(15,15) scale(0.1758)">
        <Sprout color={sproutColor} />
        <circle cx="256" cy="270" r="8" fill={sproutCenterFill} />
      </g>
      <text
        x="126"
        y="72"
        textAnchor="start"
        dominantBaseline="auto"
        fill={textFill}
        fontFamily={fontFamily}
        fontSize="46"
        fontWeight="600"
        letterSpacing="-0.5"
      >
        sodatelu
      </text>
    </svg>
  );
}
