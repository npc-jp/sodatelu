"use client";

// 記録の詳細・編集・削除画面
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePlan } from "@/lib/plan-context";
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
import AppHeader from "@/components/app-header";
import Twemoji from "@/components/twemoji";
import MilestonePicker from "@/components/milestone-picker";
import { Camera, X, Lock } from "lucide-react";

const CATEGORY_STYLE: { [key: string]: { emoji: string } } = {
  できた: { emoji: "✨" },
  おめでとう: { emoji: "🎉" },
  始めた: { emoji: "🌱" },
  がんばった: { emoji: "💪" },
  感じた: { emoji: "💭" },
  言った: { emoji: "💬" },
  行った: { emoji: "🚀" },
  やめた: { emoji: "🔖" },
  "あげた・もらった": { emoji: "🎁" },
  のりこえた: { emoji: "🏔️" },
  ありがとう: { emoji: "🙏" },
};

type CategoryOption = {
  value: MilestoneCategory;
  label: string;
  emoji: string;
  premium: boolean;
};

const ALL_CATEGORIES: CategoryOption[] = [
  { value: "できた", label: "できた", emoji: "✨", premium: false },
  { value: "おめでとう", label: "おめでとう", emoji: "🎉", premium: false },
  { value: "始めた", label: "始めた", emoji: "🌱", premium: false },
  { value: "がんばった", label: "がんばった", emoji: "💪", premium: true },
  { value: "感じた", label: "感じた", emoji: "💭", premium: true },
  { value: "言った", label: "言った", emoji: "💬", premium: true },
  { value: "行った", label: "行った", emoji: "🚀", premium: true },
  { value: "やめた", label: "やめた", emoji: "🔖", premium: true },
  { value: "あげた・もらった", label: "あげた・もらった", emoji: "🎁", premium: true },
  { value: "のりこえた", label: "のりこえた", emoji: "🏔️", premium: true },
  { value: "ありがとう", label: "ありがとう", emoji: "🙏", premium: true },
];

function RecordDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPremium } = usePlan();
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
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneData | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  // この子どもの記録で既に紐付け済みのめやすID（ピッカーから除外する）
  // ただし「現在編集中の記録自身が持つmilestone_id」は除外しない（編集対象だから）
  const [linkedMilestoneIds, setLinkedMilestoneIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState("");
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

    // 編集中の記録自身の milestone_id（あれば）
    const ownMilestoneId = record.milestone_id?.id;

    let cancelled = false;
    getLinkedMilestoneIds(childId)
      .then((ids) => {
        if (cancelled) return;
        // 自分自身の紐付け先だけは除外しない
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

      await updateRecord(recordId, {
        title,
        category,
        recorded_date: new Date(date),
        memo,
        milestoneId: selectedMilestone?.id,
        photoUrl,
      });
      // 表示を更新
      const snap = await getDoc(doc(db, "records", recordId));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as GrowthRecord & { id: string };
        setRecord(data);
        if (selectedMilestone) {
          setMilestone(selectedMilestone);
        } else {
          setMilestone(null);
        }
      }
      setIsEditing(false);
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // 削除確認モーダルを開く
  function handleDeleteRequest() {
    setShowDeleteConfirm(true);
  }

  // 確認モーダルで「削除する」を押された時に走る
  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      await deleteRecord(recordId);
      router.replace("/home");
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
      alert("削除に失敗しました");
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={isEditing ? "きろくを編集" : "きろくの詳細"}
        showBack
        onBack={() => router.back()}
        rightSlot={
          !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15"
            >
              編集
            </button>
          ) : undefined
        }
      />

      <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
        {isEditing ? (
          // === 編集モード ===
          <div className="space-y-6">
            {/* カテゴリ選択 */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">カテゴリ</label>
              {/* 無料カテゴリ（上段） */}
              <div className="flex gap-2">
                {ALL_CATEGORIES.filter((c) => !c.premium).map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex-1 rounded-2xl border-2 py-3 text-center transition-all ${
                      category === cat.value
                        ? "border-amber-500 bg-amber-50 shadow-sm"
                        : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    <span className="flex justify-center">
                      <Twemoji emoji={cat.emoji} size={24} ariaLabel={cat.label} />
                    </span>
                    <span className={`mt-0.5 block text-xs font-medium ${
                      category === cat.value ? "text-amber-700" : "text-slate-600"
                    }`}>
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
              {/* 有料カテゴリ（下段） */}
              <div className="mt-2 grid grid-cols-4 gap-2">
                {ALL_CATEGORIES.filter((c) => c.premium).map((cat) => {
                  const locked = !isPremium;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        if (locked) return;
                        setCategory(cat.value);
                      }}
                      className={`relative rounded-xl border-2 py-2.5 text-center transition-all ${
                        locked
                          ? "border-slate-100 bg-slate-50 opacity-50"
                          : category === cat.value
                            ? "border-amber-500 bg-amber-50 shadow-sm"
                            : "border-slate-100 bg-white hover:border-slate-200"
                      }`}
                    >
                      <span className="flex justify-center">
                        <Twemoji emoji={cat.emoji} size={20} ariaLabel={cat.label} />
                      </span>
                      <span className={`mt-0.5 block text-xs font-medium ${
                        locked
                          ? "text-slate-400"
                          : category === cat.value
                            ? "text-amber-700"
                            : "text-slate-600"
                      }`}>
                        {cat.label}
                      </span>
                      {locked && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-white">
                          <Lock className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {!isPremium && (
                <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-slate-400">
                  <Lock className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  のカテゴリはプレミアムプランで使えます
                </p>
              )}
            </div>

            {/* 成長のめやす紐付け編集（全フェーズ表示・紐付け済みは非表示・自分自身は除外しない） */}
            <div>
              {selectedMilestone ? (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
                  <span className="text-green-600">✓</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">{selectedMilestone.title}</p>
                    <p className="text-xs text-green-600">{selectedMilestone.age_hint} ・ {selectedMilestone.category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearMilestone}
                    className="text-sm text-green-400 hover:text-green-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMilestones(!showMilestones)}
                  className="flex w-full items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 hover:bg-amber-100"
                >
                  <span className="flex items-center gap-1.5">
                    <Twemoji emoji="📋" size={18} ariaLabel="" />
                    成長のめやすに紐付ける（任意）
                  </span>
                  <span>{showMilestones ? "▲" : "▼"}</span>
                </button>
              )}

              {showMilestones && !selectedMilestone && (
                <MilestonePicker
                  excludedMilestoneIds={linkedMilestoneIds}
                  onSelect={selectMilestone}
                />
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">タイトル</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">いつ？</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">メモ</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={4}
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* 写真 */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">写真</label>
              {(photoPreview || existingPhotoUrl) ? (
                <div className="relative">
                  <img
                    src={photoPreview || existingPhotoUrl}
                    alt="プレビュー"
                    className="w-full rounded-xl object-cover"
                    style={{ maxHeight: "240px" }}
                  />
                  <div className="absolute right-2 top-2 flex gap-2">
                    <label className="flex h-8 cursor-pointer items-center rounded-full bg-black/50 px-3 text-xs text-white hover:bg-black/70">
                      変更
                      <input
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
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        setExistingPhotoUrl("");
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                      aria-label="写真を削除"
                    >
                      <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white py-8 text-center hover:border-amber-400 hover:bg-amber-50">
                  <Camera className="h-8 w-8 text-slate-400" strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-sm text-slate-500">タップして写真を選ぶ</span>
                  <input
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
                </label>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedMilestone(milestone);
                  setPhotoFile(null);
                  setPhotoPreview(null);
                  setExistingPhotoUrl(record?.photo_url || "");
                }}
                className="flex-1 rounded-xl border border-slate-200 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-amber-500 py-3.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        ) : (
          // === 表示モード ===
          <div className="space-y-5">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                {CATEGORY_STYLE[record.category]?.emoji ? (
                  <Twemoji
                    emoji={CATEGORY_STYLE[record.category].emoji}
                    size={28}
                    ariaLabel={record.category}
                  />
                ) : (
                  <span className="text-2xl" aria-hidden>⚪</span>
                )}
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{record.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {record.recorded_date.toDate().toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-600">
                    {record.category}
                  </span>
                </div>
              </div>

              {/* 成長のめやす紐付け */}
              {milestone && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
                  <Twemoji emoji="🏆" size={20} ariaLabel="成長のめやす" />
                  <div>
                    <p className="text-xs font-medium text-green-600">成長のめやす</p>
                    <p className="text-sm font-medium text-green-800">{milestone.title}</p>
                    <p className="text-xs text-green-600">{milestone.age_hint} ・ {milestone.category}</p>
                  </div>
                </div>
              )}

              {record.memo && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {record.memo}
                  </p>
                </div>
              )}

              {/* 写真 */}
              {record.photo_url && (
                <div className="mt-4">
                  <img
                    src={record.photo_url}
                    alt=""
                    className="w-full rounded-xl object-cover"
                    style={{ maxHeight: "300px" }}
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleDeleteRequest}
              className="w-full rounded-xl border border-red-200 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
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
    <Suspense fallback={<div className="flex h-full items-center justify-center"><p className="text-slate-400">読み込み中...</p></div>}>
      <RecordDetail />
    </Suspense>
  );
}
