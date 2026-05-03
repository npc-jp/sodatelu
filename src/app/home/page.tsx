"use client";

// ホーム画面 — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom.jsx
// セージグリーン主役 / 太線 / hard shadow / 手書き字体（Yusei Magic）

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plan-context";
import { getRecordsByChild, updateChildPhoto, getInvitationsForEmail, type GrowthRecord, type Invitation } from "@/lib/firestore";
import { useChild } from "@/lib/child-context";
import { uploadImage } from "@/lib/storage";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getPhase } from "@/lib/phases";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import BloomFab from "@/components/bloom-fab";
import { Gear, Heart, OpenBook, PottedPlant, Sparkle, Sprout, Star, WavyLine } from "@/components/illustrations";

// 月齢計算
function calcAge(birthDate: Timestamp): string {
  const birth = birthDate.toDate();
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  const totalMonths = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
  if (totalMonths < 1) {
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return `${days}日`;
  }
  if (totalMonths < 12) return `${totalMonths}ヶ月`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y}歳${m}ヶ月` : `${y}歳`;
}

// カテゴリ → Bloom タグ色
const CATEGORY_TAG_COLOR: { [key: string]: string } = {
  できた: "var(--bloom-primary)",
  おめでとう: "var(--bloom-pink)",
  始めた: "var(--bloom-accent)",
  がんばった: "#D86464",
  感じた: "#6B8FE8",
  言った: "#9B7FD9",
  行った: "#5FB8D9",
  やめた: "#7A6F58",
  "あげた・もらった": "var(--bloom-pink)",
  のりこえた: "#A86A3F",
  ありがとう: "var(--bloom-yellow)",
};

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { plan, isPremium, loading: planLoading, familyPath } = usePlan();
  const { children: kids, selectedChild: child, selectChild, refreshChildren, loading: childLoading } = useChild();
  const [records, setRecords] = useState<(GrowthRecord & { id: string })[]>([]);
  const [invitations, setInvitations] = useState<(Invitation & { id: string })[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading || childLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (kids.length === 0) {
      // 家族の有無で行き先を分岐:
      //   - family_id なし → 初回ユーザー → /onboarding（家族から作る）
      //   - family_id あり → 全削除済の既存ユーザー → /add-child（家族はあるので子だけ追加）
      // これがないと既存家族が孤児化したり、onboarding ループになったりする
      getDoc(doc(db, "users", user.uid))
        .then((snap) => {
          const fam = snap.exists() ? snap.data().family_id : null;
          router.replace(fam ? "/add-child" : "/onboarding");
        })
        .catch((err) => {
          console.error("[home] users 取得失敗:", err);
          router.replace("/onboarding");
        });
      return;
    }
  }, [user, authLoading, childLoading, kids, router]);

  useEffect(() => {
    if (!user?.email) return;
    getInvitationsForEmail(user.email).then(setInvitations);
  }, [user]);

  useEffect(() => {
    if (!child) return;
    getRecordsByChild(child.id).then(setRecords);
  }, [child]);

  if (authLoading || childLoading || !child) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--bloom-bg)" }}>
        <div className="text-center">
          <div className="flex justify-center">
            <Sprout size={48} color="var(--bloom-primary)" stroke={2.5} />
          </div>
          <p className="font-hand mt-2 text-sm" style={{ color: "var(--bloom-ink-soft)" }}>
            読み込み中…
          </p>
        </div>
      </div>
    );
  }

  const phase = getPhase(child.birth_date.toDate());
  // フェーズ番号 → 「SEASON N」「よちよち期」のような表示
  const seasonLabel = `SEASON ${phase.number}`;

  // 直近7件の記録を mini bar chart として表現（最新を accent 色）
  const recentBars = (() => {
    const bars: number[] = [];
    const baseline = [10, 16, 8, 20, 28, 12, 24];
    for (let i = 0; i < 7; i++) {
      bars.push(records[i] ? baseline[i] : 6);
    }
    return bars;
  })();

  return (
    <div className="flex h-full flex-col relative" style={{ background: "var(--bloom-bg)" }}>
      {/* DEBUG: プラン状態表示（後で削除） */}
      <div
        style={{
          background: isPremium ? "#7BA85F" : "#F18A4C",
          color: "#fff",
          padding: "4px 8px",
          fontSize: 10,
          fontFamily: "monospace",
          textAlign: "left",
          lineHeight: 1.5,
          wordBreak: "break-all",
        }}
      >
        DEBUG plan={plan} loading={String(planLoading)}
        <br />
        uid={user?.uid}
        <br />
        familyPath={familyPath || "(null)"}
      </div>

      {/* ヘッダー */}
      <header className="flex items-center justify-between px-5 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <Sprout size={22} color="var(--bloom-primary)" />
          <span
            className="font-hand"
            style={{ fontSize: 19, color: "var(--bloom-ink)", letterSpacing: "0.02em" }}
          >
            sodatelu
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/family")}
            className="bloom-border flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--bloom-yellow)" }}
            aria-label="ファミリー"
          >
            <Heart size={20} color="var(--bloom-ink)" />
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="bloom-border flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "#fff" }}
            aria-label="設定"
          >
            <Gear size={20} color="var(--bloom-ink)" />
          </button>
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-1">
        {/* 招待通知（Bloom スタイル） */}
        {invitations.length > 0 && (
          <button
            onClick={() => router.push("/family")}
            className="bloom-border bloom-shadow-soft mb-3 flex w-full items-center gap-3 rounded-2xl p-3 text-left"
            style={{ background: "var(--bloom-accent-soft)" }}
          >
            <Heart size={20} color="var(--bloom-accent)" />
            <div className="flex-1">
              <p className="font-hand text-sm" style={{ color: "var(--bloom-ink)" }}>
                ファミリーへの招待が{invitations.length}件
              </p>
              <p className="text-[13px]" style={{ color: "var(--bloom-ink-soft)" }}>
                タップして確認する
              </p>
            </div>
            <span className="font-hand" style={{ fontSize: 18, color: "var(--bloom-ink)" }}>→</span>
          </button>
        )}

        {/* 子ども切り替えタブ */}
        {kids.length > 1 && (
          <div className="mb-3 -mx-1 overflow-x-auto px-1">
            <div className="flex min-w-max gap-2">
              {kids.map((kid) => {
                const isActive = child?.id === kid.id;
                return (
                  <button
                    key={kid.id}
                    onClick={() => selectChild(kid.id)}
                    className={`bloom-border flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 ${isActive ? "bloom-shadow-soft" : ""}`}
                    style={{
                      background: isActive ? "var(--bloom-primary)" : "#fff",
                      color: isActive ? "#fff" : "var(--bloom-ink)",
                      fontFamily: "Yusei Magic, sans-serif",
                      fontSize: 13,
                    }}
                  >
                    {kid.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={kid.photo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full font-hand"
                        style={{ background: "var(--bloom-yellow)", fontSize: 12, color: "var(--bloom-ink)" }}
                      >
                        {kid.name.charAt(0)}
                      </span>
                    )}
                    {kid.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 子どもカード（メイン緑） */}
        <BloomCard
          color="var(--bloom-primary)"
          className="relative overflow-hidden p-4"
        >
          {/* PottedPlant ウォーターマーク */}
          <div className="absolute pointer-events-none" style={{ right: -18, bottom: -14, opacity: 0.18 }}>
            <PottedPlant size={120} />
          </div>
          {/* 右上の星 */}
          <div className="absolute" style={{ top: -6, right: 18 }}>
            <Star size={22} color="var(--bloom-yellow)" />
          </div>

          <div className="relative flex items-center gap-3">
            {/* プロフィール写真（タップで変更可能・useRef経由でファイル選択を確実に開く） */}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="cursor-pointer shrink-0 rounded-full"
              aria-label="プロフィール写真を変更"
            >
              {child.photo_url ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={child.photo_url}
                    alt={child.name}
                    className="bloom-border h-[58px] w-[58px] rounded-full object-cover"
                  />
                  <div
                    className="bloom-border absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: "var(--bloom-accent)", fontSize: 12, color: "#fff" }}
                  >
                    📷
                  </div>
                </div>
              ) : (
                <div
                  className="bloom-border flex h-[58px] w-[58px] items-center justify-center rounded-full"
                  style={{ background: "var(--bloom-yellow)" }}
                >
                  <span className="font-hand" style={{ fontSize: 26, color: "var(--bloom-ink)" }}>
                    {child.name.charAt(0)}
                  </span>
                </div>
              )}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !child) return;
                try {
                  const url = await uploadImage(file, `children/${child.id}/${Date.now()}_profile`);
                  await updateChildPhoto(child.id, url);
                  await refreshChildren();
                } catch {
                  alert("写真のアップロードに失敗しました");
                }
              }}
            />
            <div className="flex-1 text-white">
              <div className="font-hand" style={{ fontSize: 22 }}>
                {child.name}
              </div>
              <div className="text-[12px] opacity-95 mt-0.5">
                {calcAge(child.birth_date)} ・ {child.gender}
              </div>
            </div>
          </div>

          {/* SEASON / フェーズ */}
          <div
            className="bloom-border relative mt-3.5 flex items-center justify-between rounded-xl px-3.5 py-2.5"
            style={{ background: "#fff" }}
          >
            <div>
              <div
                className="font-bold"
                style={{ fontSize: 12, letterSpacing: "0.15em", color: "var(--bloom-ink-soft)" }}
              >
                {seasonLabel}
              </div>
              <div className="font-hand mt-0.5" style={{ fontSize: 16, color: "var(--bloom-ink)" }}>
                {phase.name}
              </div>
            </div>
            <div className="text-[12px]" style={{ color: "var(--bloom-ink-soft)" }}>
              {phase.ageRange}
            </div>
          </div>
        </BloomCard>

        {/* 記録サマリーカード */}
        <BloomCard soft className="mt-3 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkle size={16} color="var(--bloom-accent)" />
              <span className="font-hand" style={{ fontSize: 14, color: "var(--bloom-ink)" }}>
                これまでのきろく
              </span>
            </div>
            <div className="font-hand" style={{ fontSize: 22, color: "var(--bloom-ink)" }}>
              {records.length}{" "}
              <span style={{ fontSize: 12, color: "var(--bloom-ink-soft)", fontFamily: "Zen Kaku Gothic New, sans-serif" }}>
                件
              </span>
            </div>
          </div>
          <div className="mt-2.5 flex h-8 items-end gap-1.5">
            {recentBars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded"
                style={{
                  height: h,
                  background: i === 6 && records[6] ? "var(--bloom-accent)" : "var(--bloom-primary-soft)",
                  border: "1.5px solid var(--bloom-line)",
                }}
              />
            ))}
          </div>
        </BloomCard>

        {/* 2カラム: めやす / きょうだい */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <BloomCard
            soft
            color="var(--bloom-yellow)"
            className="p-3.5 cursor-pointer"
          >
            <button
              type="button"
              onClick={() => router.push("/milestones")}
              className="block w-full text-left"
            >
              <Star size={20} color="var(--bloom-ink)" />
              <div className="font-hand mt-1.5" style={{ fontSize: 14, color: "var(--bloom-ink)" }}>
                めやす
              </div>
              <div className="text-[12px] mt-0.5" style={{ color: "var(--bloom-ink)" }}>
                {phase.name}
              </div>
            </button>
          </BloomCard>
          <BloomCard
            soft
            color="var(--bloom-accent-soft)"
            className="p-3.5 cursor-pointer"
          >
            <button
              type="button"
              onClick={() => router.push("/add-child")}
              className="block w-full text-left"
            >
              <Heart size={20} color="var(--bloom-accent)" />
              <div className="font-hand mt-1.5" style={{ fontSize: 14, color: "var(--bloom-ink)" }}>
                きょうだい
              </div>
              <div className="text-[12px] mt-0.5" style={{ color: "var(--bloom-ink)" }}>
                追加する
              </div>
            </button>
          </BloomCard>
        </div>

        {/* 思い出ページ CTA */}
        <button
          onClick={() => router.push("/memory")}
          className="bloom-border bloom-shadow mt-3 flex w-full items-center gap-3 rounded-[18px] p-3.5 text-left text-white"
          style={{ background: "var(--bloom-accent)" }}
        >
          <OpenBook size={50} />
          <div className="min-w-0 flex-1">
            <div className="font-hand" style={{ fontSize: 15 }}>
              {child?.name ? `${child.name}のこれまで` : "これまでのおもいで"}
            </div>
            <div className="text-[12px] mt-0.5 opacity-95">写真と一緒にゆっくり振り返る</div>
          </div>
          <span className="font-hand" style={{ fontSize: 18 }}>→</span>
        </button>

        {/* さいきんの記録セクション */}
        <div className="mt-6 mb-3 flex items-center gap-2.5">
          <span className="font-hand" style={{ fontSize: 16, color: "var(--bloom-ink)" }}>
            さいきんの記録
          </span>
          <WavyLine width={80} color="var(--bloom-primary)" stroke={2} />
        </div>

        {records.length === 0 ? (
          <BloomCard soft className="p-6 text-center">
            <div className="flex justify-center">
              <Sprout size={42} color="var(--bloom-primary)" />
            </div>
            <p className="font-hand mt-3" style={{ fontSize: 14, color: "var(--bloom-ink)" }}>
              まだ記録はありません
            </p>
            <p className="text-[13px] mt-1" style={{ color: "var(--bloom-ink-soft)" }}>
              はじめての「できた」を残してみよう
            </p>
            <button
              onClick={() => router.push(`/write?childId=${child?.id}`)}
              className="bloom-border bloom-shadow font-hand mt-4 rounded-xl px-5 py-2.5 text-white"
              style={{ background: "var(--bloom-primary)", fontSize: 13, letterSpacing: "0.08em" }}
            >
              さいしょの きろく ✦
            </button>
          </BloomCard>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 10).map((rec) => {
              const tagColor = CATEGORY_TAG_COLOR[rec.category] ?? "var(--bloom-ink-soft)";
              const dateStr = `${rec.recorded_date.toDate().getMonth() + 1}/${rec.recorded_date.toDate().getDate()}`;
              return (
                <BloomCard key={rec.id} soft className="cursor-pointer">
                  <button
                  onClick={() => router.push(`/record?id=${rec.id}`)}
                  className="block w-full p-3 text-left"
                >
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="bloom-border-soft font-hand inline-block rounded-lg px-2 py-0.5 text-white"
                        style={{
                          background: tagColor,
                          fontSize: 12,
                          borderColor: "var(--bloom-line)",
                          borderWidth: "1.5px",
                          borderStyle: "solid",
                        }}
                      >
                        {rec.category}
                      </span>
                      <span
                        className="font-hand truncate"
                        style={{ fontSize: 14, color: "var(--bloom-ink)" }}
                      >
                        {rec.title}
                      </span>
                    </div>
                    <div className="text-[12px] shrink-0 ml-2" style={{ color: "var(--bloom-ink-soft)" }}>
                      {dateStr}
                    </div>
                  </div>
                  {rec.memo && (
                    <p
                      className="mt-1 text-[12px] line-clamp-2"
                      style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.5 }}
                    >
                      {rec.memo}
                    </p>
                  )}
                  {rec.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rec.photo_url}
                      alt=""
                      className="bloom-border mt-2 h-20 w-28 rounded-lg object-cover"
                    />
                  )}
                  </button>
                </BloomCard>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB（オレンジ + 太線） */}
      <BloomFab onClick={() => router.push(`/write?childId=${child?.id}`)} />

      <BloomBottomNav current="home" />
    </div>
  );
}
