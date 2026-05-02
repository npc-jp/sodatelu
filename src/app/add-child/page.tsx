"use client";

// 子ども追加ページ: 2人目以降の子どもを追加
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { usePlan } from "@/lib/plan-context";
import { createChild, getChildrenByUser, type Child } from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AppHeader from "@/components/app-header";
import Twemoji from "@/components/twemoji";
import { Camera, User, Lock } from "lucide-react";

const GENDER_OPTIONS: { value: Child["gender"]; label: string; emoji: string }[] = [
  { value: "男の子", label: "男の子", emoji: "👦" },
  { value: "女の子", label: "女の子", emoji: "👧" },
  { value: "じぶんらしく", label: "じぶんらしく", emoji: "🌈" },
];

export default function AddChildPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { children: existingKids, refreshChildren, selectChild } = useChild();
  const { isPremium } = usePlan();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Child["gender"] | "">("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !gender) return;

    setLoading(true);
    setError("");

    try {
      // 写真アップロード
      let photoUrl = "";
      if (photoFile) {
        photoUrl = await uploadImage(
          photoFile,
          `children/${user.uid}/${Date.now()}_${photoFile.name}`
        );
      }

      // 既存ユーザーのfamily_idを取得
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userData = userSnap.data();
      const familyRef = userData?.family_id;

      if (!familyRef) {
        setError("ファミリー情報が見つかりません");
        return;
      }

      const childDoc = await createChild({
        name,
        birth_date: new Date(birthDate),
        gender,
        userId: user.uid,
        familyId: familyRef.id,
        photoUrl,
      });

      // 新しい子どもを選択状態にする
      await refreshChildren();
      selectChild(childDoc.id);
      router.replace("/home");
    } catch {
      setError("登録に失敗しました。もう一度お試しください");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー */}
      <AppHeader
        title="きょうだいを追加"
        subtitle="新しいお子さまの情報を教えてください"
        subtitlePosition="below"
        showBack
        onBack={() => router.back()}
        paddingBottomClass="pb-10"
      />

      {/* フォーム */}
      <div className="flex-1 rounded-t-3xl bg-white px-6 py-8 -mt-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-6">
          {/* 無料版制限チェック */}
          {!isPremium && existingKids.length >= 2 && (
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-amber-800">
                <Lock className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                無料プランでは1人まで登録できます
              </p>
              <p className="mt-1 text-xs text-amber-600">
                プレミアムプランにアップグレードすると、きょうだいを何人でも追加できます
              </p>
            </div>
          )}

          {/* プロフィール写真 */}
          <div className="flex justify-center">
            <label className="cursor-pointer">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="プロフィール"
                    className="h-24 w-24 rounded-full object-cover shadow-md"
                  />
                  <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow">
                    <Camera className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </div>
                </div>
              ) : (
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 shadow-inner">
                  <User className="h-10 w-10 text-slate-300" strokeWidth={1.5} aria-hidden="true" />
                  <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow">
                    <Camera className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </div>
                </div>
              )}
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
          </div>

          {/* 名前 */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">おなまえ</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="ニックネームでもOK"
            />
          </div>

          {/* 生年月日 */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">たんじょうび</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* 性別 */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">せいべつ</label>
            <div className="flex gap-3">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGender(option.value)}
                  className={`flex-1 rounded-2xl border-2 py-4 text-center transition-all ${
                    gender === option.value
                      ? "border-amber-500 bg-amber-50 shadow-sm"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <span className="flex justify-center">
                    <Twemoji emoji={option.emoji} size={28} ariaLabel={option.label} />
                  </span>
                  <span className={`mt-1 block text-xs font-medium ${
                    gender === option.value ? "text-amber-700" : "text-slate-600"
                  }`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !gender || (!isPremium && existingKids.length >= 2)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              "登録中..."
            ) : (
              <>
                そだてる
                <Twemoji emoji="🌱" size={20} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
