"use client";

// カレンダー画面: 月表示で記録がある日にドットを表示。子ども切り替え対応
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { getRecordsByChild, type GrowthRecord } from "@/lib/firestore";
import BottomNav from "@/components/bottom-nav";
import SodateluLogo from "@/components/sodatelu-logo";
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

const CATEGORY_COLORS: { [key: string]: string } = {
  できた: "bg-yellow-400",
  おめでとう: "bg-green-500",
  始めた: "bg-orange-400",
  がんばった: "bg-red-500",
  感じた: "bg-blue-500",
  言った: "bg-purple-500",
  行った: "bg-cyan-400",
  やめた: "bg-gray-800",
  "あげた・もらった": "bg-pink-400",
  のりこえた: "bg-amber-700",
  ありがとう: "bg-yellow-300",
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { children: kids, selectedChild: child, selectChild, loading: childLoading } = useChild();
  const [records, setRecords] = useState<(GrowthRecord & { id: string })[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // 選択中の子どもが変わったら記録を再取得
  useEffect(() => {
    if (!child) return;
    setRecordsLoading(true);
    getRecordsByChild(child.id).then((recs) => {
      setRecords(recs);
      setRecordsLoading(false);
    });
  }, [child]);

  // 日付→記録のマップを作成
  const recordsByDate = useMemo(() => {
    const map: { [dateStr: string]: (GrowthRecord & { id: string })[] } = {};
    records.forEach((rec) => {
      const dateStr = rec.recorded_date.toDate().toLocaleDateString("ja-JP");
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(rec);
    });
    return map;
  }, [records]);

  // カレンダーの日付配列を生成
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [currentMonth]);

  function changeMonth(delta: number) {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1)
    );
    setSelectedDate(null);
  }

  const selectedRecords = selectedDate ? recordsByDate[selectedDate] || [] : [];

  if (authLoading || childLoading || !child) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー: ブランドレビューに従い amber グラデーション統一。ロゴ + 月切替を載せる */}
      <header className="bg-gradient-to-b from-amber-500 to-amber-400 px-5 pb-4 pt-6">
        {/* 上段: ロゴ */}
        <div className="flex items-center justify-between">
          <SodateluLogo variant="white" layout="horizontal" height={40} />
        </div>

        {/* 子ども切り替え（2人以上） */}
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
                    <img src={kid.photo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
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

        {/* 月切り替え */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/15 px-2 py-1 backdrop-blur">
          <button
            onClick={() => changeMonth(-1)}
            className="rounded-md p-2 text-amber-100 hover:bg-white/15 hover:text-white"
            aria-label="前の月"
          >
            ◀
          </button>
          <h1 className="text-lg font-bold text-white">
            {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
          </h1>
          <button
            onClick={() => changeMonth(1)}
            className="rounded-md p-2 text-amber-100 hover:bg-white/15 hover:text-white"
            aria-label="次の月"
          >
            ▶
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-24">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">{w}</div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} className="h-12" />;
            }

            const dateStr = date.toLocaleDateString("ja-JP");
            const dayRecords = recordsByDate[dateStr] || [];
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex h-12 flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                  isSelected
                    ? "bg-amber-500 text-white"
                    : isToday
                      ? "bg-amber-50 font-bold text-amber-600"
                      : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{date.getDate()}</span>
                {dayRecords.length > 0 && (
                  <div className="flex items-center gap-px mt-0.5">
                    {dayRecords.slice(0, 2).map((rec, j) =>
                      CATEGORY_ICONS[rec.category] ? (
                        <Twemoji
                          key={j}
                          emoji={CATEGORY_ICONS[rec.category]}
                          size={10}
                          ariaLabel={rec.category}
                        />
                      ) : (
                        <span key={j} className="text-[8px] leading-none" aria-hidden>
                          ⚪
                        </span>
                      )
                    )}
                    {dayRecords.length > 2 && (
                      <span className={`text-[7px] leading-none ${isSelected ? "text-white" : "text-slate-400"}`}>
                        +{dayRecords.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 選択日の記録リスト */}
        {selectedDate && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-bold text-slate-600">
              {selectedDate} の記録
            </h3>
            {selectedRecords.length === 0 ? (
              <div className="rounded-xl bg-white p-4 text-center text-sm text-slate-400 shadow-sm">
                この日の記録はありません
                <button
                  onClick={() => router.push(`/write?childId=${child.id}`)}
                  className="mt-2 block w-full text-amber-600 font-medium"
                >
                  + 記録をつける
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedRecords.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => router.push(`/record?id=${rec.id}`)}
                    className="flex w-full items-start gap-3 rounded-xl bg-white p-4 text-left shadow-sm hover:bg-slate-50 active:bg-slate-100"
                  >
                    <span className="mt-0.5">
                      {CATEGORY_ICONS[rec.category] ? (
                        <Twemoji
                          emoji={CATEGORY_ICONS[rec.category]}
                          size={18}
                          ariaLabel={rec.category}
                        />
                      ) : (
                        <span aria-hidden>⚪</span>
                      )}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{rec.title}</p>
                      {rec.memo && (
                        <p className="mt-1 text-sm text-slate-500">{rec.memo}</p>
                      )}
                      {rec.photo_url && (
                        <img
                          src={rec.photo_url}
                          alt=""
                          className="mt-2 h-20 w-28 rounded-lg object-cover"
                        />
                      )}
                      <p className="mt-1 text-xs text-slate-300">{rec.category}</p>
                    </div>
                    <span className="mt-1 text-slate-300">›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav current="calendar" />
    </div>
  );
}
