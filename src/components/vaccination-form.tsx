"use client";

// 予防接種の接種日入力モーダル — Bloom デザイン適用
// 仕様書: docs/growth-feature-spec-v1-2026-05-14.md A-2 / B-2 参照
//
// 用途:
//   - めやすタブの予防接種行から「接種日を入力」ボタンで開く
//   - 編集モード: 既存 VaccinationRecord を initial で渡せば更新
//
// props:
//   open: モーダル開閉
//   childId: 対象の子供ID
//   familyId: 対象のファミリーID
//   createdByUid: 記録者のUID
//   vaccineId: マスタJSONの vaccine.id（例: "hepatitis_b"）
//   doseNumber: 何回目の接種か
//   vaccineLabel: 表示用ラベル（例: "B型肝炎 1回目"）
//   initial?: 編集モード時の既存 VaccinationRecord
//   onClose: モーダルを閉じる
//   onSuccess?: 保存成功時のコールバック
//
// 設計:
//   - measurement-form.tsx のオーバーレイ構造を踏襲（z-50 / 背景クリックで閉じる）
//   - 接種日は任意（未入力でも完了扱いで保存可能）
//   - 既存記録の更新 / 新規作成は initial 有無で分岐

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import {
  addVaccination,
  updateVaccination,
  type VaccinationRecord,
} from "@/lib/firestore";
import BloomCard from "@/components/bloom-card";

type Props = {
  open: boolean;
  childId: string;
  familyId: string;
  createdByUid: string;
  vaccineId: string;
  doseNumber: number;
  vaccineLabel: string;
  initial?: (VaccinationRecord & { id: string }) | null;
  onClose: () => void;
  onSuccess?: () => void;
};

// Timestamp → YYYY-MM-DD
function tsToDateInput(ts: Timestamp): string {
  return ts.toDate().toISOString().split("T")[0];
}

export default function VaccinationForm({
  open,
  childId,
  familyId,
  createdByUid,
  vaccineId,
  doseNumber,
  vaccineLabel,
  initial,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = !!initial?.id;
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState<string>("");
  const [memo, setMemo] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // モーダルが開かれた瞬間に初期値をセット
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDate(
        initial.vaccinated_date ? tsToDateInput(initial.vaccinated_date) : ""
      );
      setMemo(initial.memo || "");
    } else {
      setDate(today);
      setMemo("");
    }
    setError("");
    setSuccessMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  // Escキーで閉じる
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

    if (memo.length > 100) {
      setError("メモは100文字以内で入力してください");
      return;
    }

    setSaving(true);
    try {
      // 日付未入力でも保存可能（完了チェックのみのケース）
      const vaccinatedDate = date ? new Date(date) : null;

      if (isEdit && initial?.id) {
        await updateVaccination(initial.id, {
          vaccinated_date: vaccinatedDate,
          memo,
        });
        setSuccessMessage("更新しました");
      } else {
        await addVaccination({
          childId,
          familyId,
          vaccineId,
          doseNumber,
          vaccinated_date: vaccinatedDate,
          memo,
          createdByUid,
        });
        setSuccessMessage("きろくしました");
      }
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      console.error("[vaccination-form] 保存失敗:", err);
      setError("保存に失敗しました。もう一度お試しください");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vaccination-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
    >
      {/* 背景オーバーレイ */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={() => {
          if (!saving) onClose();
        }}
        disabled={saving}
        className="absolute inset-0 bg-black/40"
      />

      {/* モーダル本体 */}
      <div
        className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto"
        style={{ background: "transparent" }}
      >
        <BloomCard className="p-5">
          <h2
            id="vaccination-form-title"
            className="font-hand"
            style={{
              fontSize: "1.125rem",
              color: "var(--bloom-ink)",
              letterSpacing: "0.04em",
            }}
          >
            {isEdit ? "接種きろくを編集" : "接種きろくを追加"}
          </h2>
          <p
            className="mt-1 text-[0.8125rem]"
            style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.6 }}
          >
            {vaccineLabel}
          </p>
          <p
            className="mt-1 text-[0.75rem]"
            style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.6 }}
          >
            接種日は任意です。日付がわからない場合も「完了」として記録できます。
          </p>

          <form onSubmit={handleSubmit} className="mt-3">
            {/* 接種日 */}
            <div
              className="font-hand mb-1.5"
              style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
            >
              ● 接種した日（任意）
            </div>
            <BloomCard soft className="px-3.5 py-2.5">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="font-hand block w-full bg-transparent focus:outline-none"
                style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
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
                placeholder="副反応なし など"
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

            {/* キャンセル + 保存 */}
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
                {saving ? "保存中…" : isEdit ? "更新する ✦" : "完了として記録 ✦"}
              </button>
            </div>
          </form>
        </BloomCard>
      </div>
    </div>
  );
}
