"use client";

// 記録入力画面 — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom.jsx の BloomWrite
// 黄色ヘッダー / 3カテゴリ + 8ロックカード / めやす紐付け / フォーム / 「きろくする ✦」CTA
//
// 既存ロジック維持:
//   - カテゴリ選択 + マイルストーン紐付け + タイトル + メモ + 日付 + 写真
//   - 有料カテゴリのロック表示 (isPremium false)
//   - URL childId パラメータ→選択中の子ども
//   - milestoneId 既紐付けのものをピッカーから除外

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { usePlan } from "@/lib/plan-context";
import {
  createRecord,
  getLinkedMilestoneIds,
  type MilestoneCategory,
} from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import { type MilestoneData } from "@/lib/milestones-data";
import { milestoneToAppCategory } from "@/lib/category-map";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomCard from "@/components/bloom-card";
import MilestonePicker from "@/components/milestone-picker";
import MeasurementForm from "@/components/measurement-form";
import { Sparkle, Sprout } from "@/components/illustrations";

type CategoryOption = {
  value: MilestoneCategory;
  label: string;
  /** Bloom 用の手描き風グリフ（ロックカードでも使う） */
  glyph: string;
  /** 選択時の背景色 (var) */
  color: string;
  premium: boolean;
};

const ALL_CATEGORIES: CategoryOption[] = [
  { value: "できた", label: "できた", glyph: "✦", color: "var(--bloom-primary)", premium: false },
  { value: "おめでとう", label: "おめでとう", glyph: "❀", color: "var(--bloom-pink)", premium: false },
  { value: "始めた", label: "はじめた", glyph: "🌱", color: "var(--bloom-accent)", premium: false },
  { value: "がんばった", label: "がんばった", glyph: "✿", color: "#D86464", premium: true },
  { value: "感じた", label: "感じた", glyph: "♡", color: "#6B8FE8", premium: true },
  { value: "言った", label: "言った", glyph: "❝", color: "#9B7FD9", premium: true },
  { value: "行った", label: "行った", glyph: "▲", color: "#5FB8D9", premium: true },
  { value: "やめた", label: "やめた", glyph: "□", color: "#7A6F58", premium: true },
  { value: "あげた・もらった", label: "あげた", glyph: "♢", color: "var(--bloom-pink)", premium: true },
  { value: "のりこえた", label: "のりこえた", glyph: "△", color: "#A86A3F", premium: true },
  { value: "ありがとう", label: "ありがと", glyph: "✦", color: "var(--bloom-yellow)", premium: true },
];

function WriteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { selectedChild, children: kids } = useChild();
  const { isPremium } = usePlan();

  // URLパラメータがあればそれを使い、なければ選択中の子ども
  const childId = searchParams.get("childId") || selectedChild?.id || "";
  // 対象の子の family_id（measurements 保存に必要）
  // URLパラメータ経由で他の子になっている場合も kids から再取得して整合性を保つ
  const targetChild = kids.find((k) => k.id === childId) || selectedChild;
  const familyId = targetChild?.family_id?.id || "";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MilestoneCategory | "">("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneData | null>(null);
  const [linkedMilestoneIds, setLinkedMilestoneIds] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // 身長・体重ショートカットモーダル
  // measurements は records と独立して保存できる（仕様書 A-3）
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);

  // 紐付け済みのめやすID（ピッカーから除外する）
  useEffect(() => {
    if (!childId) {
      setLinkedMilestoneIds([]);
      return;
    }
    let cancelled = false;
    getLinkedMilestoneIds(childId)
      .then((ids) => {
        if (!cancelled) setLinkedMilestoneIds(ids);
      })
      .catch((err) => {
        console.error("[write] getLinkedMilestoneIds 失敗:", err);
        if (!cancelled) setLinkedMilestoneIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [childId]);

  function selectMilestone(ms: MilestoneData) {
    setSelectedMilestone(ms);
    setCategory(milestoneToAppCategory(ms.category));
    setShowMilestones(false);
  }

  function clearMilestone() {
    setSelectedMilestone(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !category || !childId) return;

    setLoading(true);
    try {
      // 写真があれば先にアップロード
      let photoUrl = "";
      if (photoFile) {
        const timestamp = Date.now();
        photoUrl = await uploadImage(
          photoFile,
          `records/${childId}/${timestamp}_${photoFile.name}`
        );
      }

      await createRecord({
        title,
        category,
        childId,
        recorded_date: new Date(date),
        memo,
        milestoneId: selectedMilestone?.id,
        photoUrl,
        recordedByUid: user.uid,
        recordedByName: user.displayName || user.email || "",
      });
      setSaved(true);
      setTimeout(() => router.push("/home"), 1500);
    } catch (err) {
      console.error("[write] 記録の保存失敗:", err);
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (saved) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center"
        style={{ background: "var(--bloom-bg)" }}
      >
        <div className="text-center">
          <div className="flex justify-center">
            <Sprout size={56} color="var(--bloom-primary)" stroke={2.5} />
          </div>
          <p
            className="font-hand mt-4"
            style={{ fontSize: "1.375rem", color: "var(--bloom-ink)" }}
          >
            きろくしました ✦
          </p>
          <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--bloom-ink-soft)" }}>
            ホームに戻ります…
          </p>
        </div>
      </div>
    );
  }

  const freeCats = ALL_CATEGORIES.filter((c) => !c.premium);
  const premiumCats = ALL_CATEGORIES.filter((c) => c.premium);

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--bloom-bg)" }}
    >
      <BloomAppHeader
        title="きろくする"
        showBack
        bgColor="var(--bloom-yellow)"
        rightSlot={<Sparkle size={16} color="var(--bloom-accent)" />}
      />

      <main className="flex-1 overflow-y-auto px-4 pb-10 pt-3.5">
        <form onSubmit={handleSubmit}>
          {/* カテゴリ選択 */}
          <div
            className="font-hand mb-2"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● どんなこと？
          </div>

          {/* 無料カテゴリ（3カラム） */}
          <div className="grid grid-cols-3 gap-2">
            {freeCats.map((cat) => {
              const active = category === cat.value;
              return (
                <BloomCard
                  key={cat.value}
                  soft={!active}
                  color={active ? cat.color : "#fff"}
                  className="cursor-pointer"
                >
                  <button
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className="block w-full px-1 py-3.5 text-center"
                    style={{ color: active ? "#fff" : "var(--bloom-ink)" }}
                  >
                    <div className="mb-0.5" style={{ fontSize: "1.375rem" }}>
                      {cat.glyph}
                    </div>
                    <div className="font-hand" style={{ fontSize: "0.8125rem" }}>
                      {cat.label}
                    </div>
                  </button>
                </BloomCard>
              );
            })}
          </div>

          {/* 有料カテゴリ（4カラム × 2段、ロック表示） */}
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {premiumCats.map((cat) => {
              const locked = !isPremium;
              const active = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    if (locked) return;
                    setCategory(cat.value);
                  }}
                  className="relative rounded-[10px] px-1 py-2.5 text-center"
                  style={{
                    background: active && !locked ? cat.color : "#fff",
                    color: active && !locked ? "#fff" : "var(--bloom-ink-soft)",
                    border: locked
                      ? "1.5px dashed var(--bloom-line-soft)"
                      : "1.5px solid var(--bloom-line)",
                    opacity: locked ? 0.7 : 1,
                  }}
                >
                  {locked && (
                    <span className="absolute" style={{ top: 3, right: 4, fontSize: "0.75rem" }}>
                      🔒
                    </span>
                  )}
                  <div className="font-hand" style={{ fontSize: "0.75rem" }}>
                    {cat.label}
                  </div>
                </button>
              );
            })}
          </div>

          {!isPremium && (
            <p
              className="mt-1.5 text-center text-[0.75rem]"
              style={{ color: "var(--bloom-ink-soft)" }}
            >
              🔒 のカテゴリはプレミアムで使えます
            </p>
          )}

          {/* めやす紐付け */}
          <div className="mt-4">
            {selectedMilestone ? (
              <BloomCard soft color="var(--bloom-primary-soft)" className="p-3">
                <div className="flex items-center gap-2">
                  <Sprout size={16} color="var(--bloom-primary)" />
                  <div className="flex-1">
                    <div
                      className="font-hand"
                      style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
                    >
                      {selectedMilestone.title}
                    </div>
                    <div className="text-[0.75rem]" style={{ color: "var(--bloom-ink-soft)" }}>
                      {selectedMilestone.age_hint} ・ {selectedMilestone.category}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearMilestone}
                    className="font-hand"
                    style={{ fontSize: "0.875rem", color: "var(--bloom-ink-soft)" }}
                    aria-label="めやすの紐付けを外す"
                  >
                    ✕
                  </button>
                </div>
              </BloomCard>
            ) : (
              <BloomCard
                soft
                color="var(--bloom-primary-soft)"
                className="cursor-pointer"
              >
                <button
                  type="button"
                  onClick={() => setShowMilestones(!showMilestones)}
                  className="flex w-full items-center gap-2 px-3.5 py-3"
                >
                  <Sprout size={18} color="var(--bloom-primary)" />
                  <span
                    className="font-hand flex-1 text-left"
                    style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
                  >
                    めやすに ひもづける（任意）
                  </span>
                  <span style={{ color: "var(--bloom-ink-soft)" }}>
                    {showMilestones ? "▲" : "▼"}
                  </span>
                </button>
              </BloomCard>
            )}

            {showMilestones && !selectedMilestone && (
              <div className="mt-2">
                <MilestonePicker
                  excludedMilestoneIds={linkedMilestoneIds}
                  onSelect={selectMilestone}
                />
              </div>
            )}
          </div>

          {/* タイトル */}
          <div
            className="font-hand mt-4 mb-1.5"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● タイトル
          </div>
          <BloomCard soft className="px-3.5 py-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder={selectedMilestone ? `例：${selectedMilestone.title}ができた日` : "はじめて歩いた！"}
              className="font-hand block w-full bg-transparent focus:outline-none"
              style={{ fontSize: "1rem", color: "var(--bloom-ink)" }}
            />
          </BloomCard>

          {/* 日付 */}
          <div
            className="font-hand mt-4 mb-1.5"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● いつ？
          </div>
          <BloomCard soft className="px-3.5 py-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="font-hand block w-full bg-transparent focus:outline-none"
              style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
            />
          </BloomCard>

          {/* メモ */}
          <div
            className="font-hand mt-4 mb-1.5"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● そのときのこと
          </div>
          <BloomCard soft className="px-3.5 py-3.5" style={{ minHeight: 80 }}>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder="そのときの様子を、ゆっくり書いてください…"
              className="block w-full resize-none bg-transparent text-[0.8125rem] focus:outline-none"
              style={{
                color: "var(--bloom-ink)",
                lineHeight: 1.7,
              }}
            />
          </BloomCard>

          {/* 写真 */}
          <div
            className="font-hand mt-4 mb-1.5"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● 写真
          </div>
          {photoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="プレビュー"
                className="bloom-border w-full rounded-[14px] object-cover"
                style={{ maxHeight: 240 }}
              />
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="bloom-border absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: "#fff", color: "var(--bloom-ink)", fontSize: "0.875rem" }}
                aria-label="写真を削除"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="block w-full cursor-pointer rounded-[14px] py-6 text-center"
                style={{
                  background: "#fff",
                  border: "2px dashed var(--bloom-line)",
                }}
              >
                <span
                  className="font-hand"
                  style={{ fontSize: "0.8125rem", color: "var(--bloom-ink-soft)" }}
                >
                  ＋ 写真をえらぶ
                </span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </>
          )}

          {/* 保存ボタン */}
          <button
            type="submit"
            disabled={loading || !category}
            className="bloom-border bloom-shadow font-hand mt-5 w-full rounded-[14px] py-3.5 text-white disabled:opacity-50"
            style={{
              background: "var(--bloom-primary)",
              fontSize: "1rem",
              letterSpacing: "0.08em",
            }}
          >
            {loading ? "保存中…" : "きろくする ✦"}
          </button>
        </form>

        {/* 身長・体重ショートカット（仕様書 A-3 サブ導線）
            記録の保存とは独立しており、計測だけ・両方どちらでも保存できる
            ボタンは secondary 色味（メインの「きろくする」と区別） */}
        {childId && familyId && (
          <div className="mt-6">
            <div
              className="mb-2 flex items-center gap-2"
              style={{ color: "var(--bloom-ink-soft)" }}
            >
              <span
                className="block flex-1"
                style={{
                  height: 1,
                  background: "var(--bloom-line-soft)",
                }}
              />
              <span className="font-hand text-[0.75rem]">あわせて</span>
              <span
                className="block flex-1"
                style={{
                  height: 1,
                  background: "var(--bloom-line-soft)",
                }}
              />
            </div>
            <BloomCard
              soft
              color="var(--bloom-accent-soft, var(--bloom-bg))"
              className="p-3"
            >
              <p
                className="font-hand mb-2 text-center"
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--bloom-ink)",
                  lineHeight: 1.6,
                }}
              >
                身長・体重も きろくしますか？
              </p>
              <button
                type="button"
                onClick={() => setShowMeasurementModal(true)}
                className="bloom-border font-hand w-full rounded-[14px] py-2.5"
                style={{
                  background: "#fff",
                  color: "var(--bloom-ink)",
                  fontSize: "0.875rem",
                }}
              >
                📏 身長・体重を入力する
              </button>
            </BloomCard>
          </div>
        )}
      </main>

      {/* 身長・体重入力モーダル（記録画面ショートカット）
          計測日のデフォルトは記録日に合わせる（write画面の date state を渡す） */}
      {childId && familyId && user && (
        <MeasurementForm
          open={showMeasurementModal}
          childId={childId}
          familyId={familyId}
          createdByUid={user.uid}
          defaultDate={date}
          onClose={() => setShowMeasurementModal(false)}
        />
      )}
    </div>
  );
}

export default function WritePage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex h-full items-center justify-center"
          style={{ background: "var(--bloom-bg)" }}
        >
          <div className="text-center">
            <Sprout size={42} color="var(--bloom-primary)" />
            <p
              className="font-hand mt-2 text-sm"
              style={{ color: "var(--bloom-ink-soft)" }}
            >
              読み込み中…
            </p>
          </div>
        </div>
      }
    >
      <WriteForm />
    </Suspense>
  );
}
