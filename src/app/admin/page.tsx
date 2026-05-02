"use client";

// 管理画面: マイルストーン投入 + プラン切り替え
// NEXT_PUBLIC_ADMIN_UID で許可されたUIDのみ閲覧可。それ以外は /home にリダイレクト
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { seedMilestones } from "@/lib/seed-milestones";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plan-context";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// 許可UID（カンマ区切りで複数指定可）
const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { plan, isPremium, refreshPlan } = usePlan();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  // 認証ガード: ログイン前 → /login、許可UID以外 → /home
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (ADMIN_UIDS.length === 0 || !ADMIN_UIDS.includes(user.uid)) {
      router.replace("/home");
      return;
    }
    setAuthorized(true);
  }, [user, authLoading, router]);

  // 認証チェック中・未許可の間は何も表示しない
  if (authLoading || !authorized) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  async function handleSeed() {
    setLoading(true);
    setStatus("投入中...");
    try {
      await seedMilestones();
      setStatus("✅ 50項目のマイルストーンを投入しました！");
    } catch (err) {
      console.error(err);
      setStatus("❌ エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function togglePlan() {
    if (!user) return;
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const familyRef = userSnap.data()?.family_id;
      if (!familyRef) {
        setStatus("❌ ファミリーが見つかりません");
        return;
      }
      const newPlan = isPremium ? "free" : "premium";
      await updateDoc(familyRef, { plan: newPlan });
      await refreshPlan();
      setStatus(`✅ プランを ${newPlan} に変更しました`);
    } catch (err) {
      console.error(err);
      setStatus("❌ プラン変更に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-slate-800">管理画面</h1>
        <p className="mt-2 text-sm text-slate-500">開発用ツール</p>

        {/* プラン切り替え */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-700">プラン管理</h2>
          <p className="mt-2 text-sm">
            現在のプラン：
            <span className={`ml-1 rounded-full px-3 py-1 text-sm font-bold ${
              isPremium
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}>
              {plan === "premium" ? "プレミアム" : "無料"}
            </span>
          </p>
          <button
            onClick={togglePlan}
            disabled={loading}
            className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 ${
              isPremium
                ? "bg-slate-500 hover:bg-slate-600"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {isPremium ? "無料プランに戻す" : "プレミアムにアップグレード"}
          </button>
        </div>

        {/* マイルストーン投入 */}
        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-700">マイルストーン投入</h2>
          <p className="mt-1 text-sm text-slate-500">
            WHO基準の公式マイルストーン50項目をFirestoreに登録します
          </p>
          <button
            onClick={handleSeed}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? "処理中..." : "マイルストーンを投入する"}
          </button>
        </div>

        {status && (
          <p className="mt-4 text-sm text-slate-600">{status}</p>
        )}
      </div>
    </div>
  );
}
