"use client";

// オンボーディング: 最初の子ども情報を登録する画面
// ファミリー作成 → users.family_id 更新 → child作成 を atomic に行う
// 途中で失敗した場合は rollback（family / child のドキュメントを削除）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { type Child } from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Twemoji from "@/components/twemoji";
import { Camera, User } from "lucide-react";

const GENDER_OPTIONS: { value: Child["gender"]; label: string; emoji: string }[] = [
  { value: "男の子", label: "男の子", emoji: "👦" },
  { value: "女の子", label: "女の子", emoji: "👧" },
  { value: "じぶんらしく", label: "じぶんらしく", emoji: "🌈" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
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

    // 後続のロールバック用にIDを先に確保
    const familyRef = doc(collection(db, "families"));
    const childRef = doc(collection(db, "children"));
    const userRef = doc(db, "users", user.uid);

    // どこまで進んだかを記録（失敗時にロールバック判断に使う）
    let photoUrl = "";
    let batchCommitted = false;

    try {
      // 写真があればアップロード（batchの外で実行: Storage upload はトランザクション不可）
      if (photoFile) {
        photoUrl = await uploadImage(
          photoFile,
          `children/${user.uid}/${Date.now()}_${photoFile.name}`
        );
      }

      // ファミリー作成・ユーザー更新・子ども作成を atomic に commit
      // writeBatch なら全成功 or 全失敗で Firestore 上の一貫性が保たれる
      const batch = writeBatch(db);

      batch.set(familyRef, {
        family_name: `${name}の家族`,
        plan: "free",
        created_at: serverTimestamp(),
      });

      // users ドキュメントが存在しない可能性があるため set with merge を使う
      // （Firebase Auth でユーザー作成しても Firestore の users ドキュメントは自動作成されない）
      batch.set(userRef, {
        family_id: familyRef,
      }, { merge: true });

      batch.set(childRef, {
        name,
        birth_date: Timestamp.fromDate(new Date(birthDate)),
        gender,
        family_id: familyRef,
        user_id: userRef,
        photo_url: photoUrl,
        is_handed_over: false,
      });

      await batch.commit();
      batchCommitted = true;

      router.replace("/home");
    } catch (err) {
      console.error("[onboarding] 登録失敗:", err);

      // batchが commit 失敗していたら Firestore 側に何も書かれていない（atomic）
      // ただし念のため、commit前に作られた可能性のある family / child を削除しておく
      if (!batchCommitted) {
        try {
          await deleteDoc(familyRef);
        } catch {
          // 元々作られていなければ no-op
        }
        try {
          await deleteDoc(childRef);
        } catch {
          // 元々作られていなければ no-op
        }
      }

      setError("登録に失敗しました。もう一度お試しください");
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 上部 */}
      <div className="bg-gradient-to-b from-amber-400 to-amber-500 px-6 pb-10 pt-16 text-center">
        <div className="flex justify-center">
          <Twemoji emoji="👶" size={64} ariaLabel="" />
        </div>
        <h1 className="mt-3 text-2xl font-bold text-white">はじめまして！</h1>
        <p className="mt-2 text-sm text-amber-100">
          お子さまの情報を教えてください
        </p>
      </div>

      {/* フォーム */}
      <div className="flex-1 rounded-t-3xl bg-white px-6 py-8" style={{ marginTop: "-1.5rem" }}>
        <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-6">
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
            <label className="mb-2 block text-sm font-bold text-slate-600">
              おなまえ
            </label>
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
            <label className="mb-2 block text-sm font-bold text-slate-600">
              たんじょうび
            </label>
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
            <label className="mb-2 block text-sm font-bold text-slate-600">
              せいべつ
            </label>
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
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !gender}
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
