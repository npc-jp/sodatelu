"use client";

// Bloom フローティングアクションボタン
// - 54x54 円、accent オレンジ、太線、hard shadow、白の「+」
// - ボトムナビの上 (bottom: 100px, right: 20px)
// リファレンス: dir-bloom.jsx の BloomHome 末尾の Floating + button

import type { MouseEventHandler } from "react";

type Props = {
  /** クリック時のハンドラ */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** カスタムラベル（aria-label）。デフォルト「きろくする」 */
  ariaLabel?: string;
  /** 表示する文字。デフォルト「+」 */
  children?: React.ReactNode;
  /** 色のバリアント。デフォルト accent。 primary に変えたい場面用 */
  color?: string;
};

export default function BloomFab({
  onClick,
  ariaLabel = "きろくする",
  children = "+",
  color = "var(--bloom-accent)",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bloom-border bloom-shadow font-hand fixed flex h-[54px] w-[54px] items-center justify-center rounded-full text-white"
      style={{
        background: color,
        fontSize: 26,
        bottom: 100,
        // ワイドビューでは max-w-md コンテナの右下に表示するため、
        // 50vw から max-w-md の半分 (224px) を引いて 20px 内側に置く
        right: "max(20px, calc(50vw - 204px))",
        zIndex: 5,
      }}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
