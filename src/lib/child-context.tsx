"use client";

// 選択中の子どもをアプリ全体で共有するコンテキスト
// 複数の子どもがいる場合に切り替えて使う
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./auth-context";
import { getChildrenByUser, type Child } from "./firestore";

type ChildContextType = {
  children: (Child & { id: string })[];
  selectedChild: (Child & { id: string }) | null;
  selectChild: (childId: string) => void;
  refreshChildren: () => Promise<void>;
  loading: boolean;
};

const ChildContext = createContext<ChildContextType>({
  children: [],
  selectedChild: null,
  selectChild: () => {},
  refreshChildren: async () => {},
  loading: true,
});

export function ChildProvider({ children: childrenProp }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [kids, setKids] = useState<(Child & { id: string })[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchChildren() {
    if (!user) return;
    const result = await getChildrenByUser(user.uid);
    // 生年月日順（上の子＝古い順が先）
    result.sort((a, b) => a.birth_date.seconds - b.birth_date.seconds);
    setKids(result);
    // 選択中の子どもがいなければ1人目を選択
    if (!selectedId || !result.find((k) => k.id === selectedId)) {
      if (result.length > 0) setSelectedId(result[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchChildren();
  }, [user, authLoading]);

  const selectedChild = kids.find((k) => k.id === selectedId) || null;

  function selectChild(childId: string) {
    setSelectedId(childId);
  }

  return (
    <ChildContext.Provider
      value={{
        children: kids,
        selectedChild,
        selectChild,
        refreshChildren: fetchChildren,
        loading,
      }}
    >
      {childrenProp}
    </ChildContext.Provider>
  );
}

export function useChild() {
  return useContext(ChildContext);
}
