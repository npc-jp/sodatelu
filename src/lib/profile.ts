// プロフィール（自分自身）の更新ヘルパー
// - ニックネーム: Firebase Auth.updateProfile + Firestore users.display_name の両方を同期
// - メールアドレス: 古いパスワードで reauthenticate → verifyBeforeUpdateEmail で確認メール送信
//   実際の反映はユーザーが新メールのリンクを踏んだとき
//   Google ログインユーザーはこのフローでは変更できない（Google側で管理）

import {
  type User,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// プロバイダ判定（Google ログインかメール/パスワードログインか）
export function isPasswordProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "password");
}

export function isGoogleProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "google.com");
}

// === ニックネーム更新 ===
// Firebase Auth.displayName と Firestore users.display_name を同期
export async function updateUserDisplayName(
  user: User,
  displayName: string
): Promise<void> {
  const trimmed = displayName.trim();
  await updateProfile(user, { displayName: trimmed });
  // Firestore 側も更新（merge で既存フィールド保持）
  await setDoc(
    doc(db, "users", user.uid),
    { display_name: trimmed },
    { merge: true }
  );
}

// === メールアドレス変更（確認メール送信） ===
// 古いパスワードで再認証 → 新メールに確認リンクを送る。
// ユーザーが新メールのリンクを踏むと Firebase 側で確定し、次回ログイン以降は新メールが正となる。
// Firestore 側の users.email は次回ログイン時に auth-context が同期する。
export async function requestEmailChange(
  user: User,
  currentPassword: string,
  newEmail: string
): Promise<void> {
  if (!user.email) {
    throw new Error("現在のメールアドレスが取得できません");
  }
  if (!isPasswordProvider(user)) {
    throw new Error(
      "Google等の外部アカウントでログインしているため、このアプリ内ではメールアドレスを変更できません"
    );
  }

  // 古いメール+パスワードで再認証（Firebase が直近のログイン認証を要求するため）
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);

  // 新メールに確認リンクを送信。ユーザーがリンクを踏んで初めて変更が確定する
  await verifyBeforeUpdateEmail(user, newEmail.trim());
}
