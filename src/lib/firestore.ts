// Firestoreの操作をまとめたユーティリティ
// 設計仕様書v3のコレクション定義に基づく
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  DocumentReference,
} from "firebase/firestore";
import { db } from "./firebase";

// === 型定義（Firestoreのドキュメント構造） ===

export type Family = {
  id?: string;
  family_name: string;
  plan: "free" | "premium";
  created_at: Timestamp;
};

export type AppUser = {
  id?: string;
  email: string;
  display_name: string;
  photo_url: string;
  uid: string;
  created_time: Timestamp;
  phone_number: string;
  family_id: DocumentReference | null;
  role: "parent" | "child";
  is_handed_over: boolean;
  // コミュニティ統計データ提供への同意（オプトイン）
  // 未設定なら未同意扱い。設定画面から本人が切替可能。
  community_stats_opt_in?: boolean;
};

export type Child = {
  id?: string;
  name: string;
  birth_date: Timestamp;
  gender: "男の子" | "女の子" | "じぶんらしく";
  family_id: DocumentReference | null;
  user_id: DocumentReference | null;
  photo_url: string;
  is_handed_over: boolean;
};

export type MilestoneCategory =
  | "できた"
  | "おめでとう"
  | "始めた"
  | "がんばった"
  | "感じた"
  | "言った"
  | "行った"
  | "やめた"
  | "あげた・もらった"
  | "のりこえた"
  | "ありがとう";

export type GrowthRecord = {
  id?: string;
  title: string;
  category: MilestoneCategory;
  child_id: DocumentReference;
  milestone_id: DocumentReference | null;
  recorded_date: Timestamp;
  memo: string;
  photo_url: string;
  // Phase 2: 誰が記録したか
  recorded_by_uid?: string;
  recorded_by_name?: string;
};

// 招待の型定義
export type Invitation = {
  id?: string;
  family_id: DocumentReference;
  invited_email: string;
  invited_by_uid: string;
  invited_by_name: string;
  status: "pending" | "accepted" | "declined";
  created_at: Timestamp;
};

// === コレクション参照 ===

export const familiesRef = collection(db, "families");
export const usersRef = collection(db, "users");
export const childrenRef = collection(db, "children");
export const milestonesRef = collection(db, "milestones");
export const recordsRef = collection(db, "records");
export const invitationsRef = collection(db, "invitations");

// === ファミリー作成（初回登録時） ===

export async function createFamily(familyName: string) {
  return addDoc(familiesRef, {
    family_name: familyName,
    plan: "free",
    created_at: serverTimestamp(),
  });
}

// === 子ども登録 ===

export async function createChild(data: {
  name: string;
  birth_date: Date;
  gender: Child["gender"];
  userId: string;
  familyId: string;
  photoUrl?: string;
}) {
  return addDoc(childrenRef, {
    name: data.name,
    birth_date: Timestamp.fromDate(data.birth_date),
    gender: data.gender,
    family_id: doc(db, "families", data.familyId),
    user_id: doc(db, "users", data.userId),
    photo_url: data.photoUrl || "",
    is_handed_over: false,
  });
}

// === 子どものプロフィール写真を更新 ===

export async function updateChildPhoto(childId: string, photoUrl: string) {
  return updateDoc(doc(db, "children", childId), {
    photo_url: photoUrl,
  });
}

// === 子ども情報を更新（名前・誕生日・性別・写真） ===
// photo_url は undefined のとき更新しない（既存写真保持）
// 引き渡し済（is_handed_over）状態は触らない

export async function updateChild(
  childId: string,
  data: {
    name: string;
    birth_date: Date;
    gender: Child["gender"];
    photo_url?: string;
  }
) {
  const update: Record<string, unknown> = {
    name: data.name,
    birth_date: Timestamp.fromDate(data.birth_date),
    gender: data.gender,
  };
  if (data.photo_url !== undefined) {
    update.photo_url = data.photo_url;
  }
  return updateDoc(doc(db, "children", childId), update);
}

// === 子どもを削除 ===
// 注: 紐付く growth_records は残る。完全削除はバッチ処理で別途対応
// （誤削除リカバリ余地を残す＋削除専用ジョブの方が安全）

export async function deleteChild(childId: string) {
  return deleteDoc(doc(db, "children", childId));
}

// === ファミリーの子どもを取得（family_idベース） ===
// 同じファミリーのメンバー全員が同じ子ども一覧を見られる

export async function getChildrenByFamily(familyId: string) {
  const familyRef = doc(db, "families", familyId);
  const q = query(childrenRef, where("family_id", "==", familyRef));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as (Child & { id: string })[];
}

// === ユーザーのchildren取得（後方互換 + family_id対応） ===

export async function getChildrenByUser(userId: string) {
  // まずユーザーのfamily_idを取得。
  // getDocFromServer を使うのは pending writes に引きずられて family_id が
  // 一時的に見えなくなる問題（PlanProvider と同じ）を回避するため。
  // 別端末初回ログイン時に「子どもがいない」と誤判定されるのを防ぐ。
  const userSnap = await getDocFromServer(doc(db, "users", userId));
  if (!userSnap.exists()) return [];

  const familyRef = userSnap.data().family_id;
  if (familyRef) {
    // family_idがあればファミリー単位で取得（招待メンバーも同じ子どもが見える）
    return getChildrenByFamily(familyRef.id);
  }

  // family_idがない場合はuser_idで取得（後方互換）
  const userRef = doc(db, "users", userId);
  const q = query(childrenRef, where("user_id", "==", userRef));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as (Child & { id: string })[];
}

// === 記録の追加（recorded_by付き） ===

export async function createRecord(data: {
  title: string;
  category: MilestoneCategory;
  childId: string;
  recorded_date: Date;
  memo: string;
  milestoneId?: string;
  photoUrl?: string;
  recordedByUid?: string;
  recordedByName?: string;
}) {
  return addDoc(recordsRef, {
    title: data.title,
    category: data.category,
    child_id: doc(db, "children", data.childId),
    milestone_id: data.milestoneId ? doc(db, "milestones", data.milestoneId) : null,
    recorded_date: Timestamp.fromDate(data.recorded_date),
    memo: data.memo,
    photo_url: data.photoUrl || "",
    recorded_by_uid: data.recordedByUid || "",
    recorded_by_name: data.recordedByName || "",
  });
}

// === 記録の更新 ===

export async function updateRecord(
  recordId: string,
  data: {
    title: string;
    category: MilestoneCategory;
    recorded_date: Date;
    memo: string;
    milestoneId?: string;
    photoUrl?: string;
    /** 記録対象の子ども差し替え（兄弟取り違え修正用）。undefined なら維持 */
    childId?: string;
  }
) {
  const updateData: Record<string, unknown> = {
    title: data.title,
    category: data.category,
    recorded_date: Timestamp.fromDate(data.recorded_date),
    memo: data.memo,
    milestone_id: data.milestoneId ? doc(db, "milestones", data.milestoneId) : null,
  };
  if (data.photoUrl !== undefined) {
    updateData.photo_url = data.photoUrl;
  }
  if (data.childId !== undefined) {
    updateData.child_id = doc(db, "children", data.childId);
  }
  return updateDoc(doc(db, "records", recordId), updateData);
}

// === 記録の削除 ===
// レコードに紐付く写真があれば Storage 側からも削除する
// （Storageの孤児ファイルが残らないようにする）
export async function deleteRecord(recordId: string) {
  // 動的importで storage 依存をここでだけ読み込む（循環参照回避）
  const { deleteRecordPhoto } = await import("./storage");

  // 先に photo_url を取得しておく（doc削除後だと参照できないため）
  const recordRef = doc(db, "records", recordId);
  const snap = await getDoc(recordRef);
  const photoUrl = snap.exists() ? (snap.data().photo_url as string | undefined) : undefined;

  // 写真があれば先に削除を試みる。失敗しても記録本体は削除する
  if (photoUrl) {
    try {
      await deleteRecordPhoto(photoUrl);
    } catch (err) {
      // 写真の削除失敗は致命ではない（記録だけ消すケースを許容）
      console.error("[deleteRecord] 写真の削除に失敗:", err);
    }
  }

  return deleteDoc(recordRef);
}

// === 子どもの記録を取得（日付順） ===

export async function getRecordsByChild(childId: string) {
  const childRef = doc(db, "children", childId);
  const q = query(
    recordsRef,
    where("child_id", "==", childRef)
  );
  const snapshot = await getDocs(q);
  const records = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as (GrowthRecord & { id: string })[];
  return records.sort((a, b) => b.recorded_date.seconds - a.recorded_date.seconds);
}

// === 子どもの記録から、すでに紐付けされているマイルストーンID一覧を取得 ===
// 「成長のめやすに紐付ける」セレクターで、紐付け済みのめやすを選択肢から
// 除外するために使う。同じめやすに何度も紐付ける必要はない（1度限りの記録が本質）。
//
// milestone_id は DocumentReference なので、参照先のドキュメントID（M-001 等）を
// 取り出して文字列配列で返す。
export async function getLinkedMilestoneIds(childId: string): Promise<string[]> {
  const records = await getRecordsByChild(childId);
  return records
    .map((r) => r.milestone_id?.id)
    .filter((id): id is string => Boolean(id));
}

// === 招待を送る ===

export async function sendInvitation(data: {
  familyId: string;
  invitedEmail: string;
  invitedByUid: string;
  invitedByName: string;
}) {
  // 同じ家族・同じメールで pending な招待が既にあれば、新規作成せず再送扱いに
  // （二度押し・LINE再送等で重複ドキュメントが生まれないように）
  const familyRef = doc(db, "families", data.familyId);
  const existingQ = query(
    invitationsRef,
    where("family_id", "==", familyRef),
    where("invited_email", "==", data.invitedEmail),
    where("status", "==", "pending")
  );
  const existing = await getDocs(existingQ);
  if (!existing.empty) {
    const existingDoc = existing.docs[0];
    await updateDoc(existingDoc.ref, {
      created_at: serverTimestamp(),
      invited_by_uid: data.invitedByUid,
      invited_by_name: data.invitedByName,
    });
    return existingDoc;
  }
  return addDoc(invitationsRef, {
    family_id: familyRef,
    invited_email: data.invitedEmail,
    invited_by_uid: data.invitedByUid,
    invited_by_name: data.invitedByName,
    status: "pending",
    created_at: serverTimestamp(),
  });
}

// === 自分宛ての招待を取得 ===

export async function getInvitationsForEmail(email: string) {
  const q = query(
    invitationsRef,
    where("invited_email", "==", email),
    where("status", "==", "pending")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as (Invitation & { id: string })[];
}

// === 招待を承認（ユーザーのfamily_idを更新） ===

export async function acceptInvitation(invitationId: string, userId: string) {
  const invSnap = await getDoc(doc(db, "invitations", invitationId));
  if (!invSnap.exists()) return;

  const invitation = invSnap.data();
  const familyRef = invitation.family_id;

  // ユーザーのfamily_idを招待元のファミリーに変更
  await updateDoc(doc(db, "users", userId), {
    family_id: familyRef,
  });

  // 招待ステータスを更新
  await updateDoc(doc(db, "invitations", invitationId), {
    status: "accepted",
  });
}

// === 招待を辞退 ===

export async function declineInvitation(invitationId: string) {
  await updateDoc(doc(db, "invitations", invitationId), {
    status: "declined",
  });
}

// === ファミリーメンバーを取得 ===

export async function getFamilyMembers(familyId: string) {
  const familyRef = doc(db, "families", familyId);
  const q = query(usersRef, where("family_id", "==", familyRef));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as (AppUser & { id: string })[];
}

// === ユーザー設定: コミュニティ統計オプトインを更新 ===
// プライバシー設定画面から呼ばれる。未認証では失敗する（Rules で isSelf 必須）
export async function updateCommunityStatsOptIn(
  userId: string,
  optIn: boolean
) {
  return updateDoc(doc(db, "users", userId), {
    community_stats_opt_in: optIn,
  });
}

// === ユーザー設定の現在値を取得 ===
export async function getUserSettings(userId: string) {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    email: (data.email as string | undefined) || "",
    display_name: (data.display_name as string | undefined) || "",
    community_stats_opt_in: Boolean(data.community_stats_opt_in),
  };
}

// === ファミリーの保留中の招待を取得 ===

export async function getPendingInvitations(familyId: string) {
  const familyRef = doc(db, "families", familyId);
  const q = query(
    invitationsRef,
    where("family_id", "==", familyRef),
    where("status", "==", "pending")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as (Invitation & { id: string })[];
}
