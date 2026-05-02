"use client";

// アカウント設定画面
//
// セクション構成:
//   1. プロフィール（メール・表示名・ログイン情報の確認）
//   2. プラン（無料/プレミアム表示・アップグレードボタン仮）
//   3. プライバシー（コミュニティ統計オプトイン切替）
//   4. ログアウト
//   5. 危険な操作（アカウント削除）
//
// トーン: ビジョン v2 の温かさを保ちつつ、危険な操作のセクションは淡々と。

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plan-context";
import {
  getUserSettings,
  updateCommunityStatsOptIn,
} from "@/lib/firestore";
import { deleteOwnAccount, type AccountDeletionResult } from "@/lib/account-delete";
import ConfirmModal from "@/components/confirm-modal";
import AppHeader from "@/components/app-header";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { plan, isPremium } = usePlan();

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [communityOptIn, setCommunityOptIn] = useState(false);
  const [optInSaving, setOptInSaving] = useState(false);

  // 削除モーダルの状態（2段階確認）
  const [confirm1Open, setConfirm1Open] = useState(false);
  const [confirm2Open, setConfirm2Open] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // 未ログインなら /login へ
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // ユーザー設定の読み込み
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await getUserSettings(user.uid);
        if (cancelled) return;
        if (s) {
          setCommunityOptIn(s.community_stats_opt_in);
        }
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleToggleOptIn() {
    if (!user || optInSaving) return;
    const next = !communityOptIn;
    setOptInSaving(true);
    try {
      await updateCommunityStatsOptIn(user.uid, next);
      setCommunityOptIn(next);
    } catch (err) {
      console.error("[settings] community_stats_opt_in 更新失敗:", err);
      alert("設定の保存に失敗しました。少し時間を置いて再度お試しください。");
    } finally {
      setOptInSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (err) {
      console.error("[settings] signOut 失敗:", err);
      alert("ログアウトに失敗しました。再度お試しください。");
    }
  }

  // 削除確認 1段階目 → 2段階目
  function handleDeleteFirstConfirm() {
    setConfirm1Open(false);
    setConfirm2Open(true);
  }

  // 削除確認 2段階目 → 実行
  async function handleDeleteFinalConfirm() {
    if (!user || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const result: AccountDeletionResult = await deleteOwnAccount(user);
      console.log("[settings] アカウント削除完了:", result);
      // 削除完了 → /login へ（Auth 削除済みなので onAuthStateChanged が反応する）
      router.replace("/login");
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error("[settings] アカウント削除失敗:", err);

      // requires-recent-login: Auth の仕様で再ログインが必要
      if (e.code === "auth/requires-recent-login") {
        setDeleteError(
          "セキュリティのため、もう一度ログインし直してから削除をお試しください。"
        );
        // ログアウトして /login に戻す（ユーザーの判断で再ログイン）
        try {
          await signOut(auth);
        } catch {
          /* noop */
        }
        setTimeout(() => router.replace("/login"), 2000);
      } else {
        setDeleteError(
          "削除に失敗しました。時間を置いて再度お試しいただくか、お問い合わせください。"
        );
      }
      setDeleting(false);
      setConfirm2Open(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <AppHeader title="設定" showBack onBack={() => router.back()} />

      <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* 1. プロフィール */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">プロフィール</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">メールアドレス</p>
                <p className="mt-0.5 text-slate-700">{user.email || "（未登録）"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">表示名</p>
                <p className="mt-0.5 text-slate-700">
                  {user.displayName || user.email || "（未設定）"}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                ※ 現在のβ版では、メールアドレスや表示名の変更はサポートしていません
              </p>
            </div>
          </section>

          {/* 2. プラン */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">プラン</h2>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {isPremium ? "プレミアムプラン" : "無料プラン"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isPremium
                    ? "すべての機能をご利用いただけます。ありがとうございます"
                    : "記録の本質的な体験は無料で完結します"}
                </p>
              </div>
              {!isPremium && (
                <button
                  type="button"
                  onClick={() => router.push("/upgrade")}
                  className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-600"
                >
                  アップグレード
                </button>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              プラン: <span className="font-mono">{plan}</span>
            </p>
          </section>

          {/* 3. プライバシー */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">プライバシー</h2>

            <div className="mt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">
                    コミュニティ統計への協力
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    オンにすると、個人を特定できない形で集計したデータを、
                    将来の子育て研究や医療研究に役立てることに同意したことになります。
                    いつでもオフに戻せます。
                  </p>
                </div>

                {/* スイッチ */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={communityOptIn}
                  disabled={settingsLoading || optInSaving}
                  onClick={handleToggleOptIn}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    communityOptIn ? "bg-amber-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      communityOptIn ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <Link
                href="/privacy"
                className="text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                プライバシーポリシーを読む →
              </Link>
            </div>
          </section>

          {/* 4. ログアウト */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">ログアウト</h2>
            <p className="mt-2 text-xs text-slate-500">
              この端末からサインアウトします。記録データは削除されません。
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ログアウト
            </button>
          </section>

          {/* 5. 危険な操作 */}
          <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-red-700">アカウントの削除</h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
              <p>
                アカウントを削除すると、お預かりしているお子さまの記録・写真・ファミリー設定が
                すべて消えます。元に戻すことはできません。
              </p>
              <p className="text-xs text-slate-500">
                ※ ファミリーに他のメンバーがいる場合は、自分だけがファミリーから抜ける形になり、
                ファミリー本体や他のメンバーの記録は残ります。
              </p>
            </div>

            {deleteError && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-700">
                {deleteError}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setDeleteError("");
                setConfirm1Open(true);
              }}
              disabled={deleting}
              className="mt-4 w-full rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              アカウントを削除する
            </button>
          </section>

          {/* お問い合わせ案内 */}
          <p className="pt-2 text-center text-xs text-slate-400">
            ご質問・サポートは sodatelu.app@gmail.com まで
          </p>
        </div>
      </main>

      {/* 削除確認 1段階目 */}
      <ConfirmModal
        open={confirm1Open}
        title="本当に削除しますか？"
        description="お子さまの記録・写真・ファミリー設定がすべて削除されます。元に戻すことはできません。"
        confirmLabel="削除に進む"
        cancelLabel="キャンセル"
        destructive
        onConfirm={handleDeleteFirstConfirm}
        onCancel={() => setConfirm1Open(false)}
      />

      {/* 削除確認 2段階目（最終確認） */}
      <ConfirmModal
        open={confirm2Open}
        title="最終確認：削除を実行します"
        description="この操作は取り消せません。本当によろしければ「削除する」を押してください。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        destructive
        loading={deleting}
        onConfirm={handleDeleteFinalConfirm}
        onCancel={() => {
          if (!deleting) setConfirm2Open(false);
        }}
      />
    </div>
  );
}
