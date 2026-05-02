"use client";

// マイルストーン詳細ページ
//
// 役割: 1つのマイルストーンについて、めやす範囲と2層並列の統計情報を表示する。
//   - URL: /milestones/{milestoneId}（例: /milestones/M-014）
//   - 機能1: めやす範囲バー（横軸0〜144ヶ月）
//   - 機能2: 2層並列表示（WHO/医学 + sodateluコミュ準備中）
//
// 設計鉄則（docs/product-vision.md ver.2）:
//   - アプリは観察者であって医者ではない
//   - 「早い・遅い・標準・平均」のNGワードは絶対使わない
//   - 「うちの子のペース」「個人差がある」を中心言語にする
//   - アラートは出さない（B方式・能動的に見にきた人だけが見る）
//
// 注意: Next.js 16 では動的ルートの params が Promise になっている。
// "use client" コンポーネントから扱うため React.use() でアンラップする。

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { MILESTONES } from "@/lib/milestones-data";
import { calcCurrentMonths } from "@/lib/age-range";
import { getRecordsByChild, type GrowthRecord } from "@/lib/firestore";
import MilestoneStats from "@/components/milestone-stats";
import BottomNav from "@/components/bottom-nav";
import AppHeader from "@/components/app-header";

// 一覧と同じスタイルテーブル（共通化候補だが現状は重複維持で安全側）
const MS_CATEGORY_COLORS: { [key: string]: string } = {
  身体: "bg-blue-100 text-blue-700",
  言語: "bg-purple-100 text-purple-700",
  社会性: "bg-pink-100 text-pink-700",
  認知: "bg-teal-100 text-teal-700",
  人生節目: "bg-amber-100 text-amber-700",
};

const EVIDENCE_LABEL: { [key: string]: { text: string; style: string } } = {
  who: { text: "WHO基準", style: "bg-emerald-100 text-emerald-700" },
  research: { text: "発達研究", style: "bg-sky-100 text-sky-700" },
  sodatelu: { text: "sodatelu", style: "bg-amber-100 text-amber-700" },
};

type PageProps = {
  // Next.js 16 では params は Promise
  params: Promise<{ id: string }>;
};

export default function MilestoneDetailPage({ params }: PageProps) {
  // React.use() で Promise をアンラップ（"use client"内で安全に扱う）
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { selectedChild: child, loading: childLoading } = useChild();

  // 該当マイルストーンを検索
  const milestone = MILESTONES.find((m) => m.id === id);

  // この子どもの記録のうち、このマイルストーンに紐付いたものを取得
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
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  // マイルストーンIDが見つからない場合（リンク切れ・削除済み等）
  if (!milestone) {
    return (
      <div className="flex h-full flex-col pb-16">
        <AppHeader title="めやす詳細" showBack onBack={() => router.back()} />
        <main className="flex-1 px-5 pt-8">
          <p className="text-sm text-slate-500">
            このマイルストーンは見つかりませんでした。
          </p>
          <button
            onClick={() => router.push("/milestones")}
            className="mt-4 rounded-full bg-amber-500 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-amber-600"
          >
            一覧に戻る
          </button>
        </main>
        <BottomNav current="milestones" />
      </div>
    );
  }

  // 子どもの現在月齢（バーの縦線に使う）
  const currentMonths = child
    ? calcCurrentMonths(child.birth_date.toDate())
    : undefined;

  return (
    <div className="flex h-full flex-col bg-slate-50 pb-16">
      {/* ヘッダー */}
      <AppHeader
        title={milestone.title}
        subtitle="めやす詳細"
        showBack
        onBack={() => router.back()}
      />

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
        {/* マイルストーン情報カード */}
        <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-base font-bold text-slate-800">{milestone.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{milestone.title_en}</p>
          {milestone.description && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {milestone.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                MS_CATEGORY_COLORS[milestone.category] ||
                "bg-slate-100 text-slate-600"
              }`}
            >
              {milestone.category}
            </span>
            {EVIDENCE_LABEL[milestone.evidence] && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  EVIDENCE_LABEL[milestone.evidence].style
                }`}
              >
                {EVIDENCE_LABEL[milestone.evidence].text}
              </span>
            )}
            <span className="text-xs text-slate-400">
              めやす: {milestone.age_hint}
            </span>
          </div>
        </div>

        {/* 機能1+2: めやす範囲 + 2層並列統計 */}
        <MilestoneStats
          ageHint={milestone.age_hint}
          evidence={milestone.evidence}
          currentMonths={currentMonths}
        />

        {/* この子の記録一覧（あれば） */}
        <section className="mt-6">
          <h2 className="mb-2 text-base font-bold text-slate-700">
            {child ? `${child.name}のきろく` : "うちの子のきろく"}
          </h2>
          {recordsLoading ? (
            <p className="rounded-2xl bg-white p-4 text-xs text-slate-400 shadow-sm">
              読み込み中...
            </p>
          ) : matchedRecords.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs leading-relaxed text-slate-500">
                このめやすにひもづいた記録はまだありません。
                その瞬間が来たら、記録してみてくださいね。
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {matchedRecords.map((rec) => (
                <li key={rec.id}>
                  <button
                    onClick={() => router.push(`/record?id=${rec.id}`)}
                    className="flex w-full items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition-colors hover:bg-slate-50"
                  >
                    {rec.photo_url && (
                      <img
                        src={rec.photo_url}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {rec.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {rec.recorded_date.toDate().toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                    <span className="mt-1 text-slate-300">›</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <BottomNav current="milestones" />
    </div>
  );
}
