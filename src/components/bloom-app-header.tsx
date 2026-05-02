"use client";

// Bloom 共通ヘッダー
// - 横並び: 戻る矢印 / タイトル + サブタイトル / 右ステッカー
// - 太線下線 + 任意背景色（クリーム/yellow/accent等）
// - showLogo モード: 左に Sprout + sodatelu ロゴ（ホーム画面用）
// リファレンス: dir-bloom-extra.jsx の _Header / _Header2

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Sprout } from "@/components/illustrations";

type Props = {
  /** ロゴ表示モード（ホーム画面用）。trueなら title 等は無視されロゴ + Sprout を表示 */
  showLogo?: boolean;
  /** 見出し（Yusei Magic 20px） */
  title?: string;
  /** サブ（Zen Kaku 11px、ink-soft） */
  subtitle?: string;
  /** 戻るボタンを表示 */
  showBack?: boolean;
  /** 戻るボタン押下時。未指定なら router.back() */
  onBack?: () => void;
  /** ヘッダー右側のステッカー / アイコンボタン群 */
  rightSlot?: ReactNode;
  /** ヘッダー背景色（YAMLとは違い CSS variable も可） */
  bgColor?: string;
  /** ヘッダーのテキスト色（accent ヘッダーなど） */
  textColor?: string;
  /** ヘッダー下部に追加コンテンツ（子ども切替タブ等） */
  children?: ReactNode;
};

/**
 * Bloom 画面ヘッダー
 *
 * 用例:
 *   <BloomAppHeader showLogo rightSlot={<button>...</button>} />
 *   <BloomAppHeader title="きろくする" showBack bgColor="var(--bloom-yellow)" />
 *   <BloomAppHeader title="プレミアム" showBack bgColor="var(--bloom-accent)" textColor="#fff" />
 */
export default function BloomAppHeader({
  showLogo = false,
  title,
  subtitle,
  showBack = false,
  onBack,
  rightSlot,
  bgColor = "var(--bloom-bg)",
  textColor = "var(--bloom-ink)",
  children,
}: Props) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <header
      className="px-[18px] py-3.5"
      style={{
        background: bgColor,
        borderBottom: "2px solid var(--bloom-line)",
      }}
    >
      <div className="flex items-center gap-2.5">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="font-hand shrink-0"
            style={{ fontSize: 20, color: textColor }}
            aria-label="戻る"
          >
            ←
          </button>
        )}
        {showLogo ? (
          <div className="flex items-center gap-2">
            <Sprout size={22} color="var(--bloom-primary)" />
            <span
              className="font-hand"
              style={{ fontSize: 19, color: textColor, letterSpacing: "0.02em" }}
            >
              sodatelu
            </span>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            {title && (
              <h1
                className="font-hand truncate"
                style={{ fontSize: 20, color: textColor, lineHeight: 1.1 }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                className="mt-0.5 truncate text-[11px]"
                style={{
                  color: textColor === "var(--bloom-ink)" ? "var(--bloom-ink-soft)" : textColor,
                  opacity: textColor === "var(--bloom-ink)" ? 1 : 0.9,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
        {rightSlot && <div className="ml-auto flex items-center gap-2">{rightSlot}</div>}
      </div>
      {children}
    </header>
  );
}
