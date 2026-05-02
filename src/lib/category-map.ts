// マイルストーンのデータ側カテゴリ（身体/言語/社会性/認知/人生節目）と
// アプリのカテゴリ（できた/おめでとう/始めた...）の対応をまとめる。
// 複数画面で同じロジックを使うため、ここに集約する（write・record で重複していたものを統合）。
import type { MilestoneCategory } from "./firestore";

// マイルストーンのデータ上カテゴリ → アプリのMilestoneCategory に変換する
// 「人生節目」（誕生日・入学など）は「おめでとう」に揃える方針
// それ以外は「できた」を初期値にする
export function milestoneToAppCategory(msCategory: string): MilestoneCategory {
  switch (msCategory) {
    case "人生節目":
      return "おめでとう";
    default:
      return "できた";
  }
}
