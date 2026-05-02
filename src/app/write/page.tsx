"use client";

// 記録入力画面: カテゴリ選択 + マイルストーン紐付け + タイトル + メモ + 日付
import { useState, useEffect, Suspense } from "react";
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
import BottomNav from "@/components/bottom-nav";
import AppHeader from "@/components/app-header";
import Twemoji from "@/components/twemoji";
import MilestonePicker from "@/components/milestone-picker";
import { Camera, X, Lock } from "lucide-react";

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

function WriteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { selectedChild } = useChild();
  const { isPremium } = usePlan();

  // URLパラメータがあればそれを使い、なければ選択中の子ども
  const childId = searchParams.get("childId") || selectedChild?.id || "";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MilestoneCategory | "">("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneData | null>(null);
  // この子どもの記録で既に紐付け済みのめやすID（ピッカーから除外する）
  const [linkedMilestoneIds, setLinkedMilestoneIds] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // 選択中の子どもが切り替わったら、紐付け済みのめやすID一覧を再取得する
  // 全フェーズの56項目から「すでに紐付けられている項目」を引いた残りをピッカーに見せる
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
        // 取得失敗時は除外なしで動かす（最悪でも全項目が見えるだけ・記録は壊れない）
        console.error("[write] getLinkedMilestoneIds 失敗:", err);
        if (!cancelled) setLinkedMilestoneIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [childId]);

  // マイルストーンを選択 → 紐付けるだけ。タイトルは変えない
  function selectMilestone(ms: MilestoneData) {
    setSelectedMilestone(ms);
    setCategory(milestoneToAppCategory(ms.category));
    setShowMilestones(false);
    // タイトルが空のときだけプレースホルダー的に入れる
    if (!title) {
      setTitle("");
    }
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
    } catch {
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (saved) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-amber-50">
        <div className="text-center">
          <div className="flex justify-center">
            <Twemoji emoji="🌱" size={56} ariaLabel="" />
          </div>
          <p className="mt-4 text-xl font-bold text-amber-600">記録しました！</p>
          <p className="mt-2 text-sm text-slate-500">ホームに戻ります...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <AppHeader title="きろくする" showBack onBack={() => router.back()} />

      <main className="flex-1 overflow-y-auto px-5 pb-24 pt-5">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* カテゴリ選択 */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              カテゴリ
            </label>
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

          {/* 成長のめやす紐付け（全フェーズ表示・紐付け済みは非表示） */}
          <div>
            {selectedMilestone ? (
              // 選択済みのめやす表示
              <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
                <span className="text-green-600">✓</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    {selectedMilestone.title}
                  </p>
                  <p className="text-xs text-green-600">
                    {selectedMilestone.age_hint} ・ {selectedMilestone.category}
                  </p>
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
              // 開閉ボタン
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

          {/* タイトル（自由入力） */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder={selectedMilestone ? `例：${selectedMilestone.title}ができた日` : "はじめて歩いた！"}
            />
          </div>

          {/* 日付 */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              いつ？
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* メモ */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              メモ
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="そのときの様子を自由に書いてください"
            />
          </div>

          {/* 写真 */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              写真（任意）
            </label>
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="プレビュー"
                  className="w-full rounded-xl object-cover"
                  style={{ maxHeight: "240px" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  aria-label="写真を削除"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                </button>
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

          <button
            type="submit"
            disabled={loading || !category}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              "保存中..."
            ) : (
              <>
                きろくする
                <Twemoji emoji="🌱" size={20} />
              </>
            )}
          </button>
        </form>
      </main>

      <BottomNav current="write" />
    </div>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><p className="text-slate-400">読み込み中...</p></div>}>
      <WriteForm />
    </Suspense>
  );
}
