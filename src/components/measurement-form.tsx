"use client";

// 身長・体重の計測フォーム（モーダル形式） — Bloom デザイン適用
// 仕様書: docs/growth-feature-spec-v1-2026-05-14.md A-3 / B-2 参照
//
// 用途:
//   - すくすくタブから「新しい計測を記録」で開く
//   - write 画面（記録作成）下部の「身長・体重も記録」ショートカットから開く
//
// props:
//   open: モーダル開閉
//   childId: 対象の子供ID
//   familyId: 対象のファミリーID（measurements 保存用）
//   createdByUid: 記録者のUID
//   initial?: 編集モード時に渡す既存 Measurement（id付き）
//   defaultDate?: 計測日のデフォルト（YYYY-MM-DD形式）。write画面からは記録日に合わせる
//   onClose: モーダルを閉じる
//   onSuccess?: 保存成功時のコールバック（リスト再フェッチ用）
//
// 設計:
//   - confirm-modal.tsx のオーバーレイ構造を踏襲（z-50・背景クリックで閉じる）
//   - 身長・体重のどちらか必須（両方 null は不可）
//   - 編集モードは initial が渡された場合のみ。child_id / family_id は変更不可

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import {
  addMeasurement,
  updateMeasurement,
  type Measurement,
} from "@/lib/firestore";
import BloomCard from "@/components/bloom-card";

type Props = {
  open: boolean;
  childId: string;
  familyId: string;
  createdByUid: string;
  initial?: (Measurement & { id: string }) | null;
  defaultDate?: string; // YYYY-MM-DD
  onClose: () => void;
  onSuccess?: () => void;
};

// 数値入力欄: 空欄→null、それ以外→parseFloat（NaNはnull扱い）
function parseDecimal(v: string): number | null {
  if (v === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// 数値→入力欄表示用の文字列。null/undefinedなら空
function decimalToString(n: number | null | undefined): string {
  if (n == null) return "";
  return String(n);
}

// Timestamp → YYYY-MM-DD
function tsToDateInput(ts: Timestamp): string {
  return ts.toDate().toISOString().split("T")[0];
}

export default function MeasurementForm({
  open,
  childId,
  familyId,
  createdByUid,
  initial,
  defaultDate,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = !!initial?.id;
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState<string>(today);
  const [heightStr, setHeightStr] = useState<string>("");
  const [weightStr, setWeightStr] = useState<string>("");
  const [memo, setMemo] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // モーダルが開かれた瞬間に初期値をセット（編集 / 新規 / defaultDate）
  // open が true→false→true と切り替わった時にも再セットされる
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDate(tsToDateInput(initial.measured_date));
      setHeightStr(decimalToString(initial.height_cm));
      setWeightStr(decimalToString(initial.weight_kg));
      setMemo(initial.memo || "");
    } else {
      setDate(defaultDate || today);
      setHeightStr("");
      setWeightStr("");
      setMemo("");
    }
    setError("");
    setSuccessMessage("");
    // dependencies の today / defaultDate は安定値想定。open の trigger だけで再セット
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  // Escキーで閉じる（confirm-modal と同じパターン）
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const height = parseDecimal(heightStr);
    const weight = parseDecimal(weightStr);

    // バリデーション: 身長か体重どちらか必須
    if (height == null && weight == null) {
      setError("身長または体重のどちらかを入力してください");
      return;
    }
    // 異常値（負・0以下）も弾く
    if (height != null && height <= 0) {
      setError("身長は0より大きい値で入力してください");
      return;
    }
    if (weight != null && weight <= 0) {
      setError("体重は0より大きい値で入力してください");
      return;
    }
    if (memo.length > 100) {
      setError("メモは100文字以内で入力してください");
      return;
    }

    setSaving(true);
    try {
      const measuredDate = new Date(date);
      if (isEdit && initial?.id) {
        await updateMeasurement(initial.id, {
          measured_date: measuredDate,
          height_cm: height,
          weight_kg: weight,
          memo,
        });
        setSuccessMessage("更新しました");
      } else {
        await addMeasurement({
          childId,
          familyId,
          measured_date: measuredDate,
          height_cm: height,
          weight_kg: weight,
          memo,
          createdByUid,
        });
        setSuccessMessage("きろくしました");
      }
      // 成功表示後、少し待ってからモーダルを閉じる
      // （ユーザーに保存できた手応えを伝える）
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      console.error("[measurement-form] 保存失敗:", err);
      setError("保存に失敗しました。もう一度お試しください");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="measurement-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
    >
      {/* 背景オーバーレイ。タップでキャンセル */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={() => {
          if (!saving) onClose();
        }}
        disabled={saving}
        className="absolute inset-0 bg-black/40"
      />

      {/* モーダル本体（BloomCard で統一感） */}
      <div
        className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto"
        style={{ background: "transparent" }}
      >
        <BloomCard className="p-5">
          <h2
            id="measurement-form-title"
            className="font-hand"
            style={{
              fontSize: "1.125rem",
              color: "var(--bloom-ink)",
              letterSpacing: "0.04em",
            }}
          >
            {isEdit ? "計測を編集" : "身長・体重をきろく"}
          </h2>
          <p
            className="mt-1 text-[0.75rem]"
            style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.6 }}
          >
            身長・体重は、どちらか一方でも記録できます。
          </p>

          <form onSubmit={handleSubmit} className="mt-3">
            {/* 計測日 */}
            <div
              className="font-hand mb-1.5"
              style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
            >
              ● いつ計った？
            </div>
            <BloomCard soft className="px-3.5 py-2.5">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="font-hand block w-full bg-transparent focus:outline-none"
                style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
              />
            </BloomCard>

            {/* 身長 */}
            <div
              className="font-hand mt-3 mb-1.5"
              style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
            >
              ● しんちょう（cm）
            </div>
            <BloomCard soft className="px-3.5 py-2.5">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={heightStr}
                onChange={(e) => setHeightStr(e.target.value)}
                placeholder="例: 63.5"
                className="font-hand block w-full bg-transparent focus:outline-none"
                style={{ fontSize: "0.9375rem", color: "var(--bloom-ink)" }}
              />
            </BloomCard>

            {/* 体重 */}
            <div
              className="font-hand mt-3 mb-1.5"
              style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
            >
              ● たいじゅう（kg）
            </div>
            <BloomCard soft className="px-3.5 py-2.5">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={weightStr}
                onChange={(e) => setWeightStr(e.target.value)}
                placeholder="例: 6.82"
                className="font-hand block w-full bg-transparent focus:outline-none"
                style={{ fontSize: "0.9375rem", color: "var(--bloom-ink)" }}
              />
            </BloomCard>

            {/* メモ */}
            <div
              className="font-hand mt-3 mb-1.5"
              style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
            >
              ● メモ（100字まで・任意）
            </div>
            <BloomCard soft className="px-3.5 py-2.5">
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                maxLength={100}
                placeholder="3ヶ月健診にて など"
                className="block w-full resize-none bg-transparent text-[0.8125rem] focus:outline-none"
                style={{ color: "var(--bloom-ink)", lineHeight: 1.7 }}
              />
            </BloomCard>

            {/* エラー */}
            {error && (
              <div
                className="mt-3 rounded-lg px-3 py-2 text-[0.8125rem]"
                style={{ background: "#FCE4D2", color: "#A8421B" }}
              >
                {error}
              </div>
            )}

            {/* 成功表示 */}
            {successMessage && (
              <div
                className="mt-3 rounded-lg px-3 py-2 text-center text-[0.8125rem]"
                style={{
                  background: "var(--bloom-primary-soft)",
                  color: "var(--bloom-ink)",
                }}
              >
                ✦ {successMessage}
              </div>
            )}

            {/* キャンセル + 保存ボタン */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="bloom-border font-hand flex-1 rounded-[14px] py-3 disabled:opacity-50"
                style={{
                  background: "#fff",
                  color: "var(--bloom-ink)",
                  fontSize: "0.875rem",
                }}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bloom-border bloom-shadow font-hand flex-1 rounded-[14px] py-3 text-white disabled:opacity-50"
                style={{
                  background: "var(--bloom-primary)",
                  fontSize: "0.875rem",
                  letterSpacing: "0.05em",
                }}
              >
                {saving ? "保存中…" : isEdit ? "更新する ✦" : "きろくする ✦"}
              </button>
            </div>
          </form>
        </BloomCard>
      </div>
    </div>
  );
}
