"use client";

// 記録の詳細・編集・削除画面 — Bloom デザイン適用
// 参照: write 画面（カテゴリ・めやす・タイトル・日付・メモ・写真の入力 UI を流用）
// 表示モードと編集モードを切替。表示モードはタイトル＋カテゴリピル＋本文＋写真。
// 編集モードは write 画面と同じ入力フォーム。

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePlan } from "@/lib/plan-context";
import { useChild } from "@/lib/child-context";
import {
  updateRecord,
  deleteRecord,
  getLinkedMilestoneIds,
  type MilestoneCategory,
  type GrowthRecord,
} from "@/lib/firestore";
import { MILESTONES, type MilestoneData } from "@/lib/milestones-data";
import { uploadImage } from "@/lib/storage";
import { milestoneToAppCategory } from "@/lib/category-map";
import ConfirmModal from "@/components/confirm-modal";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomCard from "@/components/bloom-card";
import MilestonePicker from "@/components/milestone-picker";
import { Sparkle, Sprout, WavyLine } from "@/components/illustrations";

type CategoryOption = {
  value: MilestoneCategory;
  label: string;
  // Bloom 用の手描き風グリフ（write 画面と統一）
  glyph: string;
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

function categoryColor(category: string): string {
  const found = ALL_CATEGORIES.find((c) => c.value === category);
  return found?.color || "var(--bloom-ink-soft)";
}

function categoryLabel(category: string): string {
  const found = ALL_CATEGORIES.find((c) => c.value === category);
  return found?.label || category;
}

function RecordDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPremium } = usePlan();
  const { children: kids } = useChild();
  const recordId = searchParams.get("id") || "";

  const [record, setRecord] = useState<(GrowthRecord & { id: string }) | null>(null);
  const [milestone, setMilestone] = useState<MilestoneData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 編集用の状態
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MilestoneCategory | "">("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState("");
  const [childId, setChildId] = useState<string>(""); // 兄弟取り違え修正用
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneData | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  // この子どもの記録で既に紐付け済みのめやすID（ピッカーから除外する）
  // ただし「現在編集中の記録自身が持つmilestone_id」は除外しない（編集対象だから）
  const [linkedMilestoneIds, setLinkedMilestoneIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  // 削除確認モーダルの状態
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!recordId) return;

    async function fetchRecord() {
      const snap = await getDoc(doc(db, "records", recordId));
      if (!snap.exists()) {
        router.replace("/home");
        return;
      }

      const data = { id: snap.id, ...snap.data() } as GrowthRecord & { id: string };
      setRecord(data);
      setTitle(data.title);
      setCategory(data.category);
      setMemo(data.memo || "");
      setDate(data.recorded_date.toDate().toISOString().split("T")[0]);
      setChildId(data.child_id?.id || "");
      setExistingPhotoUrl(data.photo_url || "");

      // 紐付けられたマイルストーンを探す
      if (data.milestone_id) {
        const msId = data.milestone_id.id;
        const found = MILESTONES.find((m) => m.id === msId);
        if (found) {
          setMilestone(found);
          setSelectedMilestone(found);
        }
      }

      setLoading(false);
    }

    fetchRecord();
  }, [recordId, router]);

  // この子どもの紐付け済みめやすID一覧を取得する
  // 「自分自身の紐付け先」だけは除外しない（編集中の記録だから残して当然）
  useEffect(() => {
    if (!record) return;
    const childId = record.child_id?.id;
    if (!childId) return;

    const ownMilestoneId = record.milestone_id?.id;

    let cancelled = false;
    getLinkedMilestoneIds(childId)
      .then((ids) => {
        if (cancelled) return;
        const excluded = ownMilestoneId
          ? ids.filter((id) => id !== ownMilestoneId)
          : ids;
        setLinkedMilestoneIds(excluded);
      })
      .catch((err) => {
        console.error("[record] getLinkedMilestoneIds 失敗:", err);
        if (!cancelled) setLinkedMilestoneIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [record]);

  function selectMilestone(ms: MilestoneData) {
    setSelectedMilestone(ms);
    setCategory(milestoneToAppCategory(ms.category));
    setShowMilestones(false);
  }

  function clearMilestone() {
    setSelectedMilestone(null);
  }

  async function handleSave() {
    if (!recordId || !category) return;
    setSaving(true);
    try {
      // 新しい写真があればアップロード
      let photoUrl = existingPhotoUrl;
      if (photoFile) {
        const timestamp = Date.now();
        photoUrl = await uploadImage(
          photoFile,
          `records/${recordId}/${timestamp}_${photoFile.name}`
        );
      }

      // child_id が変更されている場合のみ更新（そうでなければ undefined で維持）
      const childIdChanged = childId && childId !== record?.child_id?.id;
      await updateRecord(recordId, {
        title,
        category,
        recorded_date: new Date(date),
        memo,
        milestoneId: selectedMilestone?.id,
        photoUrl,
        childId: childIdChanged ? childId : undefined,
      });
      // 表示を更新
      const snap = await getDoc(doc(db, "records", recordId));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as GrowthRecord & { id: string };
        setRecord(data);
        setMilestone(selectedMilestone || null);
      }
      setIsEditing(false);
    } catch (err) {
      console.error("[record] 保存失敗:", err);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteRequest() {
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      await deleteRecord(recordId);
      router.replace("/home");
    } catch (err) {
      console.error("[record] 削除失敗:", err);
      setDeleting(false);
      setShowDeleteConfirm(false);
      alert("削除に失敗しました");
    }
  }

  if (loading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--bloom-bg)" }}
      >
        <Sprout size={42} color="var(--bloom-primary)" />
      </div>
    );
  }

  if (!record) return null;

  const freeCats = ALL_CATEGORIES.filter((c) => !c.premium);
  const premiumCats = ALL_CATEGORIES.filter((c) => c.premium);

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--bloom-bg)" }}
    >
      <BloomAppHeader
        title={isEditing ? "きろくを編集" : "きろくの詳細"}
        showBack
        bgColor={isEditing ? "var(--bloom-yellow)" : undefined}
        rightSlot={
          !isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="font-hand"
              style={{
                fontSize: 13,
                color: "var(--bloom-ink)",
                padding: "4px 12px",
                border: "1.5px solid var(--bloom-line)",
                borderRadius: 10,
                background: "#fff",
              }}
            >
              編集
            </button>
          ) : (
            <Sparkle size={16} color="var(--bloom-accent)" />
          )
        }
      />

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-10">
        {isEditing ? (
          // === 編集モード ===
          <div>
            {/* 対象の子ども（兄弟取り違え修正用）。きょうだい1人なら表示しない */}
            {kids.length > 1 && (
              <>
                <div
                  className="font-hand mb-2"
                  style={{ fontSize: 13, color: "var(--bloom-ink)" }}
                >
                  ● だれの きろく？
                </div>
                <div className="-mx-1 mb-4 overflow-x-auto px-1">
                  <div className="flex min-w-max gap-2">
                    {kids.map((kid) => {
                      const active = childId === kid.id;
                      return (
                        <button
                          key={kid.id}
                          type="button"
                          onClick={() => setChildId(kid.id)}
                          className={`bloom-border flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 ${active ? "bloom-shadow-soft" : ""}`}
                          style={{
                            background: active ? "var(--bloom-primary)" : "#fff",
                            color: active ? "#fff" : "var(--bloom-ink)",
                            fontFamily: "Yusei Magic, sans-serif",
                            fontSize: 13,
                          }}
                        >
                          {kid.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={kid.photo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                          ) : (
                            <span
                              className="flex h-5 w-5 items-center justify-center rounded-full"
                              style={{ background: "var(--bloom-yellow)", fontSize: 11, color: "var(--bloom-ink)" }}
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
              </>
            )}

            {/* カテゴリ選択 */}
            <div
              className="font-hand mb-2"
              style={{ fontSize: 13, color: "var(--bloom-ink)" }}
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
                      <div className="mb-0.5" style={{ fontSize: 22 }}>
                        {cat.glyph}
                      </div>
                      <div className="font-hand" style={{ fontSize: 13 }}>
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
                      <span className="absolute" style={{ top: 3, right: 4, fontSize: 12 }}>
                        🔒
                      </span>
                    )}
                    <div className="font-hand" style={{ fontSize: 12 }}>
                      {cat.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {!isPremium && (
              <p
                className="mt-1.5 text-center text-[12px]"
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
                        style={{ fontSize: 13, color: "var(--bloom-ink)" }}
                      >
                        {selectedMilestone.title}
                      </div>
                      <div className="text-[12px]" style={{ color: "var(--bloom-ink-soft)" }}>
                        {selectedMilestone.age_hint} ・ {selectedMilestone.category}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearMilestone}
                      className="font-hand"
                      style={{ fontSize: 14, color: "var(--bloom-ink-soft)" }}
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
                      style={{ fontSize: 13, color: "var(--bloom-ink)" }}
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
              style={{ fontSize: 13, color: "var(--bloom-ink)" }}
            >
              ● タイトル
            </div>
            <BloomCard soft className="px-3.5 py-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="はじめて歩いた！"
                className="font-hand block w-full bg-transparent focus:outline-none"
                style={{ fontSize: 16, color: "var(--bloom-ink)" }}
              />
            </BloomCard>

            {/* 日付 */}
            <div
              className="font-hand mt-4 mb-1.5"
              style={{ fontSize: 13, color: "var(--bloom-ink)" }}
            >
              ● いつ？
            </div>
            <BloomCard soft className="px-3.5 py-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="font-hand block w-full bg-transparent focus:outline-none"
                style={{ fontSize: 14, color: "var(--bloom-ink)" }}
              />
            </BloomCard>

            {/* メモ */}
            <div
              className="font-hand mt-4 mb-1.5"
              style={{ fontSize: 13, color: "var(--bloom-ink)" }}
            >
              ● そのときのこと
            </div>
            <BloomCard soft className="px-3.5 py-3.5" style={{ minHeight: 80 }}>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={4}
                placeholder="そのときの様子を、ゆっくり書いてください…"
                className="block w-full resize-none bg-transparent text-[13px] focus:outline-none"
                style={{
                  color: "var(--bloom-ink)",
                  lineHeight: 1.7,
                }}
              />
            </BloomCard>

            {/* 写真 */}
            <div
              className="font-hand mt-4 mb-1.5"
              style={{ fontSize: 13, color: "var(--bloom-ink)" }}
            >
              ● 写真
            </div>
            {(photoPreview || existingPhotoUrl) ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview || existingPhotoUrl}
                  alt="プレビュー"
                  className="bloom-border w-full rounded-[14px] object-cover"
                  style={{ maxHeight: 240 }}
                />
                <div className="absolute right-2 top-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="bloom-border font-hand flex h-8 items-center rounded-full px-3"
                    style={{ background: "#fff", color: "var(--bloom-ink)", fontSize: 12 }}
                  >
                    変更
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                      setExistingPhotoUrl("");
                    }}
                    className="bloom-border flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: "#fff", color: "var(--bloom-ink)", fontSize: 14 }}
                    aria-label="写真を削除"
                  >
                    ✕
                  </button>
                </div>
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
                    style={{ fontSize: 13, color: "var(--bloom-ink-soft)" }}
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

            {/* キャンセル + 保存ボタン */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedMilestone(milestone);
                  setPhotoFile(null);
                  setPhotoPreview(null);
                  setExistingPhotoUrl(record?.photo_url || "");
                  setTitle(record?.title || "");
                  setCategory(record?.category || "");
                  setMemo(record?.memo || "");
                  setDate(record?.recorded_date.toDate().toISOString().split("T")[0] || "");
                  setChildId(record?.child_id?.id || "");
                }}
                className="bloom-border bloom-shadow-soft font-hand flex-1 rounded-[14px] py-3.5"
                style={{
                  background: "#fff",
                  color: "var(--bloom-ink)",
                  fontSize: 14,
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !category}
                className="bloom-border bloom-shadow font-hand flex-1 rounded-[14px] py-3.5 text-white disabled:opacity-50"
                style={{
                  background: "var(--bloom-primary)",
                  fontSize: 14,
                  letterSpacing: "0.05em",
                }}
              >
                {saving ? "保存中…" : "保存する ✦"}
              </button>
            </div>
          </div>
        ) : (
          // === 表示モード ===
          <div>
            {/* タイトル＋カテゴリ＋日付 */}
            <BloomCard className="p-5">
              <div className="flex items-baseline gap-2">
                <span
                  className="font-hand inline-block rounded-lg px-2 py-0.5 text-white"
                  style={{
                    background: categoryColor(record.category),
                    fontSize: 12,
                    border: "1.5px solid var(--bloom-line)",
                  }}
                >
                  {categoryLabel(record.category)}
                </span>
                <div className="text-[12px]" style={{ color: "var(--bloom-ink-soft)" }}>
                  {record.recorded_date.toDate().toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <h2
                className="font-hand mt-2"
                style={{ fontSize: 22, color: "var(--bloom-ink)", lineHeight: 1.4 }}
              >
                {record.title}
              </h2>
              <div className="mt-2">
                <WavyLine width={80} color="var(--bloom-accent)" stroke={2} />
              </div>

              {/* 成長のめやす紐付け */}
              {milestone && (
                <BloomCard
                  soft
                  color="var(--bloom-primary-soft)"
                  className="mt-4 flex items-center gap-2.5 p-3"
                >
                  <Sprout size={18} color="var(--bloom-primary)" />
                  <div className="flex-1">
                    <div className="text-[12px]" style={{ color: "var(--bloom-ink-soft)" }}>
                      成長のめやす
                    </div>
                    <div
                      className="font-hand"
                      style={{ fontSize: 13, color: "var(--bloom-ink)" }}
                    >
                      {milestone.title}
                    </div>
                    <div className="text-[12px]" style={{ color: "var(--bloom-ink-soft)" }}>
                      {milestone.age_hint} ・ {milestone.category}
                    </div>
                  </div>
                </BloomCard>
              )}

              {/* メモ */}
              {record.memo && (
                <div
                  className="mt-4 whitespace-pre-wrap text-[13px]"
                  style={{ color: "var(--bloom-ink)", lineHeight: 1.8 }}
                >
                  {record.memo}
                </div>
              )}

              {/* 写真 */}
              {record.photo_url && (
                <div className="mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={record.photo_url}
                    alt=""
                    className="bloom-border w-full rounded-[14px] object-cover"
                    style={{ maxHeight: 320 }}
                  />
                </div>
              )}
            </BloomCard>

            {/* 削除リンク */}
            <button
              type="button"
              onClick={handleDeleteRequest}
              className="mt-6 block w-full text-center text-[13px]"
              style={{ color: "#A8421B", textDecoration: "underline" }}
            >
              この記録を削除する
            </button>
          </div>
        )}
      </main>

      {/* 削除確認モーダル */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="この記録を削除しますか？"
        description="削除すると元に戻せません。写真も一緒に削除されます。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        destructive
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleting) setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex h-full items-center justify-center"
          style={{ background: "var(--bloom-bg)" }}
        >
          <Sprout size={42} color="var(--bloom-primary)" />
        </div>
      }
    >
      <RecordDetail />
    </Suspense>
  );
}
