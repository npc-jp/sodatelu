"use client";

// プロフィール編集（ニックネーム）画面 — Bloom デザイン
// Firebase Auth.displayName と Firestore users.display_name を同期更新

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { updateUserDisplayName } from "@/lib/profile";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomCard from "@/components/bloom-card";
import { Sparkle, Sprout } from "@/components/illustrations";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 認証ガード
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/edit-profile");
    }
  }, [authLoading, user, router]);

  // 初期値セット
  useEffect(() => {
    if (!user || hydrated) return;
    setDisplayName(user.displayName || "");
    setHydrated(true);
  }, [user, hydrated]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError("");

    try {
      await updateUserDisplayName(user, displayName);
      router.replace("/settings");
    } catch (err) {
      console.error("[edit-profile] 更新失敗:", err);
      setError("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user || !hydrated) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--bloom-bg)" }}
      >
        <Sprout size={42} color="var(--bloom-primary)" />
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--bloom-bg)" }}
    >
      <BloomAppHeader
        title="ニックネーム"
        showBack
        rightSlot={<Sparkle size={16} color="var(--bloom-accent)" />}
      />

      <main className="flex-1 overflow-y-auto px-[18px] pt-5 pb-10">
        <p
          className="text-[13px]"
          style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
        >
          家族のメンバーや招待された人に表示される名前です。
          <br />
          いつでも変えられます。
        </p>

        <form onSubmit={handleSubmit} className="mt-5">
          <div
            className="font-hand mb-1.5"
            style={{ fontSize: 13, color: "var(--bloom-ink)" }}
          >
            ● ニックネーム
          </div>
          <BloomCard soft className="mb-4 px-3.5 py-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例：あづ、ママ、たろうパパ"
              maxLength={30}
              className="font-hand block w-full bg-transparent focus:outline-none"
              style={{ fontSize: 16, color: "var(--bloom-ink)" }}
              autoFocus
            />
          </BloomCard>

          {error && (
            <div
              className="mt-4 rounded-xl px-3.5 py-2.5 text-[13px]"
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
            disabled={saving || displayName.trim().length === 0}
            className="bloom-border bloom-shadow font-hand mt-5 w-full rounded-[14px] py-3.5 text-white disabled:opacity-50"
            style={{
              background: "var(--bloom-primary)",
              fontSize: 16,
              letterSpacing: "0.08em",
            }}
          >
            {saving ? "保存中…" : "保存する ✦"}
          </button>
        </form>
      </main>
    </div>
  );
}
