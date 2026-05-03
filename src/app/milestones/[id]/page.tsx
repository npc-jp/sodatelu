"use client";

// マイルストーン詳細ページ — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom-extra.jsx の BloomMilestoneDetail
// 達成ヒーロー / レンジバー (MilestoneStats) / 「みんなのきろく」 / 個人差ノート / CTA
//
// 設計鉄則 (docs/product-vision.md ver.2):
//   - アプリは観察者であって医者ではない
//   - 「早い・遅い・標準・平均」NGワード禁止
//   - 「うちの子のペース」中心
//
// Next.js 16 では params が Promise なので React.use() でアンラップ

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { MILESTONES } from "@/lib/milestones-data";
import { calcCurrentMonths } from "@/lib/age-range";
import { getRecordsByChild, type GrowthRecord } from "@/lib/firestore";
import MilestoneStats from "@/components/milestone-stats";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomCard from "@/components/bloom-card";
import { Heart, PottedPlant, Sparkle, Sprout } from "@/components/illustrations";

type PageProps = {
  // Next.js 16 では params は Promise
  params: Promise<{ id: string }>;
};

export default function MilestoneDetailPage({ params }: PageProps) {
  // React.use() で Promise をアンラップ
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { selectedChild: child, loading: childLoading } = useChild();

  const milestone = MILESTONES.find((m) => m.id === id);

  const [matchedRecords, setMatchedRecords] = useState<
    (GrowthRecord & { id: string })[]
  >([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  useEffect(() => {
    if (!child || !milestone) {
      setRecordsLoading(false);
      return;
    }
    setRecordsLoading(true);
    getRecordsByChild(child.id)
      .then((recs) => {
        const matched = recs.filter(
          (r) => r.milestone_id && r.milestone_id.id === milestone.id
        );
        setMatchedRecords(matched);
      })
      .finally(() => setRecordsLoading(false));
  }, [child, milestone]);

  if (authLoading || childLoading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--bloom-bg)" }}
      >
        <Sprout size={42} color="var(--bloom-primary)" />
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  // マイルストーンIDが見つからない場合
  if (!milestone) {
    return (
      <div
        className="flex h-full flex-col pb-24"
        style={{ background: "var(--bloom-bg)" }}
      >
        <BloomAppHeader title="めやす詳細" showBack />
        <main className="flex-1 px-4 pt-5">
          <BloomCard soft className="p-6 text-center">
            <p className="text-sm" style={{ color: "var(--bloom-ink-soft)" }}>
              このマイルストーンは見つかりませんでした。
            </p>
            <button
              type="button"
              onClick={() => router.push("/milestones")}
              className="bloom-border bloom-shadow font-hand mt-4 rounded-xl px-5 py-2.5 text-white"
              style={{
                background: "var(--bloom-primary)",
                fontSize: 13,
                letterSpacing: "0.08em",
              }}
            >
              一覧に戻る
            </button>
          </BloomCard>
        </main>
        <BloomBottomNav current="milestones" />
      </div>
    );
  }

  const currentMonths = child
    ? calcCurrentMonths(child.birth_date.toDate())
    : undefined;

  // 記録があるか（達成済み判定）
  const isAchieved = matchedRecords.length > 0;
  const firstRecord = matchedRecords[0];

  return (
    <div
      className="flex h-full flex-col pb-24"
      style={{ background: "var(--bloom-bg)" }}
    >
      {/* ヘッダー: Sparkle 付き */}
      <BloomAppHeader
        title={milestone.title}
        subtitle={`${milestone.age_hint} ・ ${milestone.category}`}
        showBack
        rightSlot={<Sparkle size={16} color="var(--bloom-accent)" />}
      />

      <main className="flex-1 overflow-y-auto px-4 pt-3.5 pb-10">
        {/* 達成ヒーロー（達成済みの時だけ緑カード、未達成は通常ヘッダ） */}
        {isAchieved ? (
          <BloomCard
            color="var(--bloom-primary)"
            className="relative overflow-hidden p-4 text-white"
          >
            <div
              className="absolute pointer-events-none"
              style={{ right: -10, bottom: -10, opacity: 0.2 }}
            >
              <PottedPlant size={90} />
            </div>
            <div className="relative">
              <div className="text-[12px] opacity-90">
                {firstRecord.recorded_date.toDate().toLocaleDateString("ja-JP")} にきろくしました
              </div>
              <div className="font-hand mt-1" style={{ fontSize: 22 }}>
                できました ✦
              </div>
              {milestone.description && (
                <div
                  className="mt-1.5 text-[12px] opacity-95"
                  style={{ lineHeight: 1.5 }}
                >
                  {milestone.description}
                </div>
              )}
            </div>
          </BloomCard>
        ) : (
          <BloomCard soft className="p-3.5">
            <div
              className="font-hand"
              style={{ fontSize: 16, color: "var(--bloom-ink)" }}
            >
              {milestone.title}
            </div>
            {milestone.description && (
              <div
                className="mt-1 text-[13px]"
                style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.6 }}
              >
                {milestone.description}
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
                {milestone.category}
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
                {milestone.age_hint}
              </span>
            </div>
          </BloomCard>
        )}

        {/* めやす範囲 + 2層並列統計（既存コンポーネント維持・slate トーンだが情報量重視） */}
        <div className="mt-5">
          <MilestoneStats
            ageHint={milestone.age_hint}
            evidence={milestone.evidence}
            currentMonths={currentMonths}
          />
        </div>

        {/* みんなのきろく（コミュニティ準備中プレースホルダ） */}
        <BloomCard
          soft
          color="var(--bloom-primary-soft)"
          className="mt-5 p-3.5"
        >
          <div className="flex items-center gap-2">
            <Heart size={16} color="var(--bloom-accent)" />
            <div
              className="font-hand"
              style={{ fontSize: 13, color: "var(--bloom-ink)" }}
            >
              みんなのきろく
            </div>
            <div
              className="ml-auto rounded-md px-1.5 py-0.5"
              style={{
                background: "var(--bloom-yellow)",
                fontSize: 12,
                color: "var(--bloom-ink)",
                border: "1.5px solid var(--bloom-line)",
              }}
            >
              準備中
            </div>
          </div>
          <div
            className="mt-1.5 text-[12px]"
            style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.6 }}
          >
            sodateluのご家族のきろくから、平均的な時期を表示する予定です。
          </div>
        </BloomCard>

        {/* 個人差ノート（dashed 枠） */}
        <div
          className="mt-4 rounded-[14px] px-3.5 py-3"
          style={{
            background: "#fff",
            border: "1.5px dashed var(--bloom-line-soft)",
          }}
        >
          <div
            className="font-hand mb-1"
            style={{ fontSize: 13, color: "var(--bloom-ink)" }}
          >
            ● 個人差について
          </div>
          <div
            className="text-[12px]"
            style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
          >
            時期はあくまで目安です。お子さまひとりひとりのペースを大切にしてください。
          </div>
        </div>

        {/* この子の記録一覧 */}
        {recordsLoading ? null : matchedRecords.length > 0 ? (
          <div className="mt-5">
            <h2
              className="font-hand mb-2"
              style={{ fontSize: 14, color: "var(--bloom-ink)" }}
            >
              {child ? `${child.name}のきろく` : "うちの子のきろく"}
            </h2>
            <div className="space-y-2">
              {matchedRecords.map((rec) => (
                <BloomCard key={rec.id} soft className="cursor-pointer">
                  <button
                    type="button"
                    onClick={() => router.push(`/record?id=${rec.id}`)}
                    className="block w-full p-3 text-left"
                  >
                    <div
                      className="font-hand truncate"
                      style={{ fontSize: 14, color: "var(--bloom-ink)" }}
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
          </div>
        ) : null}

        {/* CTA: このめやすで きろくする */}
        <button
          type="button"
          onClick={() =>
            router.push(`/write?childId=${child?.id ?? ""}`)
          }
          className="bloom-border bloom-shadow font-hand mt-5 w-full rounded-[14px] py-3.5 text-white"
          style={{
            background: "var(--bloom-accent)",
            fontSize: 15,
            letterSpacing: "0.08em",
          }}
        >
          このめやすで きろくする ✦
        </button>
      </main>

      <BloomBottomNav current="milestones" />
    </div>
  );
}
