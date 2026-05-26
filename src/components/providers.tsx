"use client";

// アプリ全体で共有するプロバイダーをまとめる
import { AuthProvider } from "@/lib/auth-context";
import { ChildProvider } from "@/lib/child-context";
import { PlanProvider } from "@/lib/plan-context";
import { ReactNode, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function Providers({ children }: { children: ReactNode }) {
  // Capacitor Android で起動時にステータスバーを amber-100 背景 + ダークアイコンに設定
  // Web(PWA/ブラウザ) では Capacitor.isNativePlatform() が false で何もしない
  useEffect(() => {
    async function initStatusBar() {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        // WebView をステータスバー領域に被せない（WebView は下から開始）
        await StatusBar.setOverlaysWebView({ overlay: false });
        // 背景色を amber-100 (Bloom デザインのクリーム背景) に統一
        await StatusBar.setBackgroundColor({ color: "#fef3c7" });
        // ライト背景に対するダーク文字/アイコン
        await StatusBar.setStyle({ style: Style.Light });
      } catch (e) {
        console.warn("StatusBar init failed:", e);
      }
    }
    initStatusBar();
  }, []);

  return (
    <AuthProvider>
      <PlanProvider>
        <ChildProvider>{children}</ChildProvider>
      </PlanProvider>
    </AuthProvider>
  );
}
