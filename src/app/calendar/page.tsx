"use client";

// カレンダー画面 — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom-extra.jsx の BloomCalendar
// Sprout + こよみ / 月送り「‹ 2026年5月 ›」/ グリッド7列 / 当日記録
//
// 既存ロジック維持: 月表示・記録ドット・子ども切替

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { getRecordsByChild, type GrowthRecord } from "@/lib/firestore";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import BloomFab from "@/components/bloom-fab";
import { Sprout, WavyLine } from "@/components/illustrations";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// カテゴリ → ドット色（できた=primary / はじめた=accent / その他=yellow）
function categoryDotColor(category: string): string {
  if (category === "できた" || category === "おめでとう") {
    return "var(--bloom-primary)";
  }
  if (category === "始めた") {
    return "var(--bloom-accent)";
  }
  return "var(--bloom-yellow)";
}

export default function CalendarPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { children: kids, selectedChild: child, selectChild, loading: childLoading } = useChild();
  const [records, setRecords] = useState<(GrowthRecord & { id: string })[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 選択中の子どもが変わったら記録を再取得
  useEffect(() => {
    if (!child) return;
    getRecordsByChild(child.id).then((recs) => {
      setRecords(recs);
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

  // カレンダーの日付配列を生成（月の初日まで null で埋める）
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
    // 5週分（35マス）に揃える
    while (days.length < 35) {
      days.push(null);
    }
    return days;
  }, [currentMonth]);

  function changeMonth(delta: number) {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1)
    );
    setSelectedDate(null);
  }

  const todayStr = new Date().toLocaleDateString("ja-JP");
  const selectedRecords = selectedDate ? recordsByDate[selectedDate] || [] : [];
  // 表示日（選択中 or 今日）の記録セクション
  const displayDateStr = selectedDate || todayStr;
  const displayRecords = recordsByDate[displayDateStr] || [];
  const displayDate = selectedDate
    ? new Date(selectedDate.replace(/\//g, "-"))
    : new Date();

  if (authLoading || childLoading || !child) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--bloom-bg)" }}
      >
        <Sprout size={42} color="var(--bloom-primary)" />
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full flex-col pb-24"
      style={{ background: "var(--bloom-bg)" }}
    >
      {/* ヘッダー */}
      <header className="flex items-center gap-2.5 px-[18px] pt-3.5 pb-2.5">
        <Sprout size={18} color="var(--bloom-primary)" />
        <h1
          className="font-hand"
          style={{ fontSize: "1.375rem", color: "var(--bloom-ink)" }}
        >
          こよみ
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="font-hand"
            style={{ fontSize: "0.875rem", color: "var(--bloom-ink-soft)" }}
            aria-label="前の月"
          >
            ‹
          </button>
          <span
            className="font-hand"
            style={{ fontSize: "1rem", color: "var(--bloom-ink)" }}
          >
            {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
          </span>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="font-hand"
            style={{ fontSize: "0.875rem", color: "var(--bloom-ink-soft)" }}
            aria-label="次の月"
          >
            ›
          </button>
        </div>
      </header>

      {/* 子ども切り替え */}
      {kids.length > 1 && (
        <div className="-mx-1 overflow-x-auto px-4 pb-2">
          <div className="flex min-w-max gap-2">
            {kids.map((kid) => {
              const isActive = child.id === kid.id;
              return (
                <button
                  key={kid.id}
                  onClick={() => selectChild(kid.id)}
                  className={`bloom-border flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 ${isActive ? "bloom-shadow-soft" : ""}`}
                  style={{
                    background: isActive ? "var(--bloom-primary)" : "#fff",
                    color: isActive ? "#fff" : "var(--bloom-ink)",
                    fontFamily: "Yusei Magic, sans-serif",
                    fontSize: "0.8125rem",
                  }}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full font-hand"
                    style={{ background: "var(--bloom-yellow)", fontSize: "0.75rem", color: "var(--bloom-ink)" }}
                  >
                    {kid.name.charAt(0)}
                  </span>
                  {kid.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 pb-10">
        {/* カレンダーグリッド */}
        <BloomCard soft className="p-3.5">
          {/* 曜日ヘッダー */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className="font-hand text-center"
                style={{
                  fontSize: "0.75rem",
                  color:
                    i === 0
                      ? "var(--bloom-accent)"
                      : i === 6
                        ? "var(--bloom-primary)"
                        : "var(--bloom-ink-soft)",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} style={{ aspectRatio: "1 / 1.1" }} />;
              }
              const dateStr = date.toLocaleDateString("ja-JP");
              const dayRecords = recordsByDate[dateStr] || [];
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = selectedDate === dateStr;
              const showHighlight = isSelected || (isToday && !selectedDate);
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className="flex flex-col items-center justify-center"
                  style={{
                    aspectRatio: "1 / 1.1",
                    background: showHighlight ? "var(--bloom-primary)" : "transparent",
                    border: showHighlight
                      ? "2px solid var(--bloom-line)"
                      : "1.5px solid transparent",
                    borderRadius: 10,
                    color: showHighlight ? "#fff" : "var(--bloom-ink)",
                    fontFamily: "Zen Kaku Gothic New, sans-serif",
                    fontSize: "0.8125rem",
                    fontWeight: showHighlight ? 700 : 400,
                  }}
                >
                  <div>{date.getDate()}</div>
                  {dayRecords.length > 0 && (
                    <div
                      className="mt-1 rounded-full"
                      style={{
                        width: 10,
                        height: 10,
                        background: categoryDotColor(dayRecords[0].category),
                        border: showHighlight
                          ? "1.5px solid #fff"
                          : "1.5px solid var(--bloom-line)",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </BloomCard>

        {/* 凡例 */}
        <div
          className="mt-4 flex justify-center gap-4 text-[0.8125rem]"
          style={{ color: "var(--bloom-ink)" }}
        >
          {[
            ["できた", "var(--bloom-primary)"],
            ["はじめた", "var(--bloom-accent)"],
            ["めやす", "var(--bloom-yellow)"],
          ].map(([l, c]) => (
            <div key={l} className="flex items-center gap-2">
              <div
                className="rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  background: c,
                  border: "1.5px solid var(--bloom-line)",
                }}
              />
              {l}
            </div>
          ))}
        </div>

        {/* 当日 / 選択日の記録セクション */}
        <div className="mt-5 mb-2.5 flex items-center gap-2.5">
          <span
            className="font-hand"
            style={{ fontSize: "1rem", color: "var(--bloom-ink)" }}
          >
            {displayDate.getMonth() + 1}月{displayDate.getDate()}日 のきろく
          </span>
          <WavyLine width={70} color="var(--bloom-primary)" stroke={2} />
        </div>

        {displayRecords.length === 0 ? (
          <BloomCard soft className="p-4 text-center">
            <p className="text-[0.8125rem]" style={{ color: "var(--bloom-ink-soft)" }}>
              この日の きろくは ありません
            </p>
            {selectedDate === null && (
              <button
                type="button"
                onClick={() => router.push(`/write?childId=${child.id}`)}
                className="font-hand mt-2 text-sm"
                style={{ color: "var(--bloom-accent)" }}
              >
                ＋ きろくをつける
              </button>
            )}
          </BloomCard>
        ) : (
          <div className="space-y-2">
            {displayRecords.concat(selectedRecords.length > 0 ? [] : []).map((rec) => (
              <BloomCard key={rec.id} soft className="cursor-pointer">
                <button
                  type="button"
                  onClick={() => router.push(`/record?id=${rec.id}`)}
                  className="block w-full p-3 text-left"
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-hand inline-block rounded-lg px-2 py-0.5 text-white"
                      style={{
                        background: categoryDotColor(rec.category),
                        fontSize: "0.75rem",
                        border: "1.5px solid var(--bloom-line)",
                      }}
                    >
                      {rec.category}
                    </span>
                    <div
                      className="font-hand truncate"
                      style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
                    >
                      {rec.title}
                    </div>
                  </div>
                  {rec.memo && (
                    <p
                      className="mt-1 line-clamp-2 text-[0.75rem]"
                      style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.5 }}
                    >
                      {rec.memo}
                    </p>
                  )}
                </button>
              </BloomCard>
            ))}
          </div>
        )}
      </main>

      <BloomFab onClick={() => router.push(`/write?childId=${child.id}`)} />
      <BloomBottomNav current="calendar" />
    </div>
  );
}
