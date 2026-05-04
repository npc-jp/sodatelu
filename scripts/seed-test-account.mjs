// テスト用アカウントとデータを投入するスクリプト
// - wizardaz1976@me.com で新規アカウント作成
// - 男の子（そうた・2014/4/15生まれ）と女の子（はなこ・2022/8/20生まれ）を登録
// - 各 milestone に紐付いた記録 + 自由記録を投入
// - 写真は10件程度（picsum.photos）
//
// 使い方:
//   node scripts/seed-test-account.mjs

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

// === Firebase config（本番JSバンドルから取得済み） ===
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDPHqxsxGkymJ3RSVV3V0ioO0xAL3l9XqM",
  projectId: "sodatelu",
};

// === テストアカウント情報 ===
const TEST_ACCOUNT = {
  email: "wizardaz1976@me.com",
  password: "sodatelu_test_2026",
};

// === 子ども情報 ===
const CHILDREN = [
  {
    name: "そうた",
    birth_date: new Date("2014-04-15T00:00:00+09:00"),
    gender: "男の子",
  },
  {
    name: "はなこ",
    birth_date: new Date("2022-08-20T00:00:00+09:00"),
    gender: "女の子",
  },
];

// === マイルストーンデータを TS から読み込み ===
async function loadMilestones() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const tsPath = path.resolve(__dirname, "../src/lib/milestones-data.ts");
  const src = await fs.readFile(tsPath, "utf-8");
  // 簡易パース: 各オブジェクト { id: "M-...", title: "...", category: "...", age_hint: "..." }
  const milestones = [];
  const re = /id:\s*"(M-\d+)"[^}]*?title:\s*"([^"]+)"[^}]*?category:\s*"([^"]+)"[^}]*?phase:\s*(\d+)[^}]*?age_hint:\s*"([^"]+)"/gs;
  let m;
  while ((m = re.exec(src)) !== null) {
    milestones.push({
      id: m[1],
      title: m[2],
      category: m[3],
      phase: parseInt(m[4]),
      age_hint: m[5],
    });
  }
  return milestones;
}

// === age_hint → 月齢 ===
function ageHintToMonths(hint) {
  let m;
  if ((m = hint.match(/生後(\d+)〜?(\d+)?週/))) return Math.max(1, Math.round((parseInt(m[1]) * 7) / 30));
  if ((m = hint.match(/生後(\d+)〜?(\d+)?ヶ月/))) return parseInt(m[1]);
  if ((m = hint.match(/生後(\d+)年/))) return parseInt(m[1]) * 12;
  if ((m = hint.match(/生後(\d+)日/))) return Math.max(0, Math.round(parseInt(m[1]) / 30));
  if ((m = hint.match(/^(\d+)〜?(\d+)?ヶ月/))) return parseInt(m[1]);
  if ((m = hint.match(/(\d+)〜?(\d+)?歳/))) return parseInt(m[1]) * 12;
  return 0;
}

// === Firestore field 変換 ===
function toField(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (v && v.__ref) return { referenceValue: v.__ref };
  if (v && v.__server) return { timestampValue: new Date().toISOString() }; // serverTimestamp 代替
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toField) } };
  if (typeof v === "object") {
    const fields = {};
    Object.entries(v).forEach(([k, val]) => (fields[k] = toField(val)));
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function toFields(obj) {
  const fields = {};
  Object.entries(obj).forEach(([k, v]) => (fields[k] = toField(v)));
  return fields;
}

function ref(collection, id) {
  return { __ref: `projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${collection}/${id}` };
}

const serverTimestamp = () => ({ __server: true });

// === Firebase Auth (REST) ===
async function signUp(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return r.json();
}

async function signIn(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return r.json();
}

// === Firestore REST ===
async function createDoc(idToken, collection, docId, data) {
  const base = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${collection}`;
  const url = docId
    ? `${base}?documentId=${encodeURIComponent(docId)}`
    : base;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`createDoc ${collection}/${docId}: ${JSON.stringify(j.error)}`);
  return j;
}

async function listByRef(idToken, collection, fieldPath, refPath) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath },
          op: "EQUAL",
          value: { referenceValue: refPath },
        },
      },
    },
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!Array.isArray(j)) return [];
  return j.filter((item) => item.document).map((item) => item.document.name);
}

async function deleteByName(idToken, fullName) {
  const url = `https://firestore.googleapis.com/v1/${fullName}`;
  await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  });
}

async function setDocMerge(idToken, fullPath, data) {
  // PATCH with updateMask=field1&updateMask=field2 で merge 動作
  const base = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${fullPath}`;
  const masks = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const url = `${base}?${masks}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`setDocMerge ${fullPath}: ${JSON.stringify(j.error)}`);
  return j;
}

// === 月齢計算 / 日付生成 ===
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Math.floor(months));
  // ランダム +0〜25日でずらし（同じ月に複数記録が並ぶようにバラす）
  d.setDate(d.getDate() + Math.floor(Math.random() * 25));
  return d;
}

// === 自由記録のテンプレート ===
const FREE_RECORDS = [
  { age: 1, category: "感じた", title: "初めての笑顔（自然に）", memo: "目が合った瞬間ふわっと笑った気がした" },
  { age: 4, category: "始めた", title: "離乳食スタート", memo: "おかゆをひとくち。最初は変な顔" },
  { age: 7, category: "始めた", title: "ハイハイ開始", memo: "ずりばいから本格ハイハイに" },
  { age: 13, category: "言った", title: "「ママ」と呼んでくれた", memo: "ママだけ嬉しそうに連呼" },
  { age: 18, category: "始めた", title: "保育園入園", memo: "泣かずに行けて拍子抜け" },
  { age: 24, category: "がんばった", title: "イヤイヤ期 真っ最中", memo: "全部いやいや" },
  { age: 30, category: "言った", title: "「あのね」が口癖に", memo: "話したいことが溢れる時期" },
  { age: 36, category: "おめでとう", title: "保育園進級", memo: "うさぎ組から年少へ" },
  { age: 48, category: "行った", title: "家族で初めての遠出", memo: "新幹線で旅行。窓に張り付き" },
  { age: 60, category: "がんばった", title: "縄跳び10回連続", memo: "ずっと練習してた" },
  { age: 72, category: "おめでとう", title: "卒園式", memo: "もう小学生だなんて" },
  { age: 78, category: "始めた", title: "ピアノを習いはじめる", memo: "本人がやりたいと" },
  { age: 84, category: "できた", title: "初めての一人寝", memo: "自分から「もう一人で寝る」と" },
  { age: 96, category: "感じた", title: "夜空を見上げて", memo: "「宇宙ってすごいね」と急に" },
  { age: 108, category: "言った", title: "「ありがとう」を自然に", memo: "気持ちを言葉にできるように" },
  { age: 120, category: "がんばった", title: "運動会のリレー", memo: "アンカーで2位ゴール" },
  { age: 132, category: "おめでとう", title: "委員長に立候補", memo: "自分から手を挙げた" },
  { age: 138, category: "感じた", title: "好きな本に夢中", memo: "シリーズ全巻読破中" },
];

// === 写真 URL ===
function picsumUrl(seed) {
  return `https://picsum.photos/seed/sodatelu-${seed}/600/600`;
}

async function main() {
  console.log("\n=== sodatelu テストデータ投入 ===\n");

  // 1. アカウント作成 or 既存ログイン
  console.log("1. アカウント作成中...");
  let auth = await signUp(TEST_ACCOUNT.email, TEST_ACCOUNT.password);
  if (auth.error) {
    if (auth.error.message === "EMAIL_EXISTS") {
      console.log("  既存アカウント検出 → サインイン");
      auth = await signIn(TEST_ACCOUNT.email, TEST_ACCOUNT.password);
    }
    if (auth.error) {
      throw new Error(`Auth エラー: ${JSON.stringify(auth.error)}`);
    }
  }
  const { idToken, localId: uid } = auth;
  console.log(`  uid=${uid}`);

  // 1.5 既存のテストデータをクリーンアップ（再実行で重複しないよう）
  console.log("1.5 既存のテストデータを掃除...");
  // users → family_id を取得
  const userRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${uid}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  const userDoc = await userRes.json();
  if (userDoc.fields?.family_id?.referenceValue) {
    const oldFamilyRef = userDoc.fields.family_id.referenceValue;
    // records (family_id一致) 削除
    const oldRecords = await listByRef(idToken, "records", "family_id", oldFamilyRef);
    console.log(`  削除予定 records: ${oldRecords.length}件`);
    for (const name of oldRecords) await deleteByName(idToken, name);
    // children (family_id一致) 削除
    const oldChildren = await listByRef(idToken, "children", "family_id", oldFamilyRef);
    console.log(`  削除予定 children: ${oldChildren.length}件`);
    for (const name of oldChildren) await deleteByName(idToken, name);
    // family 削除
    await deleteByName(idToken, oldFamilyRef);
    console.log(`  family 削除完了`);
  } else {
    console.log("  既存データなし");
  }

  // 2. users ドキュメント初期化（family_id: null で作成 or 既存放置）
  console.log("2. users ドキュメント作成...");
  await setDocMerge(idToken, `users/${uid}`, {
    email: TEST_ACCOUNT.email,
    display_name: "テストおとうさん",
    photo_url: "",
    uid,
    created_time: serverTimestamp(),
    phone_number: "",
    family_id: null,
    role: "parent",
    is_handed_over: false,
    beta_tester: true, // β特典付き
    last_login_at: serverTimestamp(),
  });

  // 3. families 作成
  console.log("3. families 作成...");
  const familyRes = await createDoc(idToken, "families", null, {
    family_name: "テスト家族",
    plan: "free",
    created_at: serverTimestamp(),
  });
  const familyId = familyRes.name.split("/").pop();
  console.log(`  family_id=${familyId}`);

  // 4. users.family_id を更新
  await setDocMerge(idToken, `users/${uid}`, {
    family_id: ref("families", familyId),
  });

  // 5. children 作成
  console.log("4. children 作成...");
  const childIds = [];
  for (const c of CHILDREN) {
    const res = await createDoc(idToken, "children", null, {
      name: c.name,
      birth_date: c.birth_date,
      gender: c.gender,
      family_id: ref("families", familyId),
      user_id: ref("users", uid),
      photo_url: picsumUrl(`child-${c.name}`),
      is_handed_over: false,
    });
    const cid = res.name.split("/").pop();
    childIds.push(cid);
    console.log(`  ${c.name}: id=${cid}`);
  }

  // 6. milestones マスター読み込み
  console.log("5. マイルストーン情報読み込み...");
  const milestones = await loadMilestones();
  console.log(`  ${milestones.length} 件のマイルストーン`);

  // 7. 各子どもに記録投入
  console.log("6. 記録投入...");
  let totalRecords = 0;
  for (let i = 0; i < CHILDREN.length; i++) {
    const child = CHILDREN[i];
    const childId = childIds[i];
    const now = new Date();
    const ageMonths = Math.floor((now - child.birth_date) / (30.44 * 24 * 60 * 60 * 1000));
    console.log(`\n  ${child.name} (現在${Math.floor(ageMonths / 12)}歳${ageMonths % 12}ヶ月):`);

    // milestone 紐付け記録
    let msCount = 0;
    for (const ms of milestones) {
      const monthAtMilestone = ageHintToMonths(ms.age_hint);
      // 子どもの現在年齢を超える milestone はスキップ
      if (monthAtMilestone > ageMonths) continue;
      const recordedDate = addMonths(child.birth_date, monthAtMilestone);
      // 未来日付は除外
      if (recordedDate > now) continue;
      const appCategory = ms.category === "人生節目" ? "おめでとう" : "できた";
      const photoUrl = Math.random() < 0.15 ? picsumUrl(`${child.name}-${ms.id}`) : "";

      await createDoc(idToken, "records", null, {
        title: ms.title,
        category: appCategory,
        recorded_date: recordedDate,
        memo: "",
        milestone_id: ref("milestones", ms.id),
        child_id: ref("children", childId),
        family_id: ref("families", familyId),
        user_id: ref("users", uid),
        photo_url: photoUrl,
        recorded_by_uid: uid,
        recorded_by_name: "テストおとうさん",
        created_at: serverTimestamp(),
      });
      msCount++;
    }
    console.log(`    めやす紐付け: ${msCount}件`);
    totalRecords += msCount;

    // 自由記録（年齢に応じて）
    let freeCount = 0;
    for (const fr of FREE_RECORDS) {
      if (fr.age > ageMonths) continue;
      const recordedDate = addMonths(child.birth_date, fr.age);
      if (recordedDate > now) continue;
      const photoUrl = Math.random() < 0.4 ? picsumUrl(`${child.name}-free-${fr.age}`) : "";

      await createDoc(idToken, "records", null, {
        title: fr.title,
        category: fr.category,
        recorded_date: recordedDate,
        memo: fr.memo,
        milestone_id: null,
        child_id: ref("children", childId),
        family_id: ref("families", familyId),
        user_id: ref("users", uid),
        photo_url: photoUrl,
        recorded_by_uid: uid,
        recorded_by_name: "テストおとうさん",
        created_at: serverTimestamp(),
      });
      freeCount++;
    }
    console.log(`    自由記録: ${freeCount}件`);
    totalRecords += freeCount;
  }

  console.log(`\n=== 完了: 合計 ${totalRecords} 件の記録 ===`);
  console.log(`\nログイン情報:`);
  console.log(`  メール: ${TEST_ACCOUNT.email}`);
  console.log(`  パスワード: ${TEST_ACCOUNT.password}`);
  console.log(`  https://sodatelu.vercel.app からログインして確認可能`);
}

main().catch((err) => {
  console.error("\n投入失敗:", err);
  process.exit(1);
});
