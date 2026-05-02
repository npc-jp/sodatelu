"use client";

// 思い出ページ（普段見られる版）
//
// 役割: 親→子への愛の手紙として、写真付き記録を月齢順で振り返る場所。
//   - 子ども選択（複数いる場合）
//   - 「○○ちゃんのこれまで」というタイトル
//   - 月齢順で写真付き記録だけを縦スクロール表示
//   - 各記録: 写真 + 月齢 + カテゴリ + タイトル
//   - 末尾に「これからのおもいで」の空白カードで未来の余白を残す
//
// 設計鉄則（docs/product-vision.md ver.2）:
//   - 過度に演出しすぎない（自動生成キャプションは入れない）
//   - 卒業時演出版（v2以降）とは別のレイヤーで、普段から静かに見られる
//   - 「順位」「達成度」「平均」を一切使わない
//
// 配置: BottomNav には追加せず、ホーム画面のカードから遷移する。

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { getRecordsByChild, type GrowthRecord } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import AppHeader from "@/components/app-header";
import Twemoji from "@/components/twemoji";

// カテゴリの絵文字（home/page.tsx と同じ表記を踏襲）
const CATEGORY_DOT: { [key: string]: string } = {
  できた: "✨",
  おめでとう: "🎉",
  始めた: "🌱",
  がんばった: "💪",
  感じた: "💭",
  言った: "💬",
  行った: "🚀",
  やめた: "🔖",
  "あげた・もらった": "🎁",
  のりこえた: "🏔️",
  ありがとう: "🙏",
};

// 記録時点の月齢を「○歳○ヶ月」形式で返す
function ageAtRecord(birthDate: Timestamp, recordDate: Timestamp): string {
  const birth = birthDate.toDate();
  const record = recordDate.toDate();
  const diffMs = record.getTime() - birth.getTime();
  const totalMonths = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));

  if (totalMonths < 0) return "";
  if (totalMonths < 1) {
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return `生後${days}日`;
  }
  if (totalMonths < 12) return `${totalMonths}ヶ月`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y}歳${m}ヶ月` : `${y}歳`;
}

export default function MemoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    children: kids,
    selectedChild: child,
    selectChild,
    loading: childLoading,
  } = useChild();
  const [records, setRecords] = useState<(GrowthRecord & { id: string })[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // 認証ガード
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // 選択中の子どもの記録を取得
  useEffect(() => {
    if (!child) return;
    setRecordsLoading(true);
    getRecordsByChild(child.id)
      .then((recs) => {
        // 写真付きの記録だけを月齢順（古い順）に並べる
        const photoOnly = recs
          .filter((r) => !!r.photo_url)
          .sort((a, b) => a.recorded_date.seconds - b.recorded_date.seconds);
        setRecords(photoOnly);
      })
      .finally(() => setRecordsLoading(false));
  }, [child]);

  if (authLoading || childLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex h-full flex-col">
        <AppHeader title="おもいで" showBack onBack={() => router.back()} />
        <main className="flex-1 px-5 pt-8">
          <p className="text-sm text-slate-500">
            お子さまが登録されていません。
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* ヘッダー */}
      <AppHeader
        title={`${child.name}のこれまで`}
        subtitle="おもいで"
        showBack
        onBack={() => router.back()}
      >
        {/* 子ども切り替えタブ（2人以上） */}
        {kids.length > 1 && (
          <div className="mt-3 -mx-5 overflow-x-auto px-5">
            <div className="flex gap-2 min-w-max">
              {kids.map((kid) => (
                <button
                  key={kid.id}
                  onClick={() => selectChild(kid.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    child.id === kid.id
                      ? "bg-white text-amber-600 shadow-sm"
                      : "bg-amber-600/30 text-amber-100 hover:bg-amber-600/50"
                  }`}
                >
                  {kid.photo_url ? (
                    <img
                      src={kid.photo_url}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-700">
                      {kid.name.charAt(0)}
                    </span>
                  )}
                  {kid.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </AppHeader>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
        {recordsLoading ? (
          <p className="rounded-2xl bg-white p-4 text-xs text-slate-400 shadow-sm">
            読み込み中...
          </p>
        ) : records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="flex justify-center">
              <Twemoji emoji="🌱" size={48} ariaLabel="" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600">
              写真付きの記録がまだありません
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {child.name}の毎日を写真と一緒に記録すると、
              ここに思い出が並んでいきます。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((rec) => {
              const age = ageAtRecord(child.birth_date, rec.recorded_date);
              const dot = CATEGORY_DOT[rec.category];
              return (
                <button
                  key={rec.id}
                  onClick={() => router.push(`/record?id=${rec.id}`)}
                  className="block w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm transition-colors hover:bg-slate-50"
                >
                  {/* 写真（フルブリード） */}
                  <img
                    src={rec.photo_url}
                    alt=""
                    className="h-56 w-full object-cover"
                  />
                  {/* 記録情報 */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{age}</span>
                      <span aria-hidden>・</span>
                      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                        {dot ? (
                          <Twemoji emoji={dot} size={12} ariaLabel="" />
                        ) : (
                          <span aria-hidden>⚪</span>
                        )}
                        {rec.category}
                      </span>
                      <span className="ml-auto text-slate-300">
                        {rec.recorded_date.toDate().toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-medium text-slate-800">
                      {rec.title}
                    </p>
                    {rec.memo && (
                      <p className="mt-1 text-sm leading-relaxed text-slate-500 line-clamp-3">
                        {rec.memo}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}

            {/* 末尾: これからのおもいでカード（未来の余白） */}
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-6 text-center">
              <div className="flex justify-center" aria-hidden>
                <Twemoji emoji="🌱" size={36} ariaLabel="" />
              </div>
              <p className="mt-2 text-sm font-medium text-amber-700">
                これからのおもいで
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {child.name}のこれからの毎日が、
                ここに少しずつ積もっていきます。
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
