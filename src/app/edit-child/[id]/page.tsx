"use client";

// 子ども編集画面 — Bloom デザイン適用
// 既存の add-child を編集モードに拡張。名前・生年月日・性別・写真を更新できる。
// 削除は ConfirmModal で2段階確認（家族から外す。記録は残す）

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import {
  deleteChild,
  updateChild,
  type Child,
} from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomCard from "@/components/bloom-card";
import ConfirmModal from "@/components/confirm-modal";
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

// Timestamp(ms) を <input type="date"> 用の "YYYY-MM-DD" に変換
function toDateInputValue(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function EditChildPage() {
  const params = useParams<{ id: string }>();
  const childId = params.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { children: existingKids, refreshChildren, selectChild, loading: childLoading } = useChild();

  const target = existingKids.find((k) => k.id === childId);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Child["gender"] | "">("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCleared, setPhotoCleared] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // 認証ガード
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/family");
    }
  }, [authLoading, user, router]);

  // 子どもデータが読めたら初期値をセット
  useEffect(() => {
    if (childLoading || hydrated || !target) return;
    setName(target.name);
    setBirthDate(toDateInputValue(target.birth_date.toDate().getTime()));
    setGender(target.gender);
    setPhotoPreview(target.photo_url || null);
    setHydrated(true);
  }, [childLoading, target, hydrated]);

  // 子どもが見つからない（kids読込済 & target なし）→ family へ戻す
  useEffect(() => {
    if (!childLoading && existingKids.length > 0 && !target) {
      router.replace("/family");
    }
  }, [childLoading, existingKids, target, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !gender || !target) return;

    setLoading(true);
    setError("");

    try {
      // 写真の決定:
      //   - photoFile があればアップロード
      //   - photoCleared なら "" にする（削除）
      //   - どちらでもなければ undefined（既存値維持）
      let photoUrl: string | undefined;
      if (photoFile) {
        photoUrl = await uploadImage(
          photoFile,
          `children/${user.uid}/${Date.now()}_${photoFile.name}`
        );
      } else if (photoCleared) {
        photoUrl = "";
      }

      await updateChild(childId, {
        name,
        birth_date: new Date(birthDate),
        gender,
        photo_url: photoUrl,
      });

      await refreshChildren();
      router.replace("/family");
    } catch (err) {
      console.error("[edit-child] 更新失敗:", err);
      setError("更新に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!target) return;
    setDeleting(true);
    setError("");
    try {
      await deleteChild(childId);
      await refreshChildren();
      // 残った子のうち先頭を選択（ChildContext内で自動的に選ばれる想定だが念のため）
      const remaining = existingKids.filter((k) => k.id !== childId);
      if (remaining.length > 0) {
        selectChild(remaining[0].id);
      }
      router.replace("/family");
    } catch (err) {
      console.error("[edit-child] 削除失敗:", err);
      setError("削除に失敗しました");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  // ローディング表示
  if (authLoading || childLoading || !target || !hydrated) {
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
      className="flex h-full flex-col"
      style={{ background: "var(--bloom-bg)" }}
    >
      <BloomAppHeader
        title="プロフィール編集"
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
            style={{ fontSize: 13, color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
          >
            {target.name} のプロフィール
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* なまえ */}
          <div
            className="font-hand mb-1.5"
            style={{ fontSize: 13, color: "var(--bloom-ink)" }}
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
              style={{ fontSize: 16, color: "var(--bloom-ink)" }}
            />
          </BloomCard>

          {/* 生まれた日 */}
          <div
            className="font-hand mb-1.5"
            style={{ fontSize: 13, color: "var(--bloom-ink)" }}
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
              style={{ fontSize: 14, color: "var(--bloom-ink)" }}
            />
          </BloomCard>

          {/* 性別 */}
          <div
            className="font-hand mb-1.5"
            style={{ fontSize: 13, color: "var(--bloom-ink)" }}
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
                    <div className="font-hand" style={{ fontSize: 13 }}>
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
              className="flex-1 text-[12px]"
              style={{ color: "var(--bloom-ink)", lineHeight: 1.6 }}
            >
              性別はいつでも変更できます。
              <br />
              「じぶんらしく」を選ぶと、表示はなまえだけになります。
            </p>
          </BloomCard>

          {/* 写真 */}
          <div
            className="font-hand mt-4 mb-1.5"
            style={{ fontSize: 13, color: "var(--bloom-ink)" }}
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
                    setPhotoCleared(true);
                  }}
                  className="bloom-border absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: "#fff", color: "var(--bloom-ink)", fontSize: 13 }}
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
                    setPhotoCleared(false);
                  }
                }}
              />
            </>
          )}

          {error && (
            <div
              className="mt-4 rounded-xl px-3.5 py-2.5 text-[13px]"
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
            disabled={loading || !gender}
            className="bloom-border bloom-shadow font-hand mt-5 w-full rounded-[14px] py-3.5 text-white disabled:opacity-50"
            style={{
              background: "var(--bloom-primary)",
              fontSize: 16,
              letterSpacing: "0.08em",
            }}
          >
            {loading ? "保存中…" : "保存する ✦"}
          </button>

          {/* 削除（破壊的アクション・分離して下部に配置） */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading || deleting}
            className="mt-6 block w-full text-center text-[13px] disabled:opacity-50"
            style={{ color: "#A8421B", textDecoration: "underline" }}
          >
            {target.name} のプロフィールを削除する
          </button>
        </form>
      </main>

      <ConfirmModal
        open={showDeleteConfirm}
        title={`${target.name} を削除しますか？`}
        description="家族から外れます。これまでの記録は残ります。元に戻せません。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
