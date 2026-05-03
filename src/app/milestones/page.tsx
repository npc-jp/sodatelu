"use client";

// 成長のめやす一覧ページ — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom.jsx の BloomMilestones
// Sprout + 成長のめやす / 4フェーズタブ / 現フェーズカード（緑） / めやす項目リスト
//
// 設計鉄則: 達成率・%表示は使わない（ドキッとさせない）
// 「これから来るもの／きろくできるもの」として中立に見せる

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { getRecordsByChild, type GrowthRecord } from "@/lib/firestore";
import { MILESTONES } from "@/lib/milestones-data";
import { getPhase, PHASES } from "@/lib/phases";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import { PottedPlant, Sprout } from "@/components/illustrations";

// フェーズ番号 → アクティブ時の背景色
// 以前は 1, 3 が *-soft（薄色）だったが、白文字が読めなくなるため濃色に統一
const PHASE_COLORS: { [key: number]: string } = {
  1: "var(--bloom-primary)",
  2: "var(--bloom-accent)",
  3: "var(--bloom-pink)",
  4: "var(--bloom-yellow)",
};

export default function MilestonesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  // ChildContext の selectedChild に追従。home で選んだ子のめやすが見える
  const { selectedChild, loading: childLoading } = useChild();
  const [currentPhase, setCurrentPhase] = useState(1);
  const [achievedIds, setAchievedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const childName = selectedChild?.name ?? "";

  useEffect(() => {
    if (authLoading || childLoading || !user) return;
    if (!selectedChild) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      if (!selectedChild) return;
      const phase = getPhase(selectedChild.birth_date.toDate());
      setCurrentPhase(phase.number);

      // 記録済みマイルストーンを取得（記録に milestone_id があるもの）
      const records = await getRecordsByChild(selectedChild.id);
      const achieved = new Set<string>();
      records.forEach((rec: GrowthRecord & { id: string }) => {
        if (rec.milestone_id) {
          achieved.add(rec.milestone_id.id);
        }
      });
      setAchievedIds(achieved);
      setLoading(false);
    }

    fetchData();
  }, [user, authLoading, childLoading, selectedChild]);

  // 選択中フェーズのマイルストーン
  const filteredMilestones = MILESTONES.filter((m) => m.phase === currentPhase);
  const phaseInfo = PHASES[currentPhase - 1];
  const recordedCount = filteredMilestones.filter((m) => achievedIds.has(m.id)).length;
  const remaining = filteredMilestones.length - recordedCount;
  // プログレスバーの幅（最大40%程度に抑えてプレッシャーにならないように）
  const progressPct = filteredMilestones.length > 0
    ? Math.min(100, Math.round((recordedCount / filteredMilestones.length) * 100))
    : 0;

  if (authLoading || loading) {
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
      className="flex h-full flex-col pb-24"
      style={{ background: "var(--bloom-bg)" }}
    >
      {/* ヘッダー */}
      <header
        className="px-[18px] pt-3.5 pb-3"
        style={{ borderBottom: "2px solid var(--bloom-line)" }}
      >
        <div className="flex items-center gap-2">
          <Sprout size={20} color="var(--bloom-primary)" />
          <h1
            className="font-hand"
            style={{ fontSize: 22, color: "var(--bloom-ink)" }}
          >
            成長のめやす
          </h1>
        </div>
        <p
          className="mt-0.5 text-[12px]"
          style={{ color: "var(--bloom-ink-soft)", marginLeft: 28 }}
        >
          {childName ? `${childName}のこれから・きろく` : "これから・きろく"}
        </p>
      </header>

      {/* フェーズタブ（横スクロール） */}
      <div
        className="flex gap-1.5 overflow-x-auto px-3.5 py-2.5"
        style={{ borderBottom: "2px solid var(--bloom-line)" }}
      >
        {PHASES.map((phase) => {
          const active = currentPhase === phase.number;
          const tabColor = PHASE_COLORS[phase.number] ?? "#fff";
          return (
            <button
              key={phase.number}
              type="button"
              onClick={() => setCurrentPhase(phase.number)}
              className="bloom-border font-hand whitespace-nowrap rounded-xl px-3.5 py-1.5"
              style={{
                fontSize: 14,
                fontWeight: 700,
                background: active ? tabColor : "#fff",
                color: active
                  ? tabColor === "var(--bloom-yellow)"
                    ? "var(--bloom-ink)"
                    : "#fff"
                  : "var(--bloom-ink)",
                boxShadow: active ? "2px 2px 0 var(--bloom-line)" : "none",
              }}
            >
              {phase.ageRange}
            </button>
          );
        })}
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-10 pt-3.5">
        {/* 趣旨説明 */}
        <p
          className="font-hand mb-4 text-center"
          style={{ fontSize: 13, color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
        >
          時期はあくまで目安。
          <br />
          うちの子のペースで、ゆっくり育ちます。
        </p>

        {/* 現フェーズカード */}
        {phaseInfo && (
          <BloomCard
            color="var(--bloom-primary)"
            className="relative overflow-hidden p-4"
          >
            <div
              className="absolute pointer-events-none"
              style={{ right: -10, top: -10, opacity: 0.2 }}
            >
              <PottedPlant size={80} />
            </div>
            <div className="relative text-white">
              <div className="font-hand" style={{ fontSize: 18 }}>
                {phaseInfo.name}
              </div>
              <div className="text-[12px] mt-0.5 opacity-90">
                {phaseInfo.ageRange}
              </div>
              <div
                className="bloom-border font-hand mt-3 inline-block rounded-[10px] px-2.5 py-1"
                style={{
                  background: "#fff",
                  color: "var(--bloom-ink)",
                  fontSize: 12,
                }}
              >
                {recordedCount}件 きろく ・ あと{remaining}件
              </div>
              <div
                className="mt-2.5 overflow-hidden rounded"
                style={{ height: 5, background: "rgba(255,255,255,0.3)" }}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    background: "var(--bloom-yellow)",
                    transition: "width 0.4s",
                  }}
                />
              </div>
            </div>
          </BloomCard>
        )}

        {/* めやす項目リスト */}
        <div className="mt-3 space-y-2.5">
          {filteredMilestones.map((ms) => {
            const isRecorded = achievedIds.has(ms.id);
            return (
              <BloomCard
                key={ms.id}
                soft
                color={isRecorded ? "var(--bloom-primary-soft)" : "#fff"}
                className="cursor-pointer"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/milestones/${ms.id}`)}
                  className="block w-full p-3 text-left"
                >
                  <div className="flex items-start gap-2.5">
                    {/* 状態アイコン */}
                    <div className="shrink-0" style={{ marginTop: 2 }}>
                      {isRecorded ? (
                        <div
                          className="bloom-border font-hand flex items-center justify-center rounded-full"
                          style={{
                            width: 26,
                            height: 26,
                            background: "var(--bloom-primary)",
                            color: "#fff",
                            fontSize: 14,
                          }}
                        >
                          ✓
                        </div>
                      ) : (
                        <div
                          className="rounded-full"
                          style={{
                            width: 26,
                            height: 26,
                            border: "2px dashed var(--bloom-line)",
                            background: "#fff",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-hand"
                        style={{ fontSize: 15, color: "var(--bloom-ink)" }}
                      >
                        {ms.title}
                      </div>
                      {ms.description && (
                        <div
                          className="mt-1 text-[12px]"
                          style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.5 }}
                        >
                          {ms.description}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className="font-hand inline-block rounded-lg px-2 py-0.5"
                          style={{
                            background: "var(--bloom-yellow)",
                            color: "var(--bloom-ink)",
                            fontSize: 12,
                            border: "1.5px solid var(--bloom-line)",
                          }}
                        >
                          {ms.category}
                        </span>
                        <span
                          className="inline-block rounded-lg px-2 py-0.5"
                          style={{
                            background: "#fff",
                            color: "var(--bloom-ink-soft)",
                            fontSize: 12,
                            border: "1.5px solid var(--bloom-line-soft)",
                          }}
                        >
                          {ms.age_hint}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </BloomCard>
            );
          })}
        </div>
      </main>

      <BloomBottomNav current="milestones" />
    </div>
  );
}
