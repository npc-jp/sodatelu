"use client";

// メールアドレス変更画面 — Bloom デザイン
// フロー:
//   1. 現在のパスワードで再認証 (Firebase 仕様で必須)
//   2. 新メールアドレスに確認リンクを送信 (verifyBeforeUpdateEmail)
//   3. ユーザーが新メールのリンクを踏むと変更が確定
//
// Google ログインユーザーはメール変更不可（Google 側で管理）
// その場合は案内文を表示してフォームを出さない

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  isPasswordProvider,
  isGoogleProvider,
  requestEmailChange,
} from "@/lib/profile";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomCard from "@/components/bloom-card";
import { Heart, Sparkle, Sprout } from "@/components/illustrations";

export default function EditEmailPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // 認証ガード
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/edit-email");
    }
  }, [authLoading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError("");

    try {
      await requestEmailChange(user, currentPassword, newEmail);
      setSent(true);
    } catch (err) {
      console.error("[edit-email] 変更リクエスト失敗:", err);
      // Firebase エラーの内訳をユーザーに伝わる形で
      const code = (err as { code?: string })?.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("現在のパスワードが正しくありません");
      } else if (code === "auth/invalid-email") {
        setError("メールアドレスの形式が正しくありません");
      } else if (code === "auth/email-already-in-use") {
        setError("このメールアドレスは既に使われています");
      } else if (code === "auth/requires-recent-login") {
        setError("セキュリティのため、もう一度ログインしてからお試しください");
      } else {
        setError("変更リクエストに失敗しました。時間をおいて再度お試しください");
      }
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--bloom-bg)" }}
      >
        <Sprout size={42} color="var(--bloom-primary)" />
      </div>
    );
  }

  // Google ログインユーザーは案内のみ
  if (isGoogleProvider(user) && !isPasswordProvider(user)) {
    return (
      <div
        className="flex h-full flex-col"
        style={{ background: "var(--bloom-bg)" }}
      >
        <BloomAppHeader
          title="メールアドレス"
          showBack
          rightSlot={<Heart size={16} color="var(--bloom-accent)" />}
        />
        <main className="flex-1 overflow-y-auto px-[18px] pt-5 pb-10">
          <BloomCard soft color="var(--bloom-yellow)" className="p-4">
            <p
              className="font-hand"
              style={{ fontSize: "0.875rem", color: "var(--bloom-ink)", lineHeight: 1.7 }}
            >
              Google アカウントでログインしているため、
              <br />
              アプリ内でメールアドレスを変更できません。
            </p>
            <p
              className="mt-3 text-[0.8125rem]"
              style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
            >
              Google アカウント側で変更してください。
              <br />
              変更後、次回ログインで自動的に反映されます。
            </p>
          </BloomCard>
          <div
            className="mt-5 text-center text-[0.8125rem]"
            style={{ color: "var(--bloom-ink-soft)" }}
          >
            現在のメール: {user.email}
          </div>
        </main>
      </div>
    );
  }

  // 確認メール送信完了
  if (sent) {
    return (
      <div
        className="flex h-full flex-col"
        style={{ background: "var(--bloom-bg)" }}
      >
        <BloomAppHeader title="メールアドレス" showBack />
        <main className="flex-1 overflow-y-auto px-[18px] pt-5 pb-10">
          <div className="mb-4 text-center">
            <Sparkle size={42} color="var(--bloom-accent)" />
          </div>
          <BloomCard className="p-5 text-center">
            <h2
              className="font-hand"
              style={{ fontSize: "1.125rem", color: "var(--bloom-ink)", lineHeight: 1.5 }}
            >
              確認メールを送りました
            </h2>
            <p
              className="mt-3 text-[0.8125rem]"
              style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.8 }}
            >
              <strong style={{ color: "var(--bloom-ink)" }}>{newEmail}</strong>
              <br />
              に確認メールを送信しました。
              <br />
              <br />
              メール内のリンクをタップすると、
              <br />
              新しいメールアドレスに切り替わります。
              <br />
              <br />
              リンクを踏むまで現在のメール（{user.email}）でログインしてください。
            </p>
          </BloomCard>
          <button
            type="button"
            onClick={() => router.replace("/settings")}
            className="bloom-border bloom-shadow font-hand mt-5 w-full rounded-[14px] py-3.5 text-white"
            style={{
              background: "var(--bloom-primary)",
              fontSize: "1rem",
              letterSpacing: "0.08em",
            }}
          >
            設定にもどる
          </button>
        </main>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--bloom-bg)" }}
    >
      <BloomAppHeader
        title="メールアドレス"
        showBack
        rightSlot={<Heart size={16} color="var(--bloom-accent)" />}
      />

      <main className="flex-1 overflow-y-auto px-[18px] pt-5 pb-10">
        <p
          className="text-[0.8125rem]"
          style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
        >
          現在のパスワードと新しいメールアドレスを入力してください。
          <br />
          新しいメールに確認リンクを送ります。
          リンクを踏むと変更が確定します。
        </p>

        <BloomCard soft color="var(--bloom-yellow)" className="mt-4 p-3.5">
          <p className="text-[0.75rem]" style={{ color: "var(--bloom-ink)", lineHeight: 1.6 }}>
            現在のメール: <strong>{user.email}</strong>
          </p>
        </BloomCard>

        <form onSubmit={handleSubmit} className="mt-5">
          {/* 現在のパスワード */}
          <div
            className="font-hand mb-1.5"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● 現在のパスワード
          </div>
          <BloomCard soft className="mb-4 px-3.5 py-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="ログイン時のパスワード"
              required
              autoComplete="current-password"
              className="font-hand block w-full bg-transparent focus:outline-none"
              style={{ fontSize: "1rem", color: "var(--bloom-ink)" }}
            />
          </BloomCard>

          {/* 新メールアドレス */}
          <div
            className="font-hand mb-1.5"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● 新しいメールアドレス
          </div>
          <BloomCard soft className="mb-4 px-3.5 py-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              required
              autoComplete="email"
              className="font-hand block w-full bg-transparent focus:outline-none"
              style={{ fontSize: "1rem", color: "var(--bloom-ink)" }}
            />
          </BloomCard>

          {error && (
            <div
              className="mt-4 rounded-xl px-3.5 py-2.5 text-[0.8125rem]"
              style={{
                background: "#FCE4D2",
                color: "#A8421B",
                border: "1.5px solid var(--bloom-line)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              saving ||
              currentPassword.length === 0 ||
              newEmail.trim().length === 0 ||
              newEmail.trim() === user.email
            }
            className="bloom-border bloom-shadow font-hand mt-5 w-full rounded-[14px] py-3.5 text-white disabled:opacity-50"
            style={{
              background: "var(--bloom-primary)",
              fontSize: "1rem",
              letterSpacing: "0.08em",
            }}
          >
            {saving ? "送信中…" : "確認メールを送る ✦"}
          </button>
        </form>
      </main>
    </div>
  );
}
