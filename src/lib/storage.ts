// Firebase Storage を使った画像アップロード・削除
// 画像はアップロード前にブラウザ側で圧縮する（通信量・容量節約）
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import imageCompression from "browser-image-compression";
import app from "./firebase";

const storage = getStorage(app);

// 画像を圧縮してFirebase Storageにアップロード → URLを返す
export async function uploadImage(
  file: File,
  path: string // 例: "records/abc123/photo.jpg"
): Promise<string> {
  // 圧縮オプション: 最大800px、最大0.5MB
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  });

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed);
  const url = await getDownloadURL(storageRef);
  return url;
}

// 記録に紐付いた写真を Firebase Storage から削除する
// photoUrl が getDownloadURL で得たフルURLでも、ref(storage, url) で参照できる
// 写真未設定（空文字列）の場合は何もしない
// すでに削除済み or 存在しない場合のエラー（storage/object-not-found）は無視する
export async function deleteRecordPhoto(photoUrl: string): Promise<void> {
  if (!photoUrl) return;
  try {
    const photoRef = ref(storage, photoUrl);
    await deleteObject(photoRef);
  } catch (err: unknown) {
    const e = err as { code?: string };
    // すでに存在しないオブジェクトは正常系として扱う
    if (e.code === "storage/object-not-found") return;
    // それ以外は呼び出し側に通知
    throw err;
  }
}
