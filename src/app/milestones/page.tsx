"use client";

// 成長のめやす一覧ページ
// フェーズごとにマイルストーンを表示する「場所」。
// マイルストーンは課題・チェックリストではなく「これから来るもの／記録できるもの」として中立に見せる。
// 達成率・%表示は使わない（ドキッとさせない設計）。
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getChildrenByUser, getRecordsByChild, type GrowthRecord } from "@/lib/firestore";
import { MILESTONES } from "@/lib/milestones-data";
import { getPhase, PHASES } from "@/lib/phases";
import BottomNav from "@/components/bottom-nav";
import AppHeader from "@/components/app-header";
import Twemoji from "@/components/twemoji";
import { Check } from "lucide-react";

// マイルストーンカテゴリの色
const MS_CATEGORY_COLORS: { [key: string]: string } = {
  身体: "bg-blue-100 text-blue-700",
  言語: "bg-purple-100 text-purple-700",
  社会性: "bg-pink-100 text-pink-700",
  認知: "bg-teal-100 text-teal-700",
  人生節目: "bg-amber-100 text-amber-700",
};

// 根拠ラベルの表示
const EVIDENCE_LABEL: { [key: string]: { text: string; style: string } } = {
  who: { text: "WHO基準", style: "bg-emerald-100 text-emerald-700" },
  research: { text: "発達研究", style: "bg-sky-100 text-sky-700" },
  sodatelu: { text: "sodatelu", style: "bg-amber-100 text-amber-700" },
};

export default function MilestonesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentPhase, setCurrentPhase] = useState(1);
  const [achievedIds, setAchievedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchData() {
      const kids = await getChildrenByUser(user!.uid);
      if (kids.length === 0) {
        setLoading(false);
        return;
      }

      const child = kids[0];
      setChildName(child.name);
      const phase = getPhase(child.birth_date.toDate());
      setCurrentPhase(phase.number);

      // 記録済みマイルストーンを取得（記録にmilestone_idがあるもの）
      const records = await getRecordsByChild(child.id);
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
  }, [user, authLoading]);

  // 選択中フェーズのマイルストーン
  const filteredMilestones = MILESTONES.filter((m) => m.phase === currentPhase);
  const phaseInfo = PHASES[currentPhase - 1];
  // 「記録した数」のカウント（達成度・パーセントとしては使わない）
  const recordedCount = filteredMilestones.filter((m) => achievedIds.has(m.id)).length;

  if (authLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col pb-16">
      {/* ヘッダー: BottomNavタブ画面のため戻るボタンは出さない（履歴依存で挙動が不安定になる） */}
      <AppHeader
        title="成長のめやす"
        subtitle={
          childName ? `${childName}のこれから・きろく` : "これから・きろく"
        }
        subtitlePosition="below"
      />

      {/* フェーズタブ */}
      <div className="overflow-x-auto border-b border-slate-200 bg-white">
        <div className="flex min-w-max px-3">
          {PHASES.map((phase) => (
            <button
              key={phase.number}
              onClick={() => setCurrentPhase(phase.number)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                currentPhase === phase.number
                  ? "border-b-2 border-amber-500 text-amber-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Twemoji emoji={phase.emoji} size={18} ariaLabel="" />
              {phase.ageRange}
            </button>
          ))}
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
        {/* 「めやす」の趣旨説明（ドキッとさせない設計） */}
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          時期はあくまで目安です。早い・遅いではなく、うちの子のペースで進みます。
        </p>

        {/* 凡例 */}
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(EVIDENCE_LABEL).map(([key, val]) => (
            <span key={key} className={`rounded-full px-2.5 py-1 text-xs font-medium ${val.style}`}>
              {val.text}
            </span>
          ))}
        </div>

        {/* フェーズ情報（達成度バー・%は表示しない） */}
        {phaseInfo && (
          <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Twemoji emoji={phaseInfo.emoji} size={22} ariaLabel="" />
                  {phaseInfo.name}
                </p>
                <p className="text-sm text-slate-500">{phaseInfo.ageRange}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">
                  {recordedCount > 0 ? (
                    <>
                      <span className="text-base font-bold text-amber-500">{recordedCount}</span>
                      <span className="ml-1">件 きろく済み</span>
                    </>
                  ) : (
                    <span className="text-slate-400">これからのきろく</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* マイルストーン一覧（タップでめやす詳細ページへ遷移） */}
        <div className="space-y-3">
          {filteredMilestones.map((ms) => {
            const isRecorded = achievedIds.has(ms.id);
            return (
              <button
                key={ms.id}
                onClick={() => router.push(`/milestones/${ms.id}`)}
                className={`w-full rounded-2xl p-4 text-left shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 ${
                  isRecorded ? "border border-amber-200 bg-amber-50" : "bg-white"
                }`}
                aria-label={`${ms.title}の詳細を見る`}
              >
                <div className="flex items-start gap-3">
                  {/* 状態アイコン: 記録あり=色付き丸 / 未記録=空の丸 */}
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      isRecorded
                        ? "bg-amber-400 text-white"
                        : "border-2 border-slate-200"
                    }`}
                    aria-label={isRecorded ? "記録あり" : "これから"}
                  >
                    {isRecorded && (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className={`font-medium ${isRecorded ? "text-amber-900" : "text-slate-800"}`}>
                      {ms.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {ms.title_en}
                    </p>
                    {/* 補足説明文 */}
                    {ms.description && (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                        {ms.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        MS_CATEGORY_COLORS[ms.category] || "bg-slate-100 text-slate-600"
                      }`}>
                        {ms.category}
                      </span>
                      {/* 根拠ラベル */}
                      {EVIDENCE_LABEL[ms.evidence] && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          EVIDENCE_LABEL[ms.evidence].style
                        }`}>
                          {EVIDENCE_LABEL[ms.evidence].text}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        めやす: {ms.age_hint}
                      </span>
                    </div>
                  </div>

                  {/* 詳細ページへの誘導アイコン */}
                  <span className="mt-1 text-slate-300" aria-hidden>
                    ›
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <BottomNav current="milestones" />
    </div>
  );
}
