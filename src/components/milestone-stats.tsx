"use client";

// 統計2層並列表示
//
// 役割: 1つのマイルストーンについて、2種類の参考情報を上下に並べて表示する。
//   1) WHO/医学のめやす（age_hint + evidence ラベルから生成）
//   2) sodateluみんなの記録（コミュニティ集計データ・現状はプレースホルダ）
//
// 設計鉄則（docs/product-vision.md ver.2）:
//   - 2種類の情報は上書きではなく並列で表示する
//   - 一方の情報がもう片方より信頼できる、という上下関係を作らない
//   - sodateluコミュ統計は実装せずプレースホルダ表示（ユーザー数が増えてからON）
//
// 機能1（めやす範囲）と機能2（2層並列）はこのコンポーネントで一体化している。

import {
  parseAgeHint,
  type AgeRange,
} from "@/lib/age-range";
import MilestoneRangeBar from "./milestone-range-bar";
import Twemoji from "./twemoji";

type Props = {
  /** マイルストーンの age_hint 文字列 */
  ageHint: string;
  /** 根拠レベル（WHO基準/発達研究/sodatelu独自） */
  evidence: "who" | "research" | "sodatelu";
  /** 子どもの現在月齢（バー上の縦線位置に使う） */
  currentMonths?: number;
};

// 根拠ラベルを「出典の正式名称」っぽく表示するためのテーブル
// docs/research-data-sources.md と整合させる
const EVIDENCE_INFO: Record<
  Props["evidence"],
  { title: string; sources: string }
> = {
  who: {
    title: "WHO・医学のめやす",
    sources: "出典: WHO Motor Development Study / 厚労省 乳幼児身体発育調査 ほか",
  },
  research: {
    title: "発達研究のめやす",
    sources: "出典: 発達心理学・小児科学の研究データ（CDC Milestones ほか）",
  },
  sodatelu: {
    title: "sodateluからのめやす",
    sources: "出典: sodatelu独自の編集（人生節目・文化的な目安）",
  },
};

export default function MilestoneStats({ ageHint, evidence, currentMonths }: Props) {
  const range: AgeRange | null = parseAgeHint(ageHint);
  const evidenceInfo = EVIDENCE_INFO[evidence];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-700">めやす範囲</h2>
        <p className="mt-1 text-xs text-slate-500">
          時期はあくまで参考です。お子さまのペースで大丈夫。
        </p>
      </div>

      {/* 1段目: WHO/医学・研究のめやす */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Twemoji emoji="📘" size={18} ariaLabel="" />
          <h3 className="text-sm font-bold text-slate-700">
            {evidenceInfo.title}
          </h3>
        </div>

        {range ? (
          <>
            <MilestoneRangeBar range={range} currentMonths={currentMonths} />
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              {evidenceInfo.sources}
            </p>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-slate-500">
            このマイルストーンは「{ageHint}」を目安にしています。
            個人差が大きいので、お子さまのペースを見守りましょう。
          </p>
        )}
      </div>

      {/* 2段目: sodateluコミュニティ統計（準備中プレースホルダ） */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Twemoji emoji="🌱" size={18} ariaLabel="" />
          <h3 className="text-sm font-bold text-slate-600">
            sodateluみんなの記録
          </h3>
          <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
            準備中
          </span>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          sodateluを使っているご家族の記録から、
          みんなのペースをまもなくお届けする予定です。
        </p>
      </div>

      {/* 末尾の安心フッター（NGワード回避と「ペース」言語の徹底） */}
      <p className="px-1 text-[11px] leading-relaxed text-slate-400">
        ※ 範囲はあくまで目安です。個人差があるので、
        お子さまのペースで大丈夫。気になることがあれば、
        かかりつけの先生に相談してみてくださいね。
      </p>
    </section>
  );
}
