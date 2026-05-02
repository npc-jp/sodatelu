// マイルストーンマスターデータをFirestoreに投入するスクリプト
// ブラウザのコンソールから実行する用途
// 使い方: 開発画面で seedMilestones() を呼び出す
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MILESTONES } from "./milestones-data";

export async function seedMilestones() {
  console.log(`${MILESTONES.length}件のマイルストーンを投入開始...`);

  for (const milestone of MILESTONES) {
    await setDoc(doc(db, "milestones", milestone.id), {
      title: milestone.title,
      title_en: milestone.title_en,
      category: milestone.category,
      phase: milestone.phase,
      age_hint: milestone.age_hint,
      is_premium: milestone.is_premium,
    });
    console.log(`✅ ${milestone.id}: ${milestone.title}`);
  }

  console.log("🌱 全マイルストーンの投入が完了しました！");
}
