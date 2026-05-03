"use client";

// 一時プレビューページ: Lucideアイコン置き換え後のヘッダー＆BottomNavを
// 認証不要で表示するためのスクショ用画面。
// Azuレビュー後に削除する。
import { Users, Settings, Home, CalendarDays, Sprout, BarChart3, BookOpen } from "lucide-react";
import SodateluLogo from "@/components/sodatelu-logo";

const NAV_ITEMS = [
  { key: "home", label: "ホーム", Icon: Home, isActive: true },
  { key: "calendar", label: "カレンダー", Icon: CalendarDays, isActive: false },
  { key: "milestones", label: "めやす", Icon: Sprout, isActive: false },
  { key: "compare", label: "年表", Icon: BarChart3, isActive: false },
  { key: "book", label: "アルバム", Icon: BookOpen, isActive: false },
];

export default function IconsPreviewPage() {
  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* ヘッダー（home/page.tsx と同じスタイル） */}
      <header className="bg-gradient-to-b from-amber-500 to-amber-400 px-5 pb-6 pt-12">
        <div className="flex items-center justify-between">
          <SodateluLogo variant="white" layout="horizontal" height={32} />
          <div className="flex items-center gap-2">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15"
              aria-label="ファミリー"
            >
              <Users className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15"
              aria-label="設定"
            >
              <Settings className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* 子どもカード（モック） */}
        <div className="mt-4 rounded-2xl bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-600">
              さ
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">さくら</h2>
              <p className="text-sm text-slate-500">1歳8ヶ月 ・ 女の子</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <span className="text-lg">👶</span>
            <div>
              <p className="text-[13px] font-medium text-slate-400">Phase 2</p>
              <p className="text-sm font-bold text-slate-700">よちよち期</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[13px] text-slate-400">1〜3歳</p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ（ダミー） */}
      <main className="flex-1 overflow-y-auto px-5 pb-24 pt-5">
        <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-600">きろくサマリー</h3>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[13px] font-medium text-slate-600">
              ✨ できた <span className="ml-1 font-bold text-amber-600">1</span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[13px] font-bold text-amber-600">
              合計 1件
            </span>
          </div>
        </div>

        <div className="mb-3 flex gap-3">
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-sm font-bold text-slate-700">成長のめやす</p>
              <p className="text-[13px] text-slate-400">よちよち期</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <span className="text-2xl">👶</span>
            <div>
              <p className="text-sm font-bold text-slate-700">きょうだい</p>
              <p className="text-[13px] text-slate-400">追加</p>
            </div>
          </div>
        </div>

        <div className="mb-5 flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className="text-2xl">📖</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-700">さくらのこれまで</p>
            <p className="text-[13px] text-slate-400">写真と一緒にゆっくり振り返る</p>
          </div>
          <span className="text-slate-300">›</span>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-700">最近の記録</h3>
        </div>

        <div className="space-y-3">
          <div className="flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-sm">
            <div className="mt-0.5 text-base">✨</div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-800">はじめて「ママ」と言えた</p>
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                ものすごく驚いた。今日の朝連の時、犬ひとたちの中でパッと言えた。ちゃんと耳に入って驚いた。うれしかった。
              </p>
              <p className="mt-2 text-[13px] text-slate-400">
                2026/5/1
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">できた</span>
                <span className="ml-2 text-slate-300">by wizardaz1976@mac.com</span>
              </p>
            </div>
            <span className="mt-1 text-slate-300">›</span>
          </div>
        </div>
      </main>

      {/* FAB */}
      <button className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-2xl text-white shadow-lg">
        +
      </button>

      {/* BottomNav（bottom-nav.tsx と同じスタイル） */}
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-slate-200 bg-white pb-safe">
        {NAV_ITEMS.map((item) => {
          const Icon = item.Icon;
          return (
            <button
              key={item.key}
              className={`flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2 text-[13px] transition-colors ${
                item.isActive ? "text-amber-500" : "text-slate-400"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
