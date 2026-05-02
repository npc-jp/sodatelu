"use client";

// ルートページ: 認証状態に応じてリダイレクト
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import SodateluLogo from "@/components/sodatelu-logo";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // ローディング中の表示（スプラッシュ）
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center">
          <SodateluLogo layout="stacked" height={120} />
        </div>
        <p className="mt-2 text-sm text-slate-400">読み込み中...</p>
      </div>
    </div>
  );
}
