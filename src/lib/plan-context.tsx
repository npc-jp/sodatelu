"use client";

// プラン状態をアプリ全体で共有するコンテキスト
// onSnapshot で families ドキュメントをリアルタイム監視するため、
// /admin でプラン変更すると全画面に即座に反映される
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  doc,
  getDocFromServer,
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { useAuth } from "./auth-context";
import { db } from "./firebase";
import { getUserPlan, type Plan } from "./plan";

type PlanContextType = {
  plan: Plan;
  isPremium: boolean;
  refreshPlan: () => Promise<void>;
  loading: boolean;
};

const PlanContext = createContext<PlanContextType>({
  plan: "free",
  isPremium: false,
  refreshPlan: async () => {},
  loading: true,
});

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState(true);
  // βテスター特典（永久プレミアム）。users.beta_tester=true で有効化される
  const [isBetaTester, setIsBetaTester] = useState(false);

  // 手動更新用（admin画面の togglePlan が成功した直後など）
  async function fetchPlan() {
    if (!user) return;
    const p = await getUserPlan(user.uid);
    setPlan(p);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPlan("free");
      setIsBetaTester(false);
      setLoading(false);
      return;
    }

    // family_id を取得 → families ドキュメントを onSnapshot で監視。
    // /admin で plan が変わると即座に反映される。
    // getDocFromServer を使うのは、auth-context 等の pending writes に
    // 引きずられて family_id が見えなくなる問題を回避するため。
    let unsubscribe: Unsubscribe | null = null;
    let cancelled = false;

    (async () => {
      try {
        const userSnap = await getDocFromServer(doc(db, "users", user.uid));
        if (cancelled) return;
        if (!userSnap.exists()) {
          setPlan("free");
          setIsBetaTester(false);
          setLoading(false);
          return;
        }
        const userData = userSnap.data();
        // βテスター特典フラグを反映
        setIsBetaTester(userData.beta_tester === true);
        const rawFamilyId = userData.family_id;
        const isRef = rawFamilyId && typeof rawFamilyId === "object" && "path" in rawFamilyId;
        const familyRef = isRef ? (rawFamilyId as DocumentReference<DocumentData>) : null;
        if (!familyRef) {
          setPlan("free");
          setLoading(false);
          return;
        }
        // families リアルタイム監視
        unsubscribe = onSnapshot(
          familyRef,
          (snap: DocumentSnapshot<DocumentData>) => {
            if (cancelled) return;
            const data = snap.exists() ? (snap.data() as { plan?: string }) : null;
            setPlan(data?.plan === "premium" ? "premium" : "free");
            setLoading(false);
          },
          (err: FirestoreError) => {
            console.error("[plan-context] onSnapshot失敗:", err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("[plan-context] users取得失敗:", err);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [user, authLoading]);

  return (
    <PlanContext.Provider
      value={{
        plan,
        // βテスターは永久プレミアム扱い
        isPremium: plan === "premium" || isBetaTester,
        refreshPlan: fetchPlan,
        loading,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
