// アカウント削除ロジック
//
// 「アカウントを削除する」操作の本体。GDPR / COPPA の「データ主体の削除権」を
// 満たすために、保護者さまが画面から1クリックで完全に削除できるフローを提供する。
//
// 設計方針:
//
// 1. ファミリーに自分以外のメンバーがいるかどうかで分岐する
//    - 単独メンバー → ファミリー全体（family / children / records / invitations / 写真）削除
//    - 複数メンバー → 自分だけ脱退（自分の users doc + Auth ユーザーのみ削除）
//
// 2. 削除順序は「子の情報 → 親の情報」の順で行う
//    - records → children → invitations → families → users → Auth
//    - これにより Firestore Rules 上の参照（users.family_id 経由）が
//      最後の users 削除直前まで保持され、各 delete 操作が許可される
//
// 3. Storage の写真は records.photo_url / children.photo_url を辿って明示的に削除する
//    - 各 photo_url を deleteRecordPhoto() に渡す
//    - 失敗してもフローは止めない（孤児ファイルは将来クリーンアップジョブで対処）
//
// 4. writeBatch で原子化できる Firestore 操作はバッチ化する
//    - ただし「Storage 削除」「Auth 削除」はバッチに乗らない
//    - 完全な atomicity は保証できないが、Firestore 側の整合性は確保
//
// 5. 失敗してもユーザーに何が起きたかを伝えられるよう、各ステップを try/catch で囲む
//    - photo 削除失敗は「削除を続行」、Firestore 失敗は「停止して通知」

import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { deleteUser, type User } from "firebase/auth";
import { db } from "./firebase";
import {
  childrenRef,
  recordsRef,
  invitationsRef,
  usersRef,
  type AppUser,
  type Child,
  type GrowthRecord,
} from "./firestore";
import { deleteRecordPhoto } from "./storage";

export type AccountDeletionResult = {
  // 「単独」or「メンバー脱退」のどちらだったか
  mode: "solo" | "leave";
  // 削除した records / children / invitations の件数（UI 表示用）
  deletedRecords: number;
  deletedChildren: number;
  deletedInvitations: number;
  // 削除に失敗した写真の数（致命でないので記録だけ）
  failedPhotoDeletes: number;
};

// ファミリーのメンバー数を確認するヘルパー
async function countFamilyMembers(
  familyRef: DocumentReference
): Promise<number> {
  const q = query(usersRef, where("family_id", "==", familyRef));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

// 1ファミリーに紐付くすべての children を取得
async function listFamilyChildren(
  familyRef: DocumentReference
): Promise<(Child & { id: string; ref: DocumentReference })[]> {
  const q = query(childrenRef, where("family_id", "==", familyRef));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ref: d.ref,
    ...(d.data() as Child),
  }));
}

// 1child に紐付くすべての records を取得
async function listChildRecords(
  childRef: DocumentReference
): Promise<(GrowthRecord & { id: string; ref: DocumentReference })[]> {
  const q = query(recordsRef, where("child_id", "==", childRef));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ref: d.ref,
    ...(d.data() as GrowthRecord),
  }));
}

// ファミリー宛の invitations をすべて取得（ステータス問わず）
async function listFamilyInvitations(
  familyRef: DocumentReference
): Promise<{ id: string; ref: DocumentReference }[]> {
  const q = query(invitationsRef, where("family_id", "==", familyRef));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ref: d.ref }));
}

// ===========================================================================
// メイン: アカウント削除
// ===========================================================================
//
// 引数: 現在ログイン中の Firebase Auth ユーザー
// 戻り値: 削除結果のサマリー
//
// 例外: Firestore / Auth の致命的な失敗時は throw。呼び出し側でユーザーに通知すること
//
export async function deleteOwnAccount(
  currentUser: User
): Promise<AccountDeletionResult> {
  const userId = currentUser.uid;
  const userRef = doc(db, "users", userId);

  // まず自分の users ドキュメントを取得して family_id を把握
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    // users ドキュメントが無いユーザーは、Auth 削除だけ行う
    await deleteUser(currentUser);
    return {
      mode: "leave",
      deletedRecords: 0,
      deletedChildren: 0,
      deletedInvitations: 0,
      failedPhotoDeletes: 0,
    };
  }

  const userData = userSnap.data() as AppUser;
  const familyRef = userData.family_id as DocumentReference | null;

  // ファミリー未所属（招待だけ受けている等）の場合: users + Auth 削除のみ
  if (!familyRef) {
    await safeDelete(userRef);
    await deleteUser(currentUser);
    return {
      mode: "leave",
      deletedRecords: 0,
      deletedChildren: 0,
      deletedInvitations: 0,
      failedPhotoDeletes: 0,
    };
  }

  // ファミリーのメンバー数を確認
  const memberCount = await countFamilyMembers(familyRef);

  if (memberCount > 1) {
    // 自分以外もメンバーがいる → 「自分だけ脱退」モード
    return await leaveFamily(currentUser, userRef);
  }

  // 自分が唯一のメンバー → 「ファミリー全削除」モード
  return await deleteFamilyAndSelf(currentUser, userRef, familyRef);
}

// ===========================================================================
// モード A: 自分だけファミリーから抜ける
// ===========================================================================
//
// 削除対象: 自分の users ドキュメント + Auth ユーザー
// 残るもの: family / children / records / invitations / 他メンバー
//
// 注意: Firestore Rules では users.delete は isSelf(userId) で許可されているため、
//       family_id を null にする更新は不要（直接 delete する）
//
async function leaveFamily(
  currentUser: User,
  userRef: DocumentReference
): Promise<AccountDeletionResult> {
  // 自分の users ドキュメントを削除
  await safeDelete(userRef);

  // Firebase Auth ユーザー削除
  // ※ Auth 削除には「最近のログイン」が必要。古いセッションだと requires-recent-login エラーが出る
  await deleteUser(currentUser);

  return {
    mode: "leave",
    deletedRecords: 0,
    deletedChildren: 0,
    deletedInvitations: 0,
    failedPhotoDeletes: 0,
  };
}

// ===========================================================================
// モード B: ファミリーごと完全削除（自分が唯一メンバー）
// ===========================================================================
//
// 削除順序:
//   1. records 全削除（child ごとにループ・写真も同時に削除）
//   2. children 全削除（プロフィール写真も削除）
//   3. invitations 全削除
//   4. family 削除
//   5. users 削除
//   6. Auth ユーザー削除
//
// この順序により、各ステップで Firestore Rules の前提（users.family_id が family を指す）
// が崩れない。
//
async function deleteFamilyAndSelf(
  currentUser: User,
  userRef: DocumentReference,
  familyRef: DocumentReference
): Promise<AccountDeletionResult> {
  let deletedRecords = 0;
  let deletedChildren = 0;
  let deletedInvitations = 0;
  let failedPhotoDeletes = 0;

  // --- 1. children を取得 ---
  const children = await listFamilyChildren(familyRef);

  // --- 2. 各 child の records と写真を削除 ---
  for (const child of children) {
    const records = await listChildRecords(child.ref);

    // 写真削除（並列・失敗は無視してカウントだけ）
    const photoUrls = records
      .map((r) => r.photo_url)
      .filter((url): url is string => Boolean(url));

    const photoResults = await Promise.allSettled(
      photoUrls.map((url) => deleteRecordPhoto(url))
    );
    failedPhotoDeletes += photoResults.filter(
      (r) => r.status === "rejected"
    ).length;

    // records 本体を batch 削除（500 件ごとに分割。Firestore 制限）
    const recordRefs = records.map((r) => r.ref);
    await batchDeleteRefs(recordRefs);
    deletedRecords += records.length;
  }

  // --- 3. 各 child のプロフィール写真と child 本体を削除 ---
  const childPhotoUrls = children
    .map((c) => c.photo_url)
    .filter((url): url is string => Boolean(url));

  const childPhotoResults = await Promise.allSettled(
    childPhotoUrls.map((url) => deleteRecordPhoto(url))
  );
  failedPhotoDeletes += childPhotoResults.filter(
    (r) => r.status === "rejected"
  ).length;

  await batchDeleteRefs(children.map((c) => c.ref));
  deletedChildren = children.length;

  // --- 4. invitations 削除 ---
  const invitations = await listFamilyInvitations(familyRef);
  await batchDeleteRefs(invitations.map((i) => i.ref));
  deletedInvitations = invitations.length;

  // --- 5. family 削除 ---
  // ※ users.family_id がまだこの family を指しているので、Rules の isMyFamily が通る
  await safeDelete(familyRef);

  // --- 6. users 削除 ---
  await safeDelete(userRef);

  // --- 7. Auth ユーザー削除 ---
  // ※ Firestore データ削除が成功したあとに行う（Auth が先に消えると Firestore 削除権限を失う）
  await deleteUser(currentUser);

  return {
    mode: "solo",
    deletedRecords,
    deletedChildren,
    deletedInvitations,
    failedPhotoDeletes,
  };
}

// ===========================================================================
// 共通ヘルパー
// ===========================================================================

// 単一ドキュメントを安全に削除（既に存在しない場合の例外を握り潰す）
async function safeDelete(ref: DocumentReference): Promise<void> {
  const { deleteDoc } = await import("firebase/firestore");
  try {
    await deleteDoc(ref);
  } catch (err: unknown) {
    const e = err as { code?: string };
    // not-found は正常系（既に削除済み）
    if (e.code === "not-found") return;
    throw err;
  }
}

// 複数 DocumentReference を writeBatch で削除
// Firestore の writeBatch は1回 500 オペレーション制限なので分割
async function batchDeleteRefs(refs: DocumentReference[]): Promise<void> {
  if (refs.length === 0) return;

  const CHUNK_SIZE = 450; // 500 制限に余裕を持たせる
  for (let i = 0; i < refs.length; i += CHUNK_SIZE) {
    const chunk = refs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}
