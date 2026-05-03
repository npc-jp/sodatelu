// プラン判定ユーティリティ
// families.plan フィールドで無料/有料を判定する。
// users.beta_tester === true のユーザーは永久にプレミアム扱い（βテスター特典）
import { doc, getDoc, type DocumentReference } from "firebase/firestore";
import { db } from "./firebase";
import type { Family } from "./firestore";

export type Plan = "free" | "premium";

// ユーザーのプランを取得（βテスターはpremium扱い）
export async function getUserPlan(userId: string): Promise<Plan> {
  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) return "free";

  // βテスターは永久プレミアム
  if (userSnap.data().beta_tester === true) return "premium";

  // family_id は DocumentReference<Family> として扱う
  const familyRef = userSnap.data().family_id as DocumentReference<Family> | null;
  if (!familyRef) return "free";

  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) return "free";

  return familySnap.data().plan === "premium" ? "premium" : "free";
}

// プランをアップグレード（管理画面用）
export async function upgradePlan(familyId: string): Promise<void> {
  const { updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, "families", familyId), { plan: "premium" });
}

// 無料版の制限
export const FREE_LIMITS = {
  categories: 3,       // カテゴリ3種まで
  childrenCount: 2,    // 子ども2人まで
  hasHandover: false,  // 引き渡し機能なし
  hasCompare: false,   // Compare機能なし
  hasPrivacy: false,   // プライバシー設定なし
};
