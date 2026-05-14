// テスト用アカウントに身長・体重の計測記録（measurements）を投入するスクリプト
// - 既存の seed-test-account.mjs と同じテストアカウント（wizardaz1976@me.com）を対象
// - そうた（男・2014/4/15生・12歳）: 0歳〜12歳まで誕生月（毎年4月）に1件・合計13件
// - はなこ（女・2022/8/20生・3歳）: 0/3/6/12/18/24/30/36ヶ月時点で各1件・合計8件
// - 公式パーセンタイル値（CFA2023 / 文科省R6）から p50付近に±5%の自然な揺らぎ
//
// 使い方:
//   1. .env.local に SODATELU_TEST_EMAIL=... と SODATELU_TEST_PASSWORD=... を設定
//   2. node --env-file=.env.local scripts/seed-measurements.mjs
//
// 冪等性: 再実行で「テストアカウントの全 measurements」を一掃→再投入する。
//          305kg等のバグデータがあっても本スクリプトで削除される。

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

// === Firebase config（本番JSバンドルから取得済み・公開情報） ===
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDPHqxsxGkymJ3RSVV3V0ioO0xAL3l9XqM",
  projectId: "sodatelu",
};

// === テストアカウント情報（.env.local から読み込み） ===
const TEST_ACCOUNT = {
  email: process.env.SODATELU_TEST_EMAIL,
  password: process.env.SODATELU_TEST_PASSWORD,
};
if (!TEST_ACCOUNT.email || !TEST_ACCOUNT.password) {
  console.error(
    "Error: .env.local に SODATELU_TEST_EMAIL / SODATELU_TEST_PASSWORD を設定してください"
  );
  process.exit(1);
}

// === Firestore field 変換ヘルパー（seed-test-account.mjs と同パターン） ===
function toField(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (v && v.__ref) return { referenceValue: v.__ref };
  if (v && v.__server) return { timestampValue: new Date().toISOString() };
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
  return {
    __ref: `projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${collection}/${id}`,
  };
}

const serverTimestamp = () => ({ __server: true });

// === Firebase Auth (REST) ===
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
  const url = docId ? `${base}?documentId=${encodeURIComponent(docId)}` : base;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`createDoc ${collection}: ${JSON.stringify(j.error)}`);
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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
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

async function getDoc(idToken, fullPath) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${fullPath}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  return r.json();
}

// === 成長曲線パーセンタイルJSONを読み込み ===
async function loadPercentiles() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const cfa = JSON.parse(
    await fs.readFile(
      path.resolve(__dirname, "../public/data/growth-percentiles-cfa2023.json"),
      "utf-8"
    )
  );
  const mext = JSON.parse(
    await fs.readFile(
      path.resolve(__dirname, "../public/data/growth-percentiles-mext-school.json"),
      "utf-8"
    )
  );
  return { cfa, mext };
}

// === 月齢→p50 値取得（CFAデータと文科省データを境界で接続） ===
// gender: 'male' | 'female', kind: 'height' | 'weight', ageMonths: number
function getP50(cfa, mext, gender, kind, ageMonths) {
  if (ageMonths <= 72) {
    const series = cfa[gender][kind];
    // 該当 ageMonths を直接探す（1ヶ月刻みで埋まっている）
    const point = series.find((p) => p.ageMonths === ageMonths);
    if (point) return point.p50;
    // フォールバック: 線形補間
    const sorted = series.sort((a, b) => a.ageMonths - b.ageMonths);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].ageMonths <= ageMonths && sorted[i + 1].ageMonths >= ageMonths) {
        const t = (ageMonths - sorted[i].ageMonths) / (sorted[i + 1].ageMonths - sorted[i].ageMonths);
        return sorted[i].p50 + (sorted[i + 1].p50 - sorted[i].p50) * t;
      }
    }
    return sorted[sorted.length - 1].p50;
  } else {
    const series = mext[gender][kind];
    // 文科省は 72/84/96/.../204 月齢のみ。線形補間
    const sorted = series.sort((a, b) => a.ageMonths - b.ageMonths);
    if (ageMonths <= sorted[0].ageMonths) return sorted[0].p50;
    if (ageMonths >= sorted[sorted.length - 1].ageMonths) return sorted[sorted.length - 1].p50;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].ageMonths <= ageMonths && sorted[i + 1].ageMonths >= ageMonths) {
        const t = (ageMonths - sorted[i].ageMonths) / (sorted[i + 1].ageMonths - sorted[i].ageMonths);
        return sorted[i].p50 + (sorted[i + 1].p50 - sorted[i].p50) * t;
      }
    }
    return sorted[sorted.length - 1].p50;
  }
}

// === 子ども情報 ===
// 既存 seed-test-account.mjs と同一の生年月日を使うこと
const CHILDREN = [
  {
    name: "そうた",
    birth_date: new Date("2014-04-15T00:00:00+09:00"),
    gender_app: "男の子", // children.gender の値
    gender_data: "male", // percentile JSON のキー
    // 0歳から12歳まで毎年4月誕生月の翌週に計測想定
    monthOffsets: [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144],
  },
  {
    name: "はなこ",
    birth_date: new Date("2022-08-20T00:00:00+09:00"),
    gender_app: "女の子",
    gender_data: "female",
    // 0/3/6/12/18/24/30/36ヶ月時点で計測
    monthOffsets: [0, 3, 6, 12, 18, 24, 30, 36],
  },
];

// === 日付計算ヘルパー ===
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Math.floor(months));
  // 誕生月の翌週前後（+5〜+15日）で計測したことに
  d.setDate(d.getDate() + 5 + Math.floor(Math.random() * 10));
  return d;
}

// ±5% 程度の自然な揺らぎを与える
function jitter(value, ratio = 0.05) {
  // -ratio 〜 +ratio の一様分布
  const factor = 1 + (Math.random() * 2 - 1) * ratio;
  return Math.round(value * factor * 10) / 10; // 小数1桁
}
function jitterWeight(value, ratio = 0.05) {
  // 体重は小数2桁
  const factor = 1 + (Math.random() * 2 - 1) * ratio;
  return Math.round(value * factor * 100) / 100;
}

async function main() {
  console.log("\n=== sodatelu measurements テストデータ投入 ===\n");

  // 1. ログイン
  console.log("1. テストアカウントにサインイン...");
  const auth = await signIn(TEST_ACCOUNT.email, TEST_ACCOUNT.password);
  if (auth.error) {
    throw new Error(
      `Auth エラー: ${JSON.stringify(auth.error)}\n` +
        `先に seed-test-account.mjs を実行してアカウントを作成してください。`
    );
  }
  const { idToken, localId: uid } = auth;
  console.log(`  uid=${uid}`);

  // 2. family_id 取得
  const userDoc = await getDoc(idToken, `users/${uid}`);
  if (!userDoc.fields?.family_id?.referenceValue) {
    throw new Error(
      "users/{uid}.family_id が未設定です。先に seed-test-account.mjs を実行してください。"
    );
  }
  const familyRef = userDoc.fields.family_id.referenceValue;
  const familyId = familyRef.split("/").pop();
  console.log(`  family_id=${familyId}`);

  // 3. children 一覧取得（同じ family_id）
  console.log("\n2. ファミリーの子ども一覧を取得...");
  const childrenNames = await listByRef(
    idToken,
    "children",
    "family_id",
    familyRef
  );
  if (childrenNames.length === 0) {
    throw new Error(
      "そのファミリーには children がいません。先に seed-test-account.mjs を実行してください。"
    );
  }
  const childMap = {}; // name → docName
  for (const fullName of childrenNames) {
    const cid = fullName.split("/").pop();
    const cdoc = await getDoc(idToken, `children/${cid}`);
    const name = cdoc.fields?.name?.stringValue;
    if (name) {
      childMap[name] = { id: cid, fullName };
      console.log(`  ${name}: id=${cid}`);
    }
  }

  // 4. 既存の measurements を一掃（このファミリーのもの全部）
  console.log("\n3. 既存 measurements を掃除...");
  const oldMeasurements = await listByRef(
    idToken,
    "measurements",
    "family_id",
    familyRef
  );
  console.log(`  削除予定: ${oldMeasurements.length}件`);
  for (const name of oldMeasurements) await deleteByName(idToken, name);
  console.log(`  削除完了`);

  // 5. パーセンタイル JSON 読み込み
  console.log("\n4. 成長曲線パーセンタイルデータ読み込み...");
  const { cfa, mext } = await loadPercentiles();

  // 6. 各子どもに計測データ投入
  console.log("\n5. measurements 投入...");
  let total = 0;
  const today = new Date();
  for (const child of CHILDREN) {
    const childEntry = childMap[child.name];
    if (!childEntry) {
      console.log(`  ⚠ ${child.name} が見つかりません。スキップ`);
      continue;
    }
    console.log(`\n  ${child.name} (${child.gender_app}):`);
    let count = 0;
    for (const ageMonths of child.monthOffsets) {
      const measuredDate = addMonths(child.birth_date, ageMonths);
      if (measuredDate > today) continue; // 未来日付はスキップ

      // p50 値を取得して ±5% で揺らす
      const heightP50 = getP50(cfa, mext, child.gender_data, "height", ageMonths);
      const weightP50 = getP50(cfa, mext, child.gender_data, "weight", ageMonths);
      const height_cm = jitter(heightP50);
      const weight_kg = jitterWeight(weightP50);

      await createDoc(idToken, "measurements", null, {
        child_id: ref("children", childEntry.id),
        family_id: ref("families", familyId),
        measured_date: measuredDate,
        height_cm,
        weight_kg,
        memo: "",
        created_by_uid: uid,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      console.log(
        `    ${ageMonths}ヶ月 (${measuredDate.toISOString().slice(0, 10)}): ` +
          `身長 ${height_cm}cm / 体重 ${weight_kg}kg`
      );
      count++;
    }
    console.log(`    合計: ${count}件`);
    total += count;
  }

  console.log(`\n=== 完了: 合計 ${total} 件の measurements を投入 ===`);
  console.log(`https://sodatelu.vercel.app の すくすくタブから確認可能`);
}

main().catch((err) => {
  console.error("\n投入失敗:", err);
  process.exit(1);
});
