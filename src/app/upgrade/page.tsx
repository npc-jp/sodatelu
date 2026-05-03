"use client";

// プレミアムアップグレード紹介画面 — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom-extra2.jsx の BloomPremium
// accent ヘッダー / PottedPlant / 特典4件 / そのうち 2列 / プランカード（accent + βピル） / CTA
//
// 既存ロジック維持: β期間中は実購入なし、CTA タップで「準備中」alert

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomCard from "@/components/bloom-card";
import {
  Cloud,
  PottedPlant,
  Sparkle,
  Sprout,
  Star,
} from "@/components/illustrations";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plan-context";

const FEATURES: { glyph: string; title: string; body: string; color: string }[] = [
  {
    glyph: "✦",
    title: "11カテゴリすべて",
    body: "感じた・がんばった・行った・ありがと…",
    color: "var(--bloom-primary)",
  },
  {
    glyph: "◐",
    title: "年表のスナップショット",
    body: "きょうだいを並べて画像で書き出し",
    color: "var(--bloom-accent)",
  },
  {
    glyph: "❀",
    title: "無制限の写真添付",
    body: "思い出をたっぷり残せます",
    color: "var(--bloom-pink)",
  },
  {
    glyph: "✶",
    title: "広告なし・優先サポート",
    body: "βの間も最優先で対応",
    color: "var(--bloom-yellow)",
  },
];

const COMING_FEATURES = [
  "思い出ブック印刷",
  "AI 振り返り",
  "声のきろく",
  "家族チャット",
];

export default function UpgradePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isPremium } = usePlan();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  function handleUpgrade() {
    alert(
      "β期間中はアップグレードを準備中です。正式リリース後にご案内します"
    );
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

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{ background: "var(--bloom-bg)" }}
    >
      <BloomAppHeader
        title="プレミアム"
        showBack
        bgColor="var(--bloom-accent)"
        textColor="#fff"
        rightSlot={<Star size={16} color="var(--bloom-yellow)" />}
      />

      <main className="flex-1 overflow-y-auto px-[18px] pt-5 pb-10">
        {/* ヒーロー */}
        <div className="relative text-center">
          <div className="absolute" style={{ top: 10, left: 6 }}>
            <Sparkle size={14} color="var(--bloom-accent)" />
          </div>
          <div className="absolute" style={{ top: 30, right: 10 }}>
            <Star size={14} color="var(--bloom-yellow)" />
          </div>
          <div className="mb-2.5 flex justify-center">
            <PottedPlant size={92} />
          </div>
          <h2
            className="font-hand"
            style={{ fontSize: 24, color: "var(--bloom-ink)", lineHeight: 1.4 }}
          >
            もっと、まいにちを
            <br />
            のこしませんか
          </h2>
          <p
            className="mt-2.5 text-[13px]"
            style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
          >
            プレミアムは、すべてのカテゴリを使えるようになるプラン。
          </p>
        </div>

        {/* 特典4件 */}
        <div className="mb-2 mt-6 flex items-center gap-2">
          <Sparkle size={14} color="var(--bloom-accent)" />
          <h3
            className="font-hand"
            style={{ fontSize: 14, color: "var(--bloom-ink)" }}
          >
            できるようになること
          </h3>
        </div>
        {FEATURES.map((f) => (
          <BloomCard
            key={f.title}
            soft
            className="mb-2 flex items-start gap-3 p-3"
          >
            <div
              className="bloom-border font-hand flex shrink-0 items-center justify-center rounded-full"
              style={{
                width: 36,
                height: 36,
                background: f.color,
                color: f.color === "var(--bloom-yellow)" ? "var(--bloom-ink)" : "#fff",
                fontSize: 16,
              }}
            >
              {f.glyph}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="font-hand"
                style={{ fontSize: 14, color: "var(--bloom-ink)" }}
              >
                {f.title}
              </div>
              <div
                className="mt-1 text-[12px]"
                style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.5 }}
              >
                {f.body}
              </div>
            </div>
          </BloomCard>
        ))}

        {/* そのうち */}
        <div className="mb-2 mt-5 flex items-center gap-2">
          <Cloud size={20} color="var(--bloom-line)" />
          <h3
            className="font-hand"
            style={{ fontSize: 13, color: "var(--bloom-ink-soft)" }}
          >
            そのうち
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {COMING_FEATURES.map((c) => (
            <div
              key={c}
              className="rounded-[14px] py-2.5 text-center"
              style={{
                background: "#fff",
                border: "1.5px dashed var(--bloom-line-soft)",
                color: "var(--bloom-ink-soft)",
                fontFamily: "Yusei Magic, sans-serif",
                fontSize: 12,
                opacity: 0.85,
              }}
            >
              {c}
            </div>
          ))}
        </div>

        {/* プランカード */}
        <div className="relative mt-7">
          <BloomCard
            color="var(--bloom-accent)"
            className="relative p-5 text-center text-white"
          >
            {/* β期間ピル（カード上部に被せる） */}
            <div
              className="bloom-border absolute"
              style={{
                top: -10,
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--bloom-yellow)",
                color: "var(--bloom-ink)",
                padding: "3px 12px",
                borderRadius: 10,
                fontSize: 12,
                fontFamily: "Yusei Magic, sans-serif",
              }}
            >
              β期間 50%オフ
            </div>
            <div className="font-hand mt-1" style={{ fontSize: 14 }}>
              プレミアム
            </div>
            <div className="font-hand mt-1.5" style={{ fontSize: 32 }}>
              <span
                style={{
                  fontSize: 16,
                  opacity: 0.7,
                  textDecoration: "line-through",
                  marginRight: 6,
                }}
              >
                ¥980
              </span>
              ¥490
              <span style={{ fontSize: 13, opacity: 0.95 }}> / 月</span>
            </div>
            <div className="text-[12px] opacity-95 mt-1">
              いつでも解約できます
            </div>
          </BloomCard>
        </div>

        {/* CTA */}
        {!isPremium && (
          <button
            type="button"
            onClick={handleUpgrade}
            className="bloom-border bloom-shadow font-hand mt-3.5 w-full rounded-[14px] py-4 text-white"
            style={{
              background: "var(--bloom-primary)",
              fontSize: 17,
              letterSpacing: "0.08em",
            }}
          >
            はじめる ✦
          </button>
        )}

        <p
          className="mt-2 text-center text-[12px]"
          style={{ color: "var(--bloom-ink-soft)" }}
        >
          β期間中の登録は、製品版でも価格を引き継ぎます
        </p>

        <p
          className="mt-5 text-center text-[12px]"
          style={{ color: "var(--bloom-ink-soft)" }}
        >
          ※ 現在β版です。正式リリース時にご案内します
        </p>
      </main>
    </div>
  );
}
