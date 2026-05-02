"use client";

// アプリ共通ヘッダー
// - amberグラデーション背景（from-amber-500 to-amber-400）統一
// - props で「ロゴ大表示モード（ホーム用）」「戻るボタン+タイトル モード（その他）」を切替
// - 既存の各画面ヘッダーは現状維持を許容（段階的に切替可）。新規利用箇所はこのコンポーネントを使う
//
// 利用例:
//   <AppHeader showLogo />                                                // ホーム
//   <AppHeader title="設定" showBack onBack={() => router.back()} />      // 設定など
//   <AppHeader title="さくらのこれまで" subtitle="おもいで" showBack onBack={...} />

import { useRouter } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import SodateluLogo from "./sodatelu-logo";

type Props = {
  /** ロゴ大表示モード（ホーム画面用）。trueなら title/showBack は無視される */
  showLogo?: boolean;
  /** 見出し */
  title?: string;
  /** サブタイトル（小さく表示） */
  subtitle?: string;
  /** サブタイトルの位置: "above"=タイトル上, "below"=タイトル下（デフォルト: above） */
  subtitlePosition?: "above" | "below";
  /** 戻るボタンを表示 */
  showBack?: boolean;
  /** 戻るボタン押下時。未指定なら router.back() */
  onBack?: () => void;
  /** ヘッダー右側のアクション（アイコンボタン等） */
  rightSlot?: ReactNode;
  /** ヘッダー下部に追加コンテンツ（子ども切替タブ・子どもカード等） */
  children?: ReactNode;
  /** ボトムパディング調整 */
  paddingBottomClass?: string;
};

export default function AppHeader({
  showLogo = false,
  title,
  subtitle,
  subtitlePosition = "above",
  showBack = false,
  onBack,
  rightSlot,
  children,
  paddingBottomClass = "pb-5",
}: Props): ReactElement {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <header
      className={`bg-gradient-to-b from-amber-500 to-amber-400 px-5 ${paddingBottomClass} pt-6`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="text-amber-100 hover:text-white"
              aria-label="戻る"
              type="button"
            >
              ←
            </button>
          )}
          {showLogo ? (
            // ホーム画面用: マーク+テキストの白版を左寄せで大きめ表示（高さ40px）
            <SodateluLogo
              variant="white"
              layout="horizontal"
              height={40}
              ariaLabel="sodatelu"
            />
          ) : (
            <div className="min-w-0">
              {subtitle && subtitlePosition === "above" && (
                <p className="text-xs text-amber-100">{subtitle}</p>
              )}
              {title && (
                <h1 className="truncate text-xl font-bold text-white">
                  {title}
                </h1>
              )}
              {subtitle && subtitlePosition === "below" && (
                <p className="mt-0.5 text-sm text-amber-100">{subtitle}</p>
              )}
            </div>
          )}
        </div>
        {rightSlot && (
          <div className="flex items-center gap-2">{rightSlot}</div>
        )}
      </div>
      {children}
    </header>
  );
}
