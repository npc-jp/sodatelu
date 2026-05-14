// めやすタブで使うタイムライン構築ロジック
// 仕様書: growth-feature-spec-v1-2026-05-14.md A-2 / B-3
//
// 「成長の目安（milestones）」と「予防接種（vaccinations マスタ）」を
// 月齢順に時系列マージしたタイムラインを返す。
//
// 副ソート:
//   1. 同月齢の場合は milestone を先、次に vaccination
//   2. 同月齢・同タイプの場合は vaccineId アルファベット順
//
// VaccinationRecord（ユーザーの接種記録）はここでは扱わず、UI 側で
// (vaccine_id, dose_number) → record の Map を別途構築して引き当てる設計。

import type { MilestoneData } from "./milestones-data";

// マスタJSON `vaccination-schedule.json` の型定義
export type VaccineDose = {
  doseNumber: number;
  standardAgeMonthsFrom: number;
  standardAgeMonthsTo: number;
  note: string;
};

export type VaccineMaster = {
  id: string;
  name: string;
  nameShort: string;
  category: string;
  description: string;
  doses: VaccineDose[];
};

export type VaccineSchedule = {
  version: string;
  scope: string;
  license: string;
  note?: string;
  vaccines: VaccineMaster[];
};

// タイムライン1項目の型（Union）
export type TimelineItem =
  | {
      type: "milestone";
      months: number;
      data: MilestoneData;
    }
  | {
      type: "vaccination";
      months: number;
      vaccineId: string;
      doseNumber: number;
      vaccine: VaccineMaster;
      dose: VaccineDose;
    };

// 「age_hint」文字列から月齢（数値）を推定
// milestones-data.ts の age_hint は「生後3〜4ヶ月」「2〜3歳」「12歳」など多様な表記
// マイルストーンマスタには厳密な months_from_birth フィールドが無いため、
// 文字列から最大公約数的に「下限値」を抽出する。
//
// マッチ規則:
//   - 「生後N〜Mヶ月」「生後Nヶ月」「Nヶ月」→ N
//   - 「N〜M歳」「N歳」「N歳M月」→ N * 12 (+ M)
//   - 「生後N年」「N年」→ N * 12
//   - 「生後N日」→ N / 30 で月換算
//   - マッチ不能なら 0 を返す
export function parseAgeHintToMonths(ageHint: string): number {
  if (!ageHint) return 0;
  const hint = ageHint.replace(/\s+/g, "");

  // 「生後N日」「N日」（M-016 の "生後365日" 対策）
  const dayMatch = hint.match(/(\d+)日/);
  if (dayMatch) {
    return Math.floor(parseInt(dayMatch[1], 10) / 30);
  }

  // 「N歳M月」「N歳Mヶ月」（細粒度）
  const yrMonthMatch = hint.match(/(\d+)歳(\d+)(?:ヶ?月|ヵ?月)/);
  if (yrMonthMatch) {
    return parseInt(yrMonthMatch[1], 10) * 12 + parseInt(yrMonthMatch[2], 10);
  }

  // 「N〜M歳」「N歳」
  const yearMatch = hint.match(/(\d+)(?:〜\d+)?歳/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10) * 12;
  }

  // 「生後N年」「N年」
  const yearMatch2 = hint.match(/(\d+)年/);
  if (yearMatch2) {
    return parseInt(yearMatch2[1], 10) * 12;
  }

  // 「生後N〜Mヶ月」「Nヶ月」「N〜Mか月」など
  const monthMatch = hint.match(/(\d+)(?:〜\d+)?(?:ヶ月|ヵ月|か月|月)/);
  if (monthMatch) {
    return parseInt(monthMatch[1], 10);
  }

  // 「生後N〜M週」など（細かい単位の保険）
  const weekMatch = hint.match(/(\d+)(?:〜\d+)?週/);
  if (weekMatch) {
    return Math.floor((parseInt(weekMatch[1], 10) * 7) / 30);
  }

  return 0;
}

// タイムライン構築のメイン関数
// milestones は呼び出し側で phase などのフィルタを掛けた配列を渡してOK
export function buildTimeline(input: {
  milestones: MilestoneData[];
  schedule: VaccineSchedule;
}): TimelineItem[] {
  const { milestones, schedule } = input;

  // 1. milestones を TimelineItem に変換
  const milestoneItems: TimelineItem[] = milestones.map((m) => ({
    type: "milestone",
    months: parseAgeHintToMonths(m.age_hint),
    data: m,
  }));

  // 2. vaccination schedule の各 dose を TimelineItem に展開
  const vaccinationItems: TimelineItem[] = schedule.vaccines.flatMap((v) =>
    v.doses.map((d) => ({
      type: "vaccination" as const,
      months: d.standardAgeMonthsFrom,
      vaccineId: v.id,
      doseNumber: d.doseNumber,
      vaccine: v,
      dose: d,
    }))
  );

  // 3. マージしてソート
  const merged: TimelineItem[] = [...milestoneItems, ...vaccinationItems];
  merged.sort((a, b) => {
    // 主ソート: months 昇順
    if (a.months !== b.months) return a.months - b.months;
    // 副ソート1: milestone を先
    if (a.type !== b.type) return a.type === "milestone" ? -1 : 1;
    // 副ソート2: 同タイプは ID/vaccineId 順
    if (a.type === "milestone" && b.type === "milestone") {
      return a.data.id.localeCompare(b.data.id);
    }
    if (a.type === "vaccination" && b.type === "vaccination") {
      if (a.vaccineId !== b.vaccineId) {
        return a.vaccineId.localeCompare(b.vaccineId);
      }
      return a.doseNumber - b.doseNumber;
    }
    return 0;
  });

  return merged;
}

// 子供の現在月齢から接種状態を判定
// 仕様書 A-2 のスタイリング3区分 + 1（完了済み）に対応
//   - "next"      : 標準接種月齢まで残り 0〜2ヶ月（次の候補）
//   - "upcoming"  : 標準接種月齢未到達（これから）
//   - "completed" : ユーザーが完了マーク済み
//   - "overdue"   : 標準接種月齢を大幅（3ヶ月以上）に過ぎている・未接種
//   - "current"   : 標準接種月齢範囲内・未接種（普通の表示）
export type VaccinationStatus =
  | "completed"
  | "next"
  | "current"
  | "upcoming"
  | "overdue";

export function getVaccinationStatus(args: {
  currentAgeMonths: number;
  standardAgeMonthsFrom: number;
  standardAgeMonthsTo: number;
  isCompleted: boolean;
}): VaccinationStatus {
  const { currentAgeMonths, standardAgeMonthsFrom, standardAgeMonthsTo, isCompleted } = args;
  if (isCompleted) return "completed";
  // 標準月齢の上限から3ヶ月以上経過している場合は overdue
  if (currentAgeMonths > standardAgeMonthsTo + 3) return "overdue";
  // 標準月齢範囲内
  if (
    currentAgeMonths >= standardAgeMonthsFrom &&
    currentAgeMonths <= standardAgeMonthsTo
  ) {
    return "current";
  }
  // 残り0〜2ヶ月で次の候補
  if (
    currentAgeMonths < standardAgeMonthsFrom &&
    standardAgeMonthsFrom - currentAgeMonths <= 2
  ) {
    return "next";
  }
  return "upcoming";
}

// 月齢を「生後Nヶ月」「N歳Mヶ月」表記にする
export function formatMonthsLabel(months: number): string {
  if (months <= 0) return "生まれてすぐ";
  if (months < 12) return `生後${months}ヶ月頃`;
  const years = Math.floor(months / 12);
  const remain = months % 12;
  if (remain === 0) return `${years}歳頃`;
  return `${years}歳${remain}ヶ月頃`;
}
