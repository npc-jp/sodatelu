"use client";

// ログインページ — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom.jsx の BloomLogin
// 上部 60% クリーム背景 + PottedPlant + WavyLine、下部 40% 白フォーム
//
// 既存ロジック維持: メール/パスワード認証 + Googleログイン + Firestore users 作成

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Cloud,
  PottedPlant,
  Sparkle,
  Star,
  Sun,
  WavyLine,
} from "@/components/illustrations";

const googleProvider = new GoogleAuthProvider();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // メール/パスワード認証
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", result.user.uid), {
          email: result.user.email,
          display_name: "",
          photo_url: "",
          uid: result.user.uid,
          created_time: serverTimestamp(),
          phone_number: "",
          family_id: null,
          role: "parent",
          is_handed_over: false,
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace("/home");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          setError("このメールアドレスは既に登録されています");
          break;
        case "auth/invalid-email":
          setError("メールアドレスの形式が正しくありません");
          break;
        case "auth/weak-password":
          setError("パスワードは6文字以上で入力してください");
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("メールアドレスまたはパスワードが間違っています");
          break;
        default:
          setError("エラーが発生しました。もう一度お試しください");
      }
    } finally {
      setLoading(false);
    }
  }

  // Googleログイン
  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Firestore users にユーザーが未登録なら作成
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: result.user.email,
          display_name: result.user.displayName || "",
          photo_url: result.user.photoURL || "",
          uid: result.user.uid,
          created_time: serverTimestamp(),
          phone_number: "",
          family_id: null,
          role: "parent",
          is_handed_over: false,
        });
      }

      router.replace("/home");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/popup-closed-by-user") {
        // ユーザーがポップアップを閉じた場合は何もしない
      } else {
        setError("Googleログインに失敗しました");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{ background: "var(--bloom-bg)" }}
    >
      {/* 装飾: 太陽・雲・小スパークル・星を散りばめ */}
      <div className="absolute pointer-events-none" style={{ top: 70, left: 30 }}>
        <Sun size={38} color="var(--bloom-yellow)" />
      </div>
      <div className="absolute pointer-events-none" style={{ top: 110, right: 26, opacity: 0.7 }}>
        <Cloud size={64} strokeColor="var(--bloom-line)" />
      </div>
      <div className="absolute pointer-events-none" style={{ top: 320, left: 24 }}>
        <Sparkle size={16} color="var(--bloom-accent)" />
      </div>
      <div className="absolute pointer-events-none" style={{ top: 280, right: 32 }}>
        <Star size={14} color="var(--bloom-pink)" />
      </div>

      {/* 上部: ヒーローエリア */}
      <div className="flex-1 px-7 pt-[100px] text-center">
        <div className="flex justify-center">
          <PottedPlant size={120} />
        </div>
        <div
          className="font-hand relative mt-3 inline-block"
          style={{ fontSize: 38, color: "var(--bloom-ink)", letterSpacing: "0.04em" }}
        >
          sodatelu
          <div className="absolute" style={{ bottom: -4, left: 0, right: 0 }}>
            <WavyLine width={170} color="var(--bloom-accent)" stroke={2.5} />
          </div>
        </div>
        <p
          className="mt-5 text-sm"
          style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.9 }}
        >
          こどもの まいにちを、
          <br />
          かぞくの たからものに。
        </p>
      </div>

      {/* 下部: フォームエリア（白 + 太線上） */}
      <div
        className="px-7 pb-10 pt-7"
        style={{
          background: "#fff",
          borderTop: "2px solid var(--bloom-line)",
        }}
      >
        <div className="mx-auto max-w-sm">
          {/* Googleログイン */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="bloom-border bloom-shadow-soft mb-3 flex w-full items-center justify-center gap-3 rounded-[14px] py-3 text-sm font-medium disabled:opacity-50"
            style={{ background: "#fff", color: "var(--bloom-ink)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Googleではじめる
          </button>

          {/* メール / パスワード */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="メールアドレス"
              className="block w-full rounded-xl px-3.5 py-3 text-[13px] focus:outline-none"
              style={{
                background: "var(--bloom-bg)",
                border: "1.5px solid var(--bloom-line-soft)",
                color: "var(--bloom-ink)",
              }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="パスワード（6文字以上）"
              className="block w-full rounded-xl px-3.5 py-3 text-[13px] focus:outline-none"
              style={{
                background: "var(--bloom-bg)",
                border: "1.5px solid var(--bloom-line-soft)",
                color: "var(--bloom-ink)",
              }}
            />

            {error && (
              <div
                className="rounded-lg px-3 py-2 text-xs"
                style={{ background: "#FCE4D2", color: "#A8421B" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bloom-border bloom-shadow font-hand mt-1 w-full rounded-[14px] py-3.5 text-white disabled:opacity-50"
              style={{
                background: "var(--bloom-primary)",
                fontSize: 15,
                letterSpacing: "0.1em",
              }}
            >
              {loading ? "処理中…" : isSignUp ? "登録してはじめる" : "はじめる"}
            </button>

            <p className="pt-2 text-center text-[12px]" style={{ color: "var(--bloom-ink-soft)" }}>
              {isSignUp ? "すでにアカウントをお持ちですか？" : "アカウントをお持ちでないですか？"}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="font-hand ml-1.5"
                style={{ color: "var(--bloom-accent)" }}
              >
                {isSignUp ? "ログイン" : "新規登録"}
              </button>
            </p>
          </form>

          <p className="mt-4 text-center text-[11px]" style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}>
            登録することで
            <Link
              href="/privacy"
              className="mx-0.5 underline"
              style={{ color: "var(--bloom-accent)" }}
            >
              プライバシーポリシー
            </Link>
            に同意したものとみなします
          </p>
        </div>
      </div>
    </div>
  );
}
