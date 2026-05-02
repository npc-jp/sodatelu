"use client";

// 年表（Compare）画面: 兄弟の成長を生後月齢で並べて比較
// スタート地点（誕生日）を揃えて表示する
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { usePlan } from "@/lib/plan-context";
import { getRecordsByChild, type Child, type GrowthRecord } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import BottomNav from "@/components/bottom-nav";
import AppHeader from "@/components/app-header";
import Twemoji from "@/components/twemoji";

const CATEGORY_ICONS: { [key: string]: string } = {
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

// 記録日と生年月日から生後月齢を計算
function monthsFromBirth(birthDate: Timestamp, recordDate: Timestamp): number {
  const birth = birthDate.toDate();
  const record = recordDate.toDate();
  const diffMs = record.getTime() - birth.getTime();
  return Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
}

// 月齢をわかりやすい文字列に
function formatMonths(months: number): string {
  if (months < 0) return "";
  if (months === 0) return "誕生";
  if (months < 12) return `生後${months}ヶ月`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y}歳${m}ヶ月` : `${y}歳`;
}

// 各子どもの記録を月齢でグルーピング
type TimelineEntry = {
  months: number;
  records: {
    child: Child & { id: string };
    record: GrowthRecord & { id: string };
  }[];
};

function buildTimeline(
  kids: (Child & { id: string })[],
  allRecords: Map<string, (GrowthRecord & { id: string })[]>
): TimelineEntry[] {
  // 全記録を月齢でマッピング
  const monthMap = new Map<number, TimelineEntry["records"]>();

  kids.forEach((kid) => {
    const records = allRecords.get(kid.id) || [];
    records.forEach((rec) => {
      const months = monthsFromBirth(kid.birth_date, rec.recorded_date);
      if (months < 0) return;
      if (!monthMap.has(months)) monthMap.set(months, []);
      monthMap.get(months)!.push({ child: kid, record: rec });
    });
  });

  // 月齢順にソート
  const entries: TimelineEntry[] = [];
  const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => a - b);
  sortedMonths.forEach((months) => {
    entries.push({ months, records: monthMap.get(months)! });
  });

  return entries;
}

export default function ComparePage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { children: kids, loading: childLoading } = useChild();
  const { isPremium } = usePlan();
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || childLoading) return;
    if (kids.length === 0) return;

    async function fetchAllRecords() {
      const allRecords = new Map<string, (GrowthRecord & { id: string })[]>();

      // 全子どもの記録を取得
      await Promise.all(
        kids.map(async (kid) => {
          const recs = await getRecordsByChild(kid.id);
          allRecords.set(kid.id, recs);
        })
      );

      const tl = buildTimeline(kids, allRecords);
      setTimeline(tl);
      setLoading(false);
    }

    fetchAllRecords();
  }, [kids, authLoading, childLoading]);

  if (authLoading || childLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  // 無料版で子ども1人の場合
  if (!isPremium && kids.length <= 1) {
    return (
      <div className="flex h-full flex-col">
        <AppHeader
          title="年表"
          subtitle="きょうだいの成長を並べて見る"
          subtitlePosition="below"
        />

        <main className="flex flex-1 items-center justify-center px-5 pb-24">
          <div className="text-center">
            <div className="flex justify-center">
              <Twemoji emoji="📊" size={56} ariaLabel="" />
            </div>
            <p className="mt-4 font-medium text-slate-700">
              きょうだいの成長を比べてみよう
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {kids.length <= 1
                ? "きょうだいを追加すると、生後月齢で並べて見られます"
                : "プレミアムプランで年表機能が使えます"}
            </p>
            {kids.length <= 1 && (
              <button
                onClick={() => router.push("/add-child")}
                className="mt-4 rounded-full bg-amber-500 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                きょうだいを追加する
              </button>
            )}
          </div>
        </main>

        <BottomNav current="compare" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー */}
      <AppHeader
        title="年表"
        subtitle="誕生日を揃えて、きょうだいの成長を並べて見る"
        subtitlePosition="below"
      />

      {/* 子どもの凡例 */}
      <div className="flex gap-3 overflow-x-auto border-b border-slate-200 bg-white px-5 py-3">
        {kids.map((kid) => (
          <div key={kid.id} className="flex shrink-0 items-center gap-2">
            {kid.photo_url ? (
              <img src={kid.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">
                {kid.name.charAt(0)}
              </span>
            )}
            <span className="text-sm font-medium text-slate-700">{kid.name}</span>
          </div>
        ))}
      </div>

      {/* タイムライン */}
      <main className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex justify-center">
              <Twemoji emoji="📊" size={48} ariaLabel="" />
            </div>
            <p className="mt-4 text-sm text-slate-500">
              記録をつけると年表に表示されます
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* 中央の縦線 */}
            <div className="absolute left-[60px] top-0 bottom-0 w-px bg-slate-200" />

            {timeline.map((entry, i) => (
              <div key={i} className="relative mb-6 flex gap-4">
                {/* 月齢ラベル */}
                <div className="w-[52px] shrink-0 pt-1 text-right">
                  <span className="text-xs font-bold text-amber-600">
                    {formatMonths(entry.months)}
                  </span>
                </div>

                {/* ドット */}
                <div className="relative z-10 mt-2 h-3 w-3 shrink-0 rounded-full bg-amber-400 ring-2 ring-white" />

                {/* 記録カード群 */}
                <div className="flex-1 space-y-2">
                  {entry.records.map((item, j) => (
                    <button
                      key={j}
                      onClick={() => router.push(`/record?id=${item.record.id}`)}
                      className="flex w-full items-start gap-2 rounded-xl bg-white p-3 text-left shadow-sm hover:bg-slate-50 active:bg-slate-100"
                    >
                      {/* 子どものアバター（誰の記録かわかるように） */}
                      {item.child.photo_url ? (
                        <img
                          src={item.child.photo_url}
                          alt=""
                          className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">
                          {item.child.name.charAt(0)}
                        </span>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {CATEGORY_ICONS[item.record.category] ? (
                            <Twemoji
                              emoji={CATEGORY_ICONS[item.record.category]}
                              size={16}
                              ariaLabel={item.record.category}
                            />
                          ) : (
                            <span className="text-sm" aria-hidden>⚪</span>
                          )}
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {item.record.title}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {item.child.name} ・ {item.record.recorded_date.toDate().toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav current="compare" />
    </div>
  );
}
