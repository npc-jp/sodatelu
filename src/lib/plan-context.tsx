"use client";

// プラン状態をアプリ全体で共有するコンテキスト
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./auth-context";
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

  async function fetchPlan() {
    if (!user) return;
    const p = await getUserPlan(user.uid);
    setPlan(p);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchPlan();
  }, [user, authLoading]);

  return (
    <PlanContext.Provider
      value={{
        plan,
        isPremium: plan === "premium",
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
