"use client";

// 認証状態をアプリ全体で共有するコンテキスト
// ログイン済み→Home、未ログイン→Loginにリダイレクトする判定に使う
//
// 副作用として、ログイン状態を `sodatelu_auth` cookie に書き込む。
// これは Next.js の proxy.ts（middleware）が認証必須パスへの未認証アクセスを
// 軽量に検知するための印で、本物のセキュリティ境界は Firestore Rules で担保している。
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

const AUTH_COOKIE_NAME = "sodatelu_auth";

// クライアントサイドで auth cookie を書き込む
// SameSite=Lax / Path=/ で全パスから読める。HTTPS 本番では Secure を付けたい
function setAuthCookie() {
  if (typeof document === "undefined") return;
  // 7日間（毎回 onAuthStateChanged で更新されるので実質永続）
  const maxAge = 60 * 60 * 24 * 7;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${AUTH_COOKIE_NAME}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

// クライアントサイドで auth cookie を削除する
function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase Authの状態変化を監視
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      // proxy.ts 用の認証印 cookie を更新
      if (user) {
        setAuthCookie();
        // users ドキュメントに displayName/email を保存（merge でドキュメント無くても作成）
        // これがないと /family のメンバー一覧で「?」表示になる
        try {
          await setDoc(
            doc(db, "users", user.uid),
            {
              email: user.email,
              display_name: user.displayName || user.email,
              last_login_at: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (e) {
          // ログイン直後の権限エラーなどは無視（家族未所属時など）
          console.error("[auth-context] users 同期失敗:", e);
        }
      } else {
        clearAuthCookie();
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
