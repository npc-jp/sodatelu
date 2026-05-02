"use client";

// 確認モーダル: window.confirm() の代替
// Capacitor (iOS WKWebView) 環境でも安定して動作するように、
// HTML/Tailwind でビジュアルに統一感のあるモーダルを実装する。
//
// 使用例:
//   const [open, setOpen] = useState(false);
//   <ConfirmModal
//     open={open}
//     title="この記録を削除しますか？"
//     description="削除すると元に戻せません。"
//     confirmLabel="削除する"
//     cancelLabel="キャンセル"
//     destructive
//     onConfirm={async () => { await deleteRecord(...); setOpen(false); }}
//     onCancel={() => setOpen(false)}
//   />

import { useEffect } from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // true のときは「削除する」など破壊的アクション用の赤系ボタンに切り替える
  destructive?: boolean;
  // confirm/cancel ボタン押下中はボタン無効化（ローディング表示用）
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "OK",
  cancelLabel = "キャンセル",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Escキーでキャンセルできるようにする（Web版での操作性向上）
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      {/* 背景オーバーレイ。タップでキャンセル */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={onCancel}
        disabled={loading}
        className="absolute inset-0 bg-black/40 transition-opacity"
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="confirm-modal-title"
          className="text-lg font-bold text-slate-800"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {description}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
              destructive
                ? "bg-red-500 hover:bg-red-600"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {loading ? "処理中..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
