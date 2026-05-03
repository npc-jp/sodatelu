"use client";

// 下部ナビゲーションバー（アプリっぽいタブUI）
// 各タブはすべて「場所（画面）」を指す。
// 記録入力（write）はホーム右下のFABから起動するため、ここには置かない。
// アイコンは Lucide React に統一（OS依存の絵文字を避けてブランド統一感を出す）。
import { useRouter } from "next/navigation";
import {
  Home,
  CalendarDays,
  Sprout,
  BarChart3,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  key: string;
  label: string;
  Icon: LucideIcon;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "ホーム", Icon: Home, href: "/home" },
  { key: "calendar", label: "カレンダー", Icon: CalendarDays, href: "/calendar" },
  { key: "milestones", label: "めやす", Icon: Sprout, href: "/milestones" },
  { key: "compare", label: "年表", Icon: BarChart3, href: "/compare" },
  { key: "book", label: "アルバム", Icon: BookOpen, href: "/book" },
];

export default function BottomNav({ current }: { current: string }) {
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-slate-200 bg-white pb-safe">
      {NAV_ITEMS.map((item) => {
        const Icon = item.Icon;
        const isActive = current === item.key;
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.href)}
            className={`flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2 text-[13px] transition-colors ${
              isActive
                ? "text-amber-500"
                : "text-slate-400 hover:text-slate-600"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            <span className="font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
