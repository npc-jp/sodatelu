"use client";

// 年表（Compare）画面 — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom-extra.jsx の BloomTimeline
// きょうだいカラーチップ / 中央タイムライン / 月齢ラベル
//
// 既存ロジック維持: 兄弟比較 + 月齢ぞろえ。1人時はきょうだい追加誘導

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { usePlan } from "@/lib/plan-context";
import { getRecordsByChild, type Child, type GrowthRecord } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import { Sprout, Star, TinyBars } from "@/components/illustrations";

// 子どもごとのカラー（5人以上いる場合は色を循環）
const CHILD_COLORS = [
  "var(--bloom-primary)",
  "var(--bloom-accent)",
  "var(--bloom-pink)",
  "var(--bloom-yellow)",
  "#6B8FE8", // 青（5人目以降）
  "#9B7FD9", // 紫（6人目以降）
];

// 1列の幅（px）。5人くらいまでは画面に収まる、それ以上は横スクロール
const COL_WIDTH = 140;

// 記録日と生年月日から生後月齢を計算
function monthsFromBirth(birthDate: Timestamp, recordDate: Timestamp): number {
  const birth = birthDate.toDate();
  const record = recordDate.toDate();
  const diffMs = record.getTime() - birth.getTime();
  return Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
}

function formatMonths(months: number): string {
  if (months < 0) return "";
  if (months === 0) return "0ヶ月";
  if (months < 12) return `${months}ヶ月`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y}歳${m}ヶ月` : `${y}歳`;
}

// 年齢チップ用: 「11歳7ヶ月」フル日本語表記
function compactAge(birthDate: Timestamp): string {
  const birth = birthDate.toDate();
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  const totalMonths = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
  if (totalMonths < 12) return `${totalMonths}ヶ月`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y}歳${m}ヶ月` : `${y}歳`;
}

type TimelineRow = {
  months: number;
  records: {
    child: Child & { id: string };
    record: GrowthRecord & { id: string };
  }[];
};

export default function ComparePage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { children: kids, loading: childLoading } = useChild();
  const { isPremium } = usePlan();
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || childLoading) return;
    if (kids.length === 0) {
      setLoading(false);
      return;
    }

    async function fetchAllRecords() {
      const allRecords = new Map<string, (GrowthRecord & { id: string })[]>();
      await Promise.all(
        kids.map(async (kid) => {
          const recs = await getRecordsByChild(kid.id);
          allRecords.set(kid.id, recs);
        })
      );
      // 月齢別にマップ
      const monthMap = new Map<number, TimelineRow["records"]>();
      kids.forEach((kid) => {
        const records = allRecords.get(kid.id) || [];
        records.forEach((rec) => {
          const months = monthsFromBirth(kid.birth_date, rec.recorded_date);
          if (months < 0) return;
          if (!monthMap.has(months)) monthMap.set(months, []);
          monthMap.get(months)!.push({ child: kid, record: rec });
        });
      });
      const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => a - b);
      setTimeline(sortedMonths.map((months) => ({ months, records: monthMap.get(months)! })));
      setLoading(false);
    }

    fetchAllRecords();
  }, [kids, authLoading, childLoading]);

  if (authLoading || childLoading || loading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--bloom-bg)" }}
      >
        <Sprout size={42} color="var(--bloom-primary)" />
      </div>
    );
  }

  // 1人 or 0人の場合 → きょうだい追加 / アップグレード誘導
  if (!isPremium && kids.length <= 1) {
    return (
      <div
        className="flex h-full flex-col pb-24"
        style={{ background: "var(--bloom-bg)" }}
      >
        <header className="flex items-center gap-2.5 px-[18px] pt-3.5 pb-3">
          <Sprout size={18} color="var(--bloom-primary)" />
          <h1
            className="font-hand"
            style={{ fontSize: 22, color: "var(--bloom-ink)" }}
          >
            年表
          </h1>
        </header>
        <main className="flex flex-1 items-center justify-center px-5">
          <BloomCard soft className="p-8 text-center">
            <div className="flex justify-center">
              <TinyBars size={64} color="var(--bloom-yellow)" />
            </div>
            <p
              className="font-hand mt-4"
              style={{ fontSize: 15, color: "var(--bloom-ink)" }}
            >
              きょうだいの 成長を ならべて見よう
            </p>
            <p className="mt-2 text-[12px]" style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}>
              {kids.length === 0
                ? "まずは お子さまを 追加してください"
                : "もう一人 追加すると 年表が 並びます"}
            </p>
            {kids.length <= 1 && (
              <button
                type="button"
                onClick={() => router.push("/add-child")}
                className="bloom-border bloom-shadow font-hand mt-4 rounded-xl px-5 py-2.5 text-white"
                style={{
                  background: "var(--bloom-primary)",
                  fontSize: 13,
                  letterSpacing: "0.08em",
                }}
              >
                きょうだいを 追加する ✦
              </button>
            )}
          </BloomCard>
        </main>
        <BloomBottomNav current="compare" />
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col pb-24"
      style={{ background: "var(--bloom-bg)" }}
    >
      {/* ヘッダー */}
      <header className="flex items-center gap-2.5 px-[18px] pt-3.5 pb-2.5">
        <Sprout size={18} color="var(--bloom-primary)" />
        <h1
          className="font-hand"
          style={{ fontSize: 22, color: "var(--bloom-ink)" }}
        >
          年表
        </h1>
        <div className="ml-auto flex items-center gap-1.5">
          <Star size={14} color="var(--bloom-yellow)" />
          <span
            className="text-[12px]"
            style={{ color: "var(--bloom-ink-soft)" }}
          >
            月齢ぞろえ
          </span>
        </div>
      </header>

      {/* 案内: スマホ横向きで見やすい */}
      {kids.length >= 3 && (
        <p
          className="px-[18px] pb-1 text-[12px]"
          style={{ color: "var(--bloom-ink-soft)" }}
        >
          ↔ よこにスクロール／スマホは横向きが見やすいです
        </p>
      )}

      {/* タイムライン本体: 横スクロール領域。
          ヘッダー（子ども名チップ）と各月齢行を同じ列幅で揃え、横方向に一緒にスクロールさせる */}
      <main className="flex-1 overflow-x-auto overflow-y-auto pb-10">
        {timeline.length === 0 ? (
          <div className="px-3.5 pt-3">
            <BloomCard soft className="p-6 text-center">
              <Sprout size={36} color="var(--bloom-primary)" />
              <p
                className="font-hand mt-3"
                style={{ fontSize: 14, color: "var(--bloom-ink)" }}
              >
                きろくをつけると 年表に ならびます
              </p>
            </BloomCard>
          </div>
        ) : (
          <div
            className="min-w-max px-3.5 pt-1"
            style={{ minWidth: kids.length * COL_WIDTH + 60 }}
          >
            {/* ヘッダー: きょうだいカラーチップを N列横並び */}
            <div
              className="sticky top-0 z-10 mb-2 grid gap-2 pb-2 pt-1"
              style={{
                gridTemplateColumns: `repeat(${kids.length}, ${COL_WIDTH}px)`,
                background: "var(--bloom-bg)",
              }}
            >
              {kids.map((kid, i) => {
                const color = CHILD_COLORS[i % CHILD_COLORS.length];
                return (
                  <BloomCard
                    key={kid.id}
                    soft
                    color={color}
                    className="flex items-center gap-2 px-2.5 py-2 text-white"
                  >
                    <span
                      className="bloom-border flex shrink-0 items-center justify-center rounded-full"
                      style={{
                        width: 28,
                        height: 28,
                        background: "var(--bloom-yellow)",
                        fontFamily: "Yusei Magic, sans-serif",
                        fontSize: 13,
                        color: "var(--bloom-ink)",
                      }}
                    >
                      {kid.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <div
                        className="font-hand truncate"
                        style={{ fontSize: 13 }}
                      >
                        {kid.name}
                      </div>
                      <div className="text-[12px] opacity-95">
                        {compactAge(kid.birth_date)}
                      </div>
                    </div>
                  </BloomCard>
                );
              })}
            </div>

            {/* 各月齢行: 月齢ラベル + N列のカード */}
            {timeline.map((row, i) => (
              <div key={i} className="mb-3">
                {/* 月齢ラベル（行の上に小さく） */}
                <div className="mb-1.5 flex items-center gap-2">
                  <div
                    className="font-hand inline-block rounded-[10px] px-2 py-0.5"
                    style={{
                      background: "var(--bloom-bg)",
                      fontSize: 12,
                      color: "var(--bloom-ink-soft)",
                      border: "1.5px solid var(--bloom-line-soft)",
                    }}
                  >
                    {formatMonths(row.months)}
                  </div>
                  <div
                    className="flex-1"
                    style={{ height: 1, background: "var(--bloom-line-soft)" }}
                  />
                </div>
                {/* N列のカード（同じ月齢に同じ子の記録が複数あれば縦積み） */}
                <div
                  className="grid items-start gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${kids.length}, ${COL_WIDTH}px)`,
                  }}
                >
                  {kids.map((kid) => {
                    const recs = row.records.filter((r) => r.child.id === kid.id);
                    if (recs.length === 0) {
                      // 空のセル（同じ月齢に他の子の記録だけある場合のスペーサー）
                      return <div key={kid.id} />;
                    }
                    return (
                      <div key={kid.id} className="flex flex-col gap-1.5">
                        {recs.map(({ record: rec }) => (
                          <BloomCard
                            key={rec.id}
                            soft
                            className="cursor-pointer p-2.5"
                          >
                            <button
                              type="button"
                              onClick={() => router.push(`/record?id=${rec.id}`)}
                              className="block w-full text-left"
                            >
                              <div
                                className="font-hand line-clamp-2"
                                style={{ fontSize: 13, color: "var(--bloom-ink)", lineHeight: 1.4 }}
                              >
                                {rec.title}
                              </div>
                              <div
                                className="mt-0.5 text-[12px]"
                                style={{ color: "var(--bloom-ink-soft)" }}
                              >
                                {rec.recorded_date.toDate().toLocaleDateString("ja-JP")}
                              </div>
                            </button>
                          </BloomCard>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BloomBottomNav current="compare" />
    </div>
  );
}
