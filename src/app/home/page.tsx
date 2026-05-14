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
import { doc, getDocFromServer, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getPhase } from "@/lib/phases";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import BloomFab from "@/components/bloom-fab";
import { Family, Gear, Heart, OpenBook, PottedPlant, Sparkle, Sprout, Star, WavyLine } from "@/components/illustrations";

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
  // プラン状態は将来のためフックは残すが、現状の home では参照しない
  usePlan();
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
      // 行き先判定。優先順位:
      //   1. 自分宛の招待がある → /family（受諾フロー。子ども登録は不要）
      //   2. family_id あり (子どもは0人) → /add-child
      //   3. family_id なし → /onboarding（初回ユーザー、家族から作る）
      (async () => {
        try {
          // 1. 招待チェック
          if (user.email) {
            const myInvs = await getInvitationsForEmail(user.email);
            if (myInvs.length > 0) {
              router.replace("/family");
              return;
            }
          }
          // 2/3. 家族の有無
          const snap = await getDocFromServer(doc(db, "users", user.uid));
          const fam = snap.exists() ? snap.data().family_id : null;
          router.replace(fam ? "/add-child" : "/onboarding");
        } catch (err) {
          console.error("[home] 行き先判定失敗:", err);
          router.replace("/onboarding");
        }
      })();
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

  // 直近7ヶ月の月別記録件数を mini bar chart として表現
  // - 最新月が右端
  // - 各棒の高さは件数に比例（最大件数=フルハイト、件数0でも6px は残して棒の存在感を保つ）
  const recentBars = (() => {
    const now = new Date();
    const months: { count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      months.push({ count: 0 });
    }
    // ym (year-month) で月を識別
    const ymKeys: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      ymKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
    }
    records.forEach((rec) => {
      const d = rec.recorded_date.toDate();
      const ym = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = ymKeys.indexOf(ym);
      if (idx >= 0) months[idx].count++;
    });
    const max = Math.max(1, ...months.map((m) => m.count));
    // 高さ: 件数0は 6px、最大件数は 32px に正規化
    return months.map((m) => ({
      height: m.count > 0 ? Math.max(8, Math.round((m.count / max) * 32)) : 6,
      count: m.count,
    }));
  })();

  return (
    <div className="flex h-full flex-col relative" style={{ background: "var(--bloom-bg)" }}>
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-5 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <Sprout size={22} color="var(--bloom-primary)" />
          <span
            className="font-hand"
            style={{ fontSize: "1.1875rem", color: "var(--bloom-ink)", letterSpacing: "0.02em" }}
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
            <Family size={22} color="var(--bloom-ink)" />
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
            <Family size={20} color="var(--bloom-accent)" />
            <div className="flex-1">
              <p className="font-hand text-sm" style={{ color: "var(--bloom-ink)" }}>
                ファミリーへの招待が{invitations.length}件
              </p>
              <p className="text-[0.8125rem]" style={{ color: "var(--bloom-ink-soft)" }}>
                タップして確認する
              </p>
            </div>
            <span className="font-hand" style={{ fontSize: "1.125rem", color: "var(--bloom-ink)" }}>→</span>
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
                      fontSize: "0.8125rem",
                    }}
                  >
                    {kid.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={kid.photo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full font-hand"
                        style={{ background: "var(--bloom-yellow)", fontSize: "0.75rem", color: "var(--bloom-ink)" }}
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
                    style={{ background: "var(--bloom-accent)", fontSize: "0.75rem", color: "#fff" }}
                  >
                    📷
                  </div>
                </div>
              ) : (
                <div
                  className="bloom-border flex h-[58px] w-[58px] items-center justify-center rounded-full"
                  style={{ background: "var(--bloom-yellow)" }}
                >
                  <span className="font-hand" style={{ fontSize: "1.625rem", color: "var(--bloom-ink)" }}>
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
              <div className="font-hand" style={{ fontSize: "1.375rem" }}>
                {child.name}
              </div>
              <div className="text-[0.75rem] opacity-95 mt-0.5">
                {calcAge(child.birth_date)} ・ {child.gender}
              </div>
            </div>
          </div>

          {/* SEASON / これまでのきろく 2カラム */}
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            {/* SEASON / フェーズ */}
            <div
              className="bloom-border rounded-xl p-3.5 text-center"
              style={{ background: "#fff" }}
            >
              <div className="flex items-center justify-center gap-1.5" style={{ transform: "translateX(-14px)" }}>
                <Sprout size={20} color="var(--bloom-primary)" />
                <span style={{ fontSize: "0.75rem", color: "var(--bloom-ink-soft)" }}>
                  {phase.name}
                </span>
              </div>
              <div className="font-hand mt-0.5" style={{ fontSize: "1rem", color: "var(--bloom-ink)" }}>
                {phase.ageRange}
              </div>
            </div>

            {/* これまでのきろく件数 */}
            <div
              className="bloom-border rounded-xl p-3.5 text-center"
              style={{ background: "#fff" }}
            >
              <div className="flex items-center justify-center gap-1.5" style={{ transform: "translateX(-14px)" }}>
                <Sparkle size={20} color="var(--bloom-accent)" />
                <span style={{ fontSize: "0.75rem", color: "var(--bloom-ink-soft)" }}>
                  きろく
                </span>
              </div>
              <div className="font-hand mt-0.5" style={{ fontSize: "1rem", color: "var(--bloom-ink)" }}>
                {records.length} 件
              </div>
            </div>
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
              className="block w-full text-center"
            >
              <div className="flex items-center justify-center gap-1.5">
                <Star size={20} color="var(--bloom-ink)" />
                <span className="font-hand" style={{ fontSize: "1rem", color: "var(--bloom-ink)" }}>
                  めやすをみる
                </span>
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
              onClick={() => router.push("/write")}
              className="block w-full text-center"
            >
              <div className="flex items-center justify-center gap-1.5">
                <Sparkle size={20} color="var(--bloom-accent)" />
                <span className="font-hand" style={{ fontSize: "1rem", color: "var(--bloom-ink)" }}>
                  きろくする
                </span>
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
            <div className="font-hand" style={{ fontSize: "0.9375rem" }}>
              {child?.name ? `${child.name}のこれまで` : "これまでのおもいで"}
            </div>
            <div className="text-[0.75rem] mt-0.5 opacity-95">写真と一緒にゆっくり振り返る</div>
          </div>
          <span className="font-hand" style={{ fontSize: "1.125rem" }}>→</span>
        </button>

        {/* さいきんの記録セクション */}
        <div className="mt-6 mb-3 flex items-center gap-2.5">
          <span className="font-hand" style={{ fontSize: "1rem", color: "var(--bloom-ink)" }}>
            さいきんの記録
          </span>
          <WavyLine width={80} color="var(--bloom-primary)" stroke={2} />
        </div>

        {records.length === 0 ? (
          <BloomCard soft className="p-6 text-center">
            <div className="flex justify-center">
              <Sprout size={42} color="var(--bloom-primary)" />
            </div>
            <p className="font-hand mt-3" style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}>
              まだ記録はありません
            </p>
            <p className="text-[0.8125rem] mt-1" style={{ color: "var(--bloom-ink-soft)" }}>
              はじめての「できた」を残してみよう
            </p>
            <button
              onClick={() => router.push(`/write?childId=${child?.id}`)}
              className="bloom-border bloom-shadow font-hand mt-4 rounded-xl px-5 py-2.5 text-white"
              style={{ background: "var(--bloom-primary)", fontSize: "0.8125rem", letterSpacing: "0.08em" }}
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
                        className="bloom-border-soft font-hand inline-block shrink-0 whitespace-nowrap rounded-lg px-2 py-0.5 text-white"
                        style={{
                          background: tagColor,
                          fontSize: "0.75rem",
                          borderColor: "var(--bloom-line)",
                          borderWidth: "1.5px",
                          borderStyle: "solid",
                        }}
                      >
                        {rec.category}
                      </span>
                      <span
                        className="font-hand truncate"
                        style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
                      >
                        {rec.title}
                      </span>
                    </div>
                    <div className="text-[0.75rem] shrink-0 ml-2" style={{ color: "var(--bloom-ink-soft)" }}>
                      {dateStr}
                    </div>
                  </div>
                  {rec.memo && (
                    <p
                      className="mt-1 text-[0.75rem] line-clamp-2"
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
