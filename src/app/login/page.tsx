"use client";

// ログインページ: メール/パスワード + Googleログイン
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
import SodateluLogo from "@/components/sodatelu-logo";

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

      // Firestoreにユーザーが未登録なら作成
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
    <div className="flex h-full flex-col">
      {/* 上部のブランドエリア */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-amber-400 to-amber-500 px-6">
        <div className="text-center">
          {/* スプラッシュ用ロゴ（白版・縦並び） */}
          <div className="flex justify-center">
            <SodateluLogo
              variant="white"
              layout="stacked"
              height={180}
              ariaLabel="sodatelu"
            />
          </div>
          <p className="mt-2 text-sm text-amber-100">
            子どもの成長を、家族の物語に
          </p>
        </div>
      </div>

      {/* 下部のフォームエリア */}
      <div className="rounded-t-3xl bg-white px-6 py-8 shadow-lg" style={{ marginTop: "-1.5rem" }}>
        <div className="mx-auto max-w-sm">
          {/* Googleログインボタン */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3.5 text-base font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Googleでログイン
          </button>

          {/* 区切り線 */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">または</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* メール/パスワードフォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="メールアドレス"
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="パスワード（6文字以上）"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-500 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50"
            >
              {loading
                ? "処理中..."
                : isSignUp
                  ? "新規登録"
                  : "ログイン"}
            </button>

            <p className="text-center text-sm text-slate-500">
              {isSignUp ? "すでにアカウントをお持ちですか？" : "アカウントをお持ちでないですか？"}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="ml-1 font-medium text-amber-600 hover:text-amber-700"
              >
                {isSignUp ? "ログイン" : "新規登録"}
              </button>
            </p>
          </form>

          {/* 利用規約・プライバシーポリシーへの同意 */}
          <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
            登録することで
            <Link
              href="/privacy"
              className="mx-0.5 text-amber-600 hover:text-amber-700"
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
