// 年齢フェーズ定義
// sodateluのスコープ: 0歳〜12歳（小学校卒業）まで
// 思春期以降は別プロダクトとしてスコープ外（docs/product-vision.md ver.2 を参照）
//
// 生年月日から現在のフェーズを判定する

export type Phase = {
  number: number;
  name: string;
  ageRange: string;
  emoji: string;
};

export const PHASES: Phase[] = [
  { number: 1, name: "誕生・乳児期", ageRange: "0〜1歳", emoji: "👶" },
  { number: 2, name: "よちよち期", ageRange: "1〜3歳", emoji: "🧒" },
  { number: 3, name: "幼児期", ageRange: "3〜6歳", emoji: "👦" },
  { number: 4, name: "小学生期", ageRange: "6〜12歳", emoji: "🎒" },
];

// 生年月日からフェーズを判定
// 12歳以上は Phase 4 扱い（sodateluのスコープ最終フェーズ）
export function getPhase(birthDate: Date): Phase {
  const now = new Date();
  const ageInYears =
    (now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (ageInYears < 1) return PHASES[0];
  if (ageInYears < 3) return PHASES[1];
  if (ageInYears < 6) return PHASES[2];
  return PHASES[3];
}
