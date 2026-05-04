"use client";

// 成長のめやす紐付けピッカー
// write画面・record画面の両方で使う共通コンポーネント
//
// 設計の鍵:
// - 全56項目を「フェーズ別グループ化」で表示（フェーズで絞り込まない）
//   → 早熟・ゆっくり、両方の個性に対応するため
// - 紐付け済みのめやすは選択肢から非表示（1度限りの記録が本質）
// - record画面の編集時、自分自身の紐付けだけは除外しない（編集対象を残す）
//
// 「ドキッとさせない」鉄則:
// - 「達成」「達成済み」NG → 「きろく済み」のニュートラル表現
// - 数で煽らない（「3/16達成」のような表示はしない）
// - 全項目きろく済みフェーズには温かいメッセージ

import { useMemo } from "react";
import { MILESTONES, type MilestoneData } from "@/lib/milestones-data";
import { PHASES } from "@/lib/phases";
import Twemoji from "@/components/twemoji";

type Props = {
  /** 紐付け済みのマイルストーンID一覧（選択肢から除外する） */
  excludedMilestoneIds: string[];
  /** 項目をクリックしたときに呼ばれる */
  onSelect: (milestone: MilestoneData) => void;
};

export default function MilestonePicker({
  excludedMilestoneIds,
  onSelect,
}: Props) {
  // 除外IDセットをメモ化（each render での再生成を避ける）
  const excludedSet = useMemo(
    () => new Set(excludedMilestoneIds),
    [excludedMilestoneIds]
  );

  return (
    <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-100 bg-white">
      {PHASES.map((phase) => {
        // このフェーズに属する全マイルストーン
        const phaseAll = MILESTONES.filter((m) => m.phase === phase.number);
        // 除外していない（=まだきろくされていない）項目
        const available = phaseAll.filter((m) => !excludedSet.has(m.id));

        return (
          <section
            key={phase.number}
            className="border-b border-slate-100 last:border-b-0"
          >
            {/* フェーズ見出し */}
            <header className="sticky top-0 z-10 flex items-center gap-2 bg-amber-50/95 px-4 py-2 backdrop-blur-sm">
              <Twemoji emoji={phase.emoji} size={16} ariaLabel="" />
              <h3 className="text-[0.8125rem] font-bold text-amber-700">
                {phase.ageRange}（{phase.name}）
              </h3>
            </header>

            {/* 中身: 残っている項目があれば一覧、なければ温かいメッセージ */}
            {available.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-4 text-[0.8125rem] text-slate-400">
                <Twemoji emoji="🌱" size={14} ariaLabel="" />
                <span>すべてきろく済み</span>
              </div>
            ) : (
              <ul>
                {available.map((ms) => (
                  <li key={ms.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(ms)}
                      className="flex w-full items-start gap-3 border-t border-slate-50 px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-amber-50"
                    >
                      <span className="mt-0.5 font-mono text-[0.8125rem] text-slate-400">
                        {ms.id}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          {ms.title}
                        </p>
                        <p className="text-[0.8125rem] text-slate-400">
                          {ms.age_hint} ・ {ms.category}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
