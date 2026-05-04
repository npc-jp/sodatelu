"use client";

// 子ども追加画面 — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom-extra.jsx の BloomAddChild
// Sprout / PottedPlant / なまえ・生まれた日・性別カード3つ / primary CTA
//
// 既存ロジック維持: 2人目以降の子どもを追加。無料プランは2人まで制限

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { usePlan } from "@/lib/plan-context";
import { createChild, type Child } from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomCard from "@/components/bloom-card";
import { Heart, PottedPlant, Sprout } from "@/components/illustrations";

const GENDER_OPTIONS: {
  value: Child["gender"];
  label: string;
  color: string;
}[] = [
  { value: "男の子", label: "男の子", color: "var(--bloom-primary)" },
  { value: "女の子", label: "女の子", color: "var(--bloom-pink)" },
  { value: "じぶんらしく", label: "じぶんらしく", color: "var(--bloom-yellow)" },
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
  const photoInputRef = useRef<HTMLInputElement>(null);
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

      // 既存ユーザーの family_id を取得
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

  const limitReached = !isPremium && existingKids.length >= 2;

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--bloom-bg)" }}
    >
      <BloomAppHeader
        title="きょうだいを追加"
        showBack
        rightSlot={<Sprout size={16} color="var(--bloom-primary)" />}
      />

      <main className="flex-1 overflow-y-auto px-[18px] pt-5 pb-10">
        {/* ヒーロー */}
        <div className="mb-5 text-center">
          <div className="flex justify-center">
            <PottedPlant size={84} />
          </div>
          <p
            className="font-hand mt-2"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
          >
            あたらしい家族が、ふえました。
          </p>
        </div>

        {/* 制限メッセージ */}
        {limitReached && (
          <BloomCard soft color="var(--bloom-yellow)" className="mb-4 p-3.5">
            <p
              className="text-center text-[0.8125rem]"
              style={{ color: "var(--bloom-ink)", lineHeight: 1.6 }}
            >
              無料プランでは1人まで登録できます。
              <br />
              プレミアムにアップグレードすると、何人でも追加できます
            </p>
          </BloomCard>
        )}

        <form onSubmit={handleSubmit}>
          {/* なまえ */}
          <div
            className="font-hand mb-1.5"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● なまえ
          </div>
          <BloomCard soft className="mb-4 px-3.5 py-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="ニックネームでもOK"
              className="font-hand block w-full bg-transparent focus:outline-none"
              style={{ fontSize: "1rem", color: "var(--bloom-ink)" }}
            />
          </BloomCard>

          {/* 生まれた日 */}
          <div
            className="font-hand mb-1.5"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● 生まれた日
          </div>
          <BloomCard soft className="mb-4 px-3.5 py-3">
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              className="font-hand block w-full bg-transparent focus:outline-none"
              style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
            />
          </BloomCard>

          {/* 性別 */}
          <div
            className="font-hand mb-1.5"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● 性別
          </div>
          <div className="grid grid-cols-3 gap-2">
            {GENDER_OPTIONS.map((g) => {
              const active = gender === g.value;
              return (
                <BloomCard
                  key={g.value}
                  soft={!active}
                  color={active ? g.color : "#fff"}
                  className="cursor-pointer"
                >
                  <button
                    type="button"
                    onClick={() => setGender(g.value)}
                    className="block w-full px-1 py-3.5 text-center"
                    style={{ color: active ? "#fff" : "var(--bloom-ink)" }}
                  >
                    <div className="font-hand" style={{ fontSize: "0.8125rem" }}>
                      {g.label}
                    </div>
                  </button>
                </BloomCard>
              );
            })}
          </div>

          {/* 説明 */}
          <BloomCard
            soft
            color="var(--bloom-primary-soft)"
            className="mt-4 flex items-center gap-2.5 p-3.5"
          >
            <Heart size={18} color="var(--bloom-accent)" />
            <p
              className="flex-1 text-[0.75rem]"
              style={{ color: "var(--bloom-ink)", lineHeight: 1.6 }}
            >
              性別はいつでも変更できます。
              <br />
              「じぶんらしく」を選ぶと、表示はなまえだけになります。
            </p>
          </BloomCard>

          {/* 写真（任意） */}
          <div
            className="font-hand mt-4 mb-1.5"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● 写真（任意）
          </div>
          {photoPreview ? (
            <div className="flex justify-center">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="プレビュー"
                  className="bloom-border h-24 w-24 rounded-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="bloom-border absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: "#fff", color: "var(--bloom-ink)", fontSize: "0.8125rem" }}
                  aria-label="写真を削除"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="block w-full cursor-pointer rounded-[14px] py-5 text-center"
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

          {error && (
            <div
              className="mt-4 rounded-xl px-3.5 py-2.5 text-[0.8125rem]"
              style={{
                background: "#FCE4D2",
                color: "#A8421B",
                border: "1.5px solid var(--bloom-line)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !gender || limitReached}
            className="bloom-border bloom-shadow font-hand mt-5 w-full rounded-[14px] py-3.5 text-white disabled:opacity-50"
            style={{
              background: "var(--bloom-primary)",
              fontSize: "1rem",
              letterSpacing: "0.08em",
            }}
          >
            {loading ? "登録中…" : "追加する ✦"}
          </button>
        </form>
      </main>
    </div>
  );
}
