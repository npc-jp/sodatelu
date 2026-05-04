"use client";

// オンボーディング画面 — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom-extra2.jsx の BloomOnboarding
// PottedPlant 130px + 波線下線 + フッター固定 progress dots + primary CTA
//
// 既存ロジック維持:
//   - 最初の子ども情報を登録 (なまえ・たんじょうび・性別・写真)
//   - ファミリー作成 → users.family_id 更新 → child作成 を atomic に行う
//   - 失敗時は family / child のドキュメントを削除（ロールバック）

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { type Child } from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import {
  doc,
  getDoc,
  collection,
  writeBatch,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Cloud,
  PottedPlant,
  Sparkle,
  Sprout,
  Star,
  Sun,
  WavyLine,
} from "@/components/illustrations";

type Step = 0 | 1 | 2;

const GENDERS: { value: Child["gender"]; label: string; color: string }[] = [
  { value: "男の子", label: "男の子", color: "var(--bloom-primary)" },
  { value: "女の子", label: "女の子", color: "var(--bloom-pink)" },
  { value: "じぶんらしく", label: "じぶんらしく", color: "var(--bloom-yellow)" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { refreshChildren } = useChild();
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Child["gender"] | "">("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 認証ガード: 未ログインなら /login へ。
  // これがないと user=null のまま「はじめる」を押しても handleSubmit が
  // silent return してユーザーには「ボタンが効かない」ように見える
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/onboarding");
    }
  }, [authLoading, user, router]);

  function handleNext() {
    if (step < 2) {
      setStep((step + 1) as Step);
    }
  }

  function canProceed(): boolean {
    if (step === 0) return true; // ウェルカムは常に進める
    if (step === 1) return name.trim().length > 0 && birthDate.length > 0;
    if (step === 2) return gender !== "";
    return false;
  }

  async function handleSubmit() {
    if (!gender) {
      setError("性別を選んでください");
      return;
    }
    if (!user) {
      // ここに来るのは認証ガードを抜けて何かが起きたとき。silent failure を避ける
      setError("ログインが切れました。もう一度ログインしてください");
      router.replace("/login?next=/onboarding");
      return;
    }

    setLoading(true);
    setError("");

    // 既存 family があれば再利用（全削除→再onboarding時に新family孤児化を防ぐ）
    // users.family_id を読んで判定する
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const existingFamilyRef = userSnap.exists()
      ? (userSnap.data().family_id as DocumentReference | null | undefined)
      : null;

    const isNewFamily = !existingFamilyRef;
    const familyRef = existingFamilyRef ?? doc(collection(db, "families"));
    const childRef = doc(collection(db, "children"));

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

      // ファミリー作成（新規時のみ）・ユーザー更新（新規時のみ）・子ども作成を atomic に commit
      const batch = writeBatch(db);

      if (isNewFamily) {
        batch.set(familyRef, {
          family_name: `${name}の家族`,
          plan: "free",
          created_at: serverTimestamp(),
        });

        batch.set(
          userRef,
          {
            family_id: familyRef,
          },
          { merge: true }
        );
      }

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

      // ChildContext のキャッシュを更新してから /home へ。
      // これがないと /home の useEffect が古い空配列を見て /onboarding に戻すループになる
      await refreshChildren();
      router.replace("/home");
    } catch (err) {
      console.error("[onboarding] 登録失敗:", err);
      // batchが commit 失敗していたら Firestore 側に何も書かれていない（atomic）
      // ただし念のため、commit前に作られた可能性のある family / child を削除
      // 既存 family を再利用したケースでは family を消してはいけない
      if (!batchCommitted) {
        if (isNewFamily) {
          try {
            await deleteDoc(familyRef);
          } catch {
            // 元々作られていなければ no-op
          }
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

  // 認証読み込み中 or 未ログイン状態（リダイレクト前）はローディング表示
  // これがないと一瞬 step 0 が見えてからリダイレクトされてチラつく
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
      {/* 装飾: 太陽・雲・小スパークル・星 */}
      <div className="absolute pointer-events-none" style={{ top: 30, right: 24, opacity: 0.7 }}>
        <Cloud size={56} strokeColor="var(--bloom-line)" />
      </div>
      <div className="absolute pointer-events-none" style={{ top: 80, left: 24 }}>
        <Sun size={32} color="var(--bloom-yellow)" />
      </div>
      <div className="absolute pointer-events-none" style={{ top: 200, right: 30 }}>
        <Star size={14} color="var(--bloom-pink)" />
      </div>
      <div className="absolute pointer-events-none" style={{ top: 240, left: 30 }}>
        <Sparkle size={14} color="var(--bloom-accent)" />
      </div>

      {/* スキップ（最終ステップでは非表示） */}
      {step < 2 && (
        <div className="flex justify-end px-[18px] pt-3.5">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="text-[0.8125rem]"
            style={{
              color: "var(--bloom-ink-soft)",
              padding: "4px 10px",
              border: "1.5px solid var(--bloom-line-soft)",
              borderRadius: 10,
            }}
          >
            スキップ
          </button>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto px-7 pt-10 text-center">
        {step === 0 && (
          <>
            <div className="flex justify-center">
              <PottedPlant size={130} />
            </div>
            <div className="relative mx-auto mt-5 inline-block">
              <h1
                className="font-hand"
                style={{ fontSize: "1.625rem", color: "var(--bloom-ink)", lineHeight: 1.5 }}
              >
                ちいさな きせきを、
                <br />
                のこしましょう
              </h1>
              <div className="absolute" style={{ bottom: -8, left: "50%", transform: "translateX(-50%)" }}>
                <WavyLine width={180} color="var(--bloom-accent)" stroke={2.5} />
              </div>
            </div>
            <p
              className="mt-7 text-[0.8125rem]"
              style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.9 }}
            >
              できたこと、はじめたこと、感じたこと。
              <br />
              ぜんぶ、こども宛のお手紙になります。
            </p>

            {/* サンプルカード（記録のイメージ） */}
            <div
              className="bloom-border bloom-shadow-soft mt-7 rounded-[18px] p-3 text-left"
              style={{ background: "#fff" }}
            >
              <div className="flex items-baseline gap-1.5">
                <span
                  className="bloom-border-soft font-hand inline-block rounded-lg px-2 py-0.5 text-white"
                  style={{
                    background: "var(--bloom-primary)",
                    fontSize: "0.75rem",
                    borderColor: "var(--bloom-line)",
                    borderWidth: 1.5,
                    borderStyle: "solid",
                  }}
                >
                  できた
                </span>
                <div className="font-hand" style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}>
                  はじめての一歩
                </div>
                <div className="ml-auto text-[0.75rem]" style={{ color: "var(--bloom-ink-soft)" }}>
                  1y3m
                </div>
              </div>
              <div className="mt-1 text-[0.75rem]" style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.5 }}>
                リビングで、急に。
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="flex justify-center">
              <PottedPlant size={100} />
            </div>
            <h2
              className="font-hand mt-3"
              style={{ fontSize: "1.375rem", color: "var(--bloom-ink)" }}
            >
              はじめまして！
            </h2>
            <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--bloom-ink-soft)" }}>
              お子さまのことを すこし おしえてください
            </p>

            <div className="mt-7 text-left">
              <label
                className="font-hand mb-1.5 block"
                style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
              >
                ● なまえ
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="ニックネームでもOK"
                className="bloom-border bloom-shadow-soft block w-full rounded-[14px] px-3.5 py-3 text-[0.875rem] focus:outline-none"
                style={{ background: "#fff", color: "var(--bloom-ink)" }}
              />

              <label
                className="font-hand mt-4 mb-1.5 block"
                style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
              >
                ● 生まれた日
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                className="bloom-border bloom-shadow-soft block w-full rounded-[14px] px-3.5 py-3 text-[0.875rem] focus:outline-none"
                style={{ background: "#fff", color: "var(--bloom-ink)" }}
              />

              <label
                className="font-hand mt-4 mb-1.5 block"
                style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
              >
                ● 写真（任意）
              </label>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="block w-full cursor-pointer"
              >
                {photoPreview ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt="プレビュー"
                      className="bloom-border h-24 w-24 rounded-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="bloom-border-soft flex h-20 items-center justify-center rounded-[14px]"
                    style={{
                      borderStyle: "dashed",
                      borderWidth: 2,
                      borderColor: "var(--bloom-line-soft)",
                      background: "#fff",
                    }}
                  >
                    <span className="font-hand" style={{ color: "var(--bloom-ink-soft)", fontSize: "0.8125rem" }}>
                      ＋ 写真をえらぶ
                    </span>
                  </div>
                )}
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
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex justify-center">
              <Sparkle size={36} color="var(--bloom-accent)" />
            </div>
            <h2
              className="font-hand mt-3"
              style={{ fontSize: "1.375rem", color: "var(--bloom-ink)" }}
            >
              せいべつ を おしえてね
            </h2>
            <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}>
              いつでも変えられます。
              <br />
              「じぶんらしく」を選ぶと、表示はなまえだけになります。
            </p>

            <div className="mt-7 grid grid-cols-3 gap-2">
              {GENDERS.map((g) => {
                const active = gender === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`bloom-border ${active ? "bloom-shadow" : "bloom-shadow-soft"} rounded-[18px] py-4 text-center`}
                    style={{
                      background: active ? g.color : "#fff",
                      color: active ? "#fff" : "var(--bloom-ink)",
                    }}
                  >
                    <span className="font-hand" style={{ fontSize: "0.8125rem" }}>
                      {g.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && (
              <div
                className="bloom-border-soft mt-4 rounded-xl px-3 py-2 text-[0.8125rem]"
                style={{ background: "#FCE4D2", color: "#A8421B" }}
              >
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* フッター: progress dots + CTA */}
      <div
        className="px-7 pb-10 pt-5"
        style={{ background: "#fff", borderTop: "2px solid var(--bloom-line)" }}
      >
        {/* progress dots */}
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => {
            const current = i === step;
            return (
              <div
                key={i}
                style={{
                  width: current ? 22 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: current ? "var(--bloom-primary)" : "var(--bloom-line-soft)",
                  border: current ? "1.5px solid var(--bloom-line)" : "none",
                  transition: "width 0.3s",
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={step === 2 ? handleSubmit : handleNext}
          disabled={loading || !canProceed()}
          className="bloom-border bloom-shadow font-hand mt-3.5 w-full rounded-[14px] py-3.5 text-white disabled:opacity-50"
          style={{
            background: "var(--bloom-primary)",
            fontSize: "1rem",
            letterSpacing: "0.08em",
          }}
        >
          {loading
            ? "登録中…"
            : step === 2
              ? "はじめる ✦"
              : "つぎへ →"}
        </button>
      </div>
    </div>
  );
}
