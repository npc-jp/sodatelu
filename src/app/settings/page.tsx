"use client";

// アカウント設定画面 — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom-extra2.jsx の BloomSettings
// プロフィールカード（緑） / プラン・プロフィール・プライバシー・その他 / ログアウト / 削除
//
// 既存ロジック維持:
//   - プロフィール表示
//   - プラン表示 + アップグレード誘導
//   - コミュニティ統計オプトイン切替
//   - ログアウト
//   - 2段階確認のアカウント削除

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
import {
  FONT_SCALE_DESCRIPTIONS,
  FONT_SCALE_LABELS,
  FONT_SCALES,
  getFontScale,
  setFontScale,
  type FontScale,
} from "@/lib/font-scale";
import ConfirmModal from "@/components/confirm-modal";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import {
  Cloud,
  Heart,
  PottedPlant,
  Sparkle,
  Sprout,
  Star,
} from "@/components/illustrations";

type RowProps = {
  label: string;
  value?: string;
  rightSlot?: React.ReactNode;
  onClick?: () => void;
  bgColor?: string;
};

function Row({ label, value, rightSlot, onClick, bgColor }: RowProps) {
  return (
    <BloomCard soft color={bgColor ?? "#fff"} className="mb-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left disabled:cursor-default"
      >
        <div className="flex-1 min-w-0">
          <div
            className="font-hand"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            {label}
          </div>
          {value && (
            <div
              className="mt-0.5 truncate text-[0.75rem]"
              style={{ color: "var(--bloom-ink-soft)" }}
            >
              {value}
            </div>
          )}
        </div>
        {rightSlot ?? (
          <span style={{ color: "var(--bloom-ink-soft)" }}>›</span>
        )}
      </button>
    </BloomCard>
  );
}

type SectionTitleProps = { children: React.ReactNode; icon?: React.ReactNode };

function SectionTitle({ children, icon }: SectionTitleProps) {
  return (
    <div className="mt-5 mb-2 flex items-center gap-2">
      {icon}
      <div
        className="font-hand"
        style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
      >
        {children}
      </div>
      <div
        className="flex-1"
        style={{ height: 1, background: "var(--bloom-line-soft)" }}
      />
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isPremium } = usePlan();

  const [settingsLoading, setSettingsLoading] = useState(true);
  const [fontScale, setFontScaleState] = useState<FontScale>("small");

  // 文字サイズ設定を localStorage から復元
  useEffect(() => {
    setFontScaleState(getFontScale());
  }, []);

  function handleChangeFontScale(value: FontScale) {
    setFontScaleState(value);
    setFontScale(value);
  }
  const [communityOptIn, setCommunityOptIn] = useState(false);
  const [optInSaving, setOptInSaving] = useState(false);

  const [confirm1Open, setConfirm1Open] = useState(false);
  const [confirm2Open, setConfirm2Open] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

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

  function handleDeleteFirstConfirm() {
    setConfirm1Open(false);
    setConfirm2Open(true);
  }

  async function handleDeleteFinalConfirm() {
    if (!user || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const result: AccountDeletionResult = await deleteOwnAccount(user);
      console.log("[settings] アカウント削除完了:", result);
      router.replace("/login");
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error("[settings] アカウント削除失敗:", err);

      if (e.code === "auth/requires-recent-login") {
        setDeleteError(
          "セキュリティのため、もう一度ログインし直してから削除をお試しください。"
        );
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
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--bloom-bg)" }}
      >
        <Sprout size={42} color="var(--bloom-primary)" />
      </div>
    );
  }

  const initial = (user.displayName || user.email || "?").charAt(0);

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--bloom-bg)" }}
    >
      <BloomAppHeader
        title="アカウント"
        subtitle="設定とプロフィール"
        showBack
        rightSlot={<Sparkle size={16} color="var(--bloom-accent)" />}
      />

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        {/* プロフィールカード（緑） */}
        <BloomCard
          color="var(--bloom-primary)"
          className="relative flex items-center gap-3 overflow-hidden p-3.5 text-white"
        >
          <div
            className="absolute pointer-events-none"
            style={{ right: -8, bottom: -10, opacity: 0.18 }}
          >
            <PottedPlant size={80} />
          </div>
          <div
            className="bloom-border flex shrink-0 items-center justify-center rounded-full"
            style={{
              width: 50,
              height: 50,
              background: "var(--bloom-yellow)",
              fontFamily: "Yusei Magic, sans-serif",
              fontSize: "1.375rem",
              color: "var(--bloom-ink)",
            }}
          >
            {initial}
          </div>
          <div className="relative flex-1 min-w-0">
            <div className="font-hand" style={{ fontSize: "1.0625rem" }}>
              {user.displayName || "あなた"}
            </div>
            <div className="text-[0.75rem] opacity-95 truncate">
              {user.email || "（未登録）"}
            </div>
          </div>
        </BloomCard>

        {/* プラン */}
        <SectionTitle icon={<Star size={14} color="var(--bloom-yellow)" />}>
          プラン
        </SectionTitle>

        {!isPremium && (
          <BloomCard
            soft
            color="var(--bloom-accent-soft)"
            className="mb-1.5 cursor-pointer p-3.5"
          >
            <button
              type="button"
              onClick={() => router.push("/upgrade")}
              className="block w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Sparkle size={16} color="var(--bloom-accent)" />
                <div
                  className="font-hand flex-1"
                  style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
                >
                  プレミアムにアップグレード
                </div>
                <span
                  className="font-hand rounded-md px-2 py-0.5 text-[0.75rem] text-white"
                  style={{
                    background: "var(--bloom-accent)",
                    border: "1.5px solid var(--bloom-line)",
                  }}
                >
                  NEW
                </span>
              </div>
              <div
                className="mt-1.5 text-[0.75rem]"
                style={{ color: "var(--bloom-ink)", lineHeight: 1.5 }}
              >
                11カテゴリすべて使えるように。年表のスナップショットも。
              </div>
            </button>
          </BloomCard>
        )}
        <Row
          label="現在のプラン"
          value={isPremium ? "プレミアム" : "フリー（3カテゴリ）"}
        />

        {/* プロフィール */}
        <SectionTitle icon={<Sprout size={14} color="var(--bloom-primary)" />}>
          プロフィール
        </SectionTitle>
        <Row
          label="ニックネーム"
          value={user.displayName || "未設定"}
          onClick={() => router.push("/edit-profile")}
        />
        <Row
          label="メールアドレス"
          value={user.email || "未登録"}
          onClick={() => router.push("/edit-email")}
        />

        {/* 表示設定 */}
        <SectionTitle icon={<Sparkle size={14} color="var(--bloom-accent)" />}>
          表示
        </SectionTitle>
        <BloomCard soft className="mb-1.5 p-3.5">
          <div
            className="font-hand mb-2.5"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            文字サイズ
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FONT_SCALES) as FontScale[]).map((key) => {
              const active = fontScale === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleChangeFontScale(key)}
                  className={`bloom-border ${active ? "bloom-shadow" : "bloom-shadow-soft"} rounded-xl py-2 text-center`}
                  style={{
                    background: active ? "var(--bloom-primary)" : "#fff",
                    color: active ? "#fff" : "var(--bloom-ink)",
                  }}
                >
                  <div className="font-hand" style={{ fontSize: "1rem", fontWeight: 700 }}>
                    {FONT_SCALE_LABELS[key]}
                  </div>
                  <div
                    className="mt-0.5 text-[0.625rem]"
                    style={{ opacity: active ? 0.9 : 0.7 }}
                  >
                    {FONT_SCALE_DESCRIPTIONS[key]}
                  </div>
                </button>
              );
            })}
          </div>
          <p
            className="mt-2 text-[0.6875rem]"
            style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.6 }}
          >
            この端末でだけ有効です。すぐに反映されます。
          </p>
        </BloomCard>

        {/* プライバシー */}
        <SectionTitle icon={<Heart size={14} color="var(--bloom-accent)" />}>
          プライバシー
        </SectionTitle>
        <BloomCard soft className="mb-1.5 p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div
                className="font-hand"
                style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
              >
                コミュニティ統計への協力
              </div>
              <p
                className="mt-1 text-[0.75rem]"
                style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.6 }}
              >
                個人を特定できない形で集計したデータを、子育て研究に役立てます。
                いつでもオフに戻せます。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={communityOptIn}
              disabled={settingsLoading || optInSaving}
              onClick={handleToggleOptIn}
              className="bloom-border relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
              style={{
                background: communityOptIn
                  ? "var(--bloom-primary)"
                  : "var(--bloom-line-soft)",
              }}
            >
              <span
                className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                style={{
                  border: "1.5px solid var(--bloom-line)",
                  transform: communityOptIn ? "translateX(20px)" : "translateX(2px)",
                }}
              />
            </button>
          </div>
        </BloomCard>
        <Link href="/privacy" className="block">
          <Row label="プライバシーポリシー" />
        </Link>

        {/* その他 */}
        <SectionTitle icon={<Cloud size={20} color="var(--bloom-line)" />}>
          その他
        </SectionTitle>
        <Row label="バージョン" value="β 0.4.2" rightSlot={<span />} />

        {/* ログアウト */}
        <button
          type="button"
          onClick={handleLogout}
          className="bloom-border bloom-shadow-soft font-hand mt-5 w-full rounded-[14px] py-3"
          style={{
            background: "#fff",
            color: "var(--bloom-ink)",
            fontSize: "0.8125rem",
          }}
        >
          ログアウト
        </button>

        {/* アカウント削除 */}
        {deleteError && (
          <p
            className="mt-3 rounded-xl px-3 py-2 text-[0.8125rem]"
            style={{
              background: "#FCE4D2",
              color: "#A8421B",
              lineHeight: 1.6,
            }}
          >
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
          className="mt-2 w-full rounded-xl py-2.5 text-[0.75rem]"
          style={{
            background: "transparent",
            color: "var(--bloom-ink-soft)",
            border: "1.5px dashed var(--bloom-line-soft)",
          }}
        >
          アカウントを削除
        </button>

        <p
          className="mt-5 text-center text-[0.75rem]"
          style={{ color: "var(--bloom-ink-soft)" }}
        >
          ご質問は sodatelu.app@gmail.com まで
        </p>
      </main>

      <BloomBottomNav current="settings" />

      {/* 削除確認モーダル（既存コンポーネント維持） */}
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
      <ConfirmModal
        open={confirm2Open}
        title="最終確認: 削除を実行します"
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
