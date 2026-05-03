"use client";

// アルバム画面 — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom-extra.jsx の BloomAlbum
// Sprout + アルバム + 件数 / フィルタチップ / 月別グループ / カード
//
// 既存ロジック維持: 写真フィルタ、月別グループ、子ども切替

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { getRecordsByChild, type GrowthRecord } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import BloomFab from "@/components/bloom-fab";
import { Sprout, Star } from "@/components/illustrations";

type FilterKey = "all" | "photos" | "done" | "started";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "photos", label: "写真あり" },
  { key: "done", label: "できた" },
  { key: "started", label: "はじめた" },
];

// カテゴリ → タグ色
function categoryColor(category: string): string {
  if (category === "始めた") return "var(--bloom-accent)";
  if (category === "おめでとう") return "var(--bloom-pink)";
  if (category === "ありがとう") return "var(--bloom-yellow)";
  return "var(--bloom-primary)";
}

// 記録日と生年月日からその時の年齢を計算
function ageAtRecord(birthDate: Timestamp, recordDate: Timestamp): string {
  const birth = birthDate.toDate();
  const record = recordDate.toDate();
  const diffMs = record.getTime() - birth.getTime();
  const totalMonths = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
  if (totalMonths < 0) return "";
  if (totalMonths < 1) {
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return `${days}日`;
  }
  if (totalMonths < 12) return `${totalMonths}ヶ月`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y}歳${m}ヶ月` : `${y}歳`;
}

// 年月でグルーピング（新しい順）
function groupByMonth(records: (GrowthRecord & { id: string })[]) {
  const groups: { [key: string]: (GrowthRecord & { id: string })[] } = {};
  records.forEach((rec) => {
    const d = rec.recorded_date.toDate();
    const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(rec);
  });
  return groups;
}

export default function BookPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { children: kids, selectedChild: child, selectChild, loading: childLoading } = useChild();
  const [records, setRecords] = useState<(GrowthRecord & { id: string })[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (!child) return;
    getRecordsByChild(child.id).then((recs) => {
      // 新しい順
      recs.sort((a, b) => b.recorded_date.seconds - a.recorded_date.seconds);
      setRecords(recs);
    });
  }, [child]);

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

  // フィルタ適用
  const filteredRecords = records.filter((r) => {
    if (filter === "photos") return !!r.photo_url;
    if (filter === "done") return r.category === "できた" || r.category === "おめでとう";
    if (filter === "started") return r.category === "始めた";
    return true;
  });

  const grouped = groupByMonth(filteredRecords);

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
          style={{ fontSize: 22, color: "var(--bloom-ink)" }}
        >
          アルバム
        </h1>
        <div
          className="ml-auto text-[12px]"
          style={{ color: "var(--bloom-ink-soft)" }}
        >
          {records.length}件
        </div>
      </header>

      {/* 子ども切り替え */}
      {kids.length > 1 && (
        <div className="-mx-1 overflow-x-auto px-4 pb-1">
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
                    fontSize: 13,
                  }}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full font-hand"
                    style={{ background: "var(--bloom-yellow)", fontSize: 12, color: "var(--bloom-ink)" }}
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

      {/* フィルタチップ */}
      <div className="flex gap-1.5 overflow-x-auto px-3.5 pb-2 pt-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="font-hand whitespace-nowrap rounded-[10px] px-3 py-1"
              style={{
                background: active ? "var(--bloom-primary)" : "#fff",
                color: active ? "#fff" : "var(--bloom-ink)",
                border: "1.5px solid var(--bloom-line)",
                boxShadow: active ? "2px 2px 0 var(--bloom-line)" : "none",
                fontSize: 12,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <main className="flex-1 overflow-y-auto px-3.5 pb-10 pt-1.5">
        {filteredRecords.length === 0 ? (
          <BloomCard soft className="mt-4 p-6 text-center">
            <Sprout size={36} color="var(--bloom-primary)" />
            <p
              className="font-hand mt-3"
              style={{ fontSize: 14, color: "var(--bloom-ink)" }}
            >
              {filter === "photos"
                ? "写真付きの きろくが まだありません"
                : "まだ きろくが ありません"}
            </p>
            <button
              type="button"
              onClick={() => router.push(`/write?childId=${child.id}`)}
              className="bloom-border bloom-shadow font-hand mt-4 rounded-xl px-5 py-2.5 text-white"
              style={{
                background: "var(--bloom-primary)",
                fontSize: 13,
                letterSpacing: "0.08em",
              }}
            >
              はじめての きろく ✦
            </button>
          </BloomCard>
        ) : (
          Object.entries(grouped).map(([month, recs], idx) => (
            <div key={month} className={idx === 0 ? "mt-2" : "mt-5"}>
              {/* 月ヘッダー（手描き字 + 細線 + 件数） */}
              <div className="mb-2 flex items-center gap-2 px-1">
                <span
                  className="font-hand"
                  style={{ fontSize: 14, color: "var(--bloom-ink)" }}
                >
                  {month}
                </span>
                <div
                  className="flex-1"
                  style={{ height: 1, background: "var(--bloom-line-soft)" }}
                />
                <span
                  className="text-[12px]"
                  style={{ color: "var(--bloom-ink-soft)" }}
                >
                  {recs.length}件
                </span>
              </div>
              {/* 記録カード列 */}
              <div className="space-y-2">
                {recs.map((rec) => (
                  <BloomCard
                    key={rec.id}
                    soft
                    className="cursor-pointer overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/record?id=${rec.id}`)}
                      className="block w-full text-left"
                    >
                      {rec.photo_url ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={rec.photo_url}
                            alt=""
                            className="h-32 w-full object-cover"
                            style={{ borderBottom: "2px solid var(--bloom-line)" }}
                          />
                          <span
                            className="absolute"
                            style={{ top: 8, right: 8 }}
                          >
                            <Star size={14} color="var(--bloom-yellow)" />
                          </span>
                        </div>
                      ) : null}
                      <div className="p-3">
                        <div className="flex items-baseline justify-between">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="font-hand inline-block rounded-lg px-2 py-0.5 text-white"
                              style={{
                                background: categoryColor(rec.category),
                                fontSize: 12,
                                border: "1.5px solid var(--bloom-line)",
                              }}
                            >
                              {rec.category}
                            </span>
                            <span
                              className="font-hand truncate"
                              style={{ fontSize: 14, color: "var(--bloom-ink)" }}
                            >
                              {rec.title}
                            </span>
                          </div>
                          <span
                            className="ml-2 shrink-0 text-[12px]"
                            style={{ color: "var(--bloom-ink-soft)" }}
                          >
                            {`${rec.recorded_date.toDate().getMonth() + 1}/${rec.recorded_date.toDate().getDate()}`}
                          </span>
                        </div>
                        {rec.memo && (
                          <p
                            className="mt-1 line-clamp-2 text-[12px]"
                            style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.5 }}
                          >
                            {rec.memo}
                          </p>
                        )}
                        <div
                          className="mt-2 inline-block rounded-full px-2 py-0.5 text-[12px]"
                          style={{
                            background: "var(--bloom-primary-soft)",
                            color: "var(--bloom-ink)",
                          }}
                        >
                          {ageAtRecord(child.birth_date, rec.recorded_date)}
                        </div>
                      </div>
                    </button>
                  </BloomCard>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      <BloomFab onClick={() => router.push(`/write?childId=${child.id}`)} />
      <BloomBottomNav current="book" />
    </div>
  );
}
