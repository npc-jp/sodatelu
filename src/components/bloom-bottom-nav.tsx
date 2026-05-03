"use client";

// Bloom 下部ナビゲーション
// - 白背景 + 太線上部
// - アクティブタブ: 32x32 緑円（太線）+ 白アイコン
// - 非アクティブ: アイコン透過、灰色テキスト
// - タブ: ホーム◉ / こよみ◐ / めやす✦ / 年表||| / アルバム▢
//
// 既存 BottomNav (Lucide ベース) と段階的に切替えるため、新しいエージェントは
// 本コンポーネントを使う。
// リファレンス: dir-bloom.jsx の BloomBottomNav

import { useRouter } from "next/navigation";

type NavKey = "home" | "calendar" | "milestones" | "compare" | "book";

type NavItem = {
  key: NavKey;
  label: string;
  /** Yusei Magic 系のテキスト記号 / 小さなマーク */
  glyph: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "ホーム", glyph: "◉", href: "/home" },
  { key: "calendar", label: "こよみ", glyph: "◐", href: "/calendar" },
  { key: "milestones", label: "めやす", glyph: "✦", href: "/milestones" },
  { key: "compare", label: "年表", glyph: "|||", href: "/compare" },
  { key: "book", label: "アルバム", glyph: "▢", href: "/book" },
];

type Props = {
  /** 現在のタブ */
  current: NavKey | string;
};

export default function BloomBottomNav({ current }: Props) {
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 items-center justify-around bg-white pb-safe"
      style={{
        borderTop: "2px solid var(--bloom-line)",
        padding: "10px 6px max(12px, env(safe-area-inset-bottom))",
        zIndex: 4,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = current === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => router.push(item.href)}
            className="flex flex-1 flex-col items-center gap-0.5"
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className="font-hand inline-flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                background: isActive ? "var(--bloom-primary)" : "transparent",
                color: isActive ? "#fff" : "var(--bloom-ink-soft)",
                border: isActive ? "2px solid var(--bloom-line)" : "none",
                fontSize: 13,
              }}
            >
              {item.glyph}
            </span>
            <span
              className="text-[10px]"
              style={{
                color: "var(--bloom-ink)",
                fontWeight: isActive ? 700 : 400,
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
