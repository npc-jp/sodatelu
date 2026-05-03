"use client";

// プラン状態をアプリ全体で共有するコンテキスト
// onSnapshot で families ドキュメントをリアルタイム監視するため、
// /admin でプラン変更すると全画面に即座に反映される
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  doc,
  getDoc,
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
  /** 現在 onSnapshot で監視している family ドキュメントのパス（debug用） */
  familyPath: string | null;
  /** debug用: PlanProviderで起きたステージ */
  debugStage: string;
};

const PlanContext = createContext<PlanContextType>({
  plan: "free",
  isPremium: false,
  refreshPlan: async () => {},
  loading: true,
  familyPath: null,
  debugStage: "init",
});

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState(true);
  const [familyPath, setFamilyPath] = useState<string | null>(null);
  // debug用: PlanProviderで何が起きたか UI に出す
  const [debugStage, setDebugStage] = useState<string>("init");

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
      setLoading(false);
      return;
    }

    // family_id を取得 → families ドキュメントを onSnapshot で監視。
    // /admin で plan が変わると即座に反映される。
    let unsubscribe: Unsubscribe | null = null;
    let cancelled = false;

    (async () => {
      setDebugStage("fetching-user");
      try {
        // ローカルキャッシュをバイパスして必ずサーバーから取得。
        // pending writes（最近の書き込みでまだサーバー未確定）に引きずられて
        // family_id が見えなくなる問題を回避するため。
        const userSnap = await getDocFromServer(doc(db, "users", user.uid));
        if (cancelled) return;
        if (!userSnap.exists()) {
          setDebugStage("user-not-exists");
          setPlan("free");
          setFamilyPath(null);
          setLoading(false);
          return;
        }
        const userData = userSnap.data();
        const rawFamilyId = userData.family_id;
        const isRef = rawFamilyId && typeof rawFamilyId === "object" && "path" in rawFamilyId;
        // 全フィールドを JSON 化して debug に出す（reference は path だけ抜く）
        const dump = Object.entries(userData).map(([k, v]) => {
          if (v && typeof v === "object" && "path" in v) {
            return `${k}=ref:${(v as DocumentReference).path}`;
          }
          return `${k}=${typeof v}:${JSON.stringify(v).slice(0, 30)}`;
        }).join(" / ");
        setDebugStage(`user-ok ${dump}`);
        const familyRef = isRef ? (rawFamilyId as DocumentReference<DocumentData>) : null;
        if (!familyRef) {
          setPlan("free");
          setFamilyPath(null);
          setLoading(false);
          return;
        }
        setFamilyPath(familyRef.path);
        setDebugStage(`watching ${familyRef.path}`);
        // families リアルタイム監視
        unsubscribe = onSnapshot(
          familyRef,
          (snap: DocumentSnapshot<DocumentData>) => {
            if (cancelled) return;
            const data = snap.exists() ? (snap.data() as { plan?: string }) : null;
            setPlan(data?.plan === "premium" ? "premium" : "free");
            setDebugStage(`snap plan=${data?.plan}`);
            setLoading(false);
          },
          (err: FirestoreError) => {
            console.error("[plan-context] onSnapshot失敗:", err);
            setDebugStage(`snap-error ${err.code}`);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("[plan-context] users取得失敗:", err);
        const code = (err as { code?: string })?.code || "unknown";
        setDebugStage(`fetch-error ${code}`);
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
        isPremium: plan === "premium",
        refreshPlan: fetchPlan,
        loading,
        familyPath,
        debugStage,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
