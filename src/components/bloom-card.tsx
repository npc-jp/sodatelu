"use client";

// Bloom 共通カードコンポーネント
// - 太線アウトライン (2px solid #2E2A22) + Hard shadow (3x3 or 2x2)
// - 角丸18px、ぼかしなしの影で「手書きノート」感を出す
// - リファレンス: design_handoff_bloom/dir-bloom*.jsx の BloomCard / _Card / _Card2

import type { CSSProperties, ReactNode } from "react";

type Props = {
  /** カード背景色（CSS color or var）。省略時は白 */
  color?: string;
  /** true なら shadow を 2px、false なら 3px */
  soft?: boolean;
  /** 追加クラス（margin等のレイアウト用） */
  className?: string;
  /** インラインスタイル（背景画像・positionなどでどうしても必要な時のみ） */
  style?: CSSProperties;
  /** カード内コンテンツ */
  children?: ReactNode;
};

/**
 * Bloom カード
 *
 * 用例:
 *   <BloomCard className="p-4">...</BloomCard>
 *   <BloomCard color="var(--bloom-primary)" className="p-4 text-white">...</BloomCard>
 *   <BloomCard soft className="p-3">小カード</BloomCard>
 */
export default function BloomCard({
  color = "#fff",
  soft = false,
  className = "",
  style,
  children,
}: Props) {
  return (
    <div
      className={`bloom-border rounded-[18px] ${soft ? "bloom-shadow-soft" : "bloom-shadow"} ${className}`}
      style={{ background: color, ...style }}
    >
      {children}
    </div>
  );
}
