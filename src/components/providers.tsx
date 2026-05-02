"use client";

// アプリ全体で共有するプロバイダーをまとめる
import { AuthProvider } from "@/lib/auth-context";
import { ChildProvider } from "@/lib/child-context";
import { PlanProvider } from "@/lib/plan-context";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PlanProvider>
        <ChildProvider>{children}</ChildProvider>
      </PlanProvider>
    </AuthProvider>
  );
}
