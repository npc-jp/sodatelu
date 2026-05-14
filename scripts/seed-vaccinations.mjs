// テスト用アカウントに予防接種完了データ（vaccinations）を投入するスクリプト
// - そうた（男・2014/4/15生・12歳）: 0歳〜12歳までに完了しているはずの全定期接種
// - はなこ（女・2022/8/20生・3歳）: 0歳〜3歳までに完了しているはずの定期接種
// - 接種日は推奨月齢の標準範囲内（standardAgeMonthsFrom〜To）でランダム
//
// 使い方:
//   1. .env.local に SODATELU_TEST_EMAIL=... と SODATELU_TEST_PASSWORD=... を設定
//   2. node --env-file=.env.local scripts/seed-vaccinations.mjs
//
// 冪等性: 再実行で「テストアカウントの全 vaccinations」を一掃→再投入する

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

// === Firebase config（本番JSバンドルから取得済み・公開情報） ===
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDPHqxsxGkymJ3RSVV3V0ioO0xAL3l9XqM",
  projectId: "sodatelu",
};

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

// === Firebase Auth / Firestore REST ===
async function signIn(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return r.json();
}

async function createDoc(idToken, collection, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${collection}`;
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

// === 予防接種マスタ読み込み ===
async function loadSchedule() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return JSON.parse(
    await fs.readFile(
      path.resolve(__dirname, "../public/data/vaccination-schedule.json"),
      "utf-8"
    )
  );
}

// === 子ども情報 ===
// seed-test-account.mjs と同じ生年月日
const CHILDREN = [
  {
    name: "そうた",
    birth_date: new Date("2014-04-15T00:00:00+09:00"),
    gender: "male",
    // 12歳時点で完了している定期接種:
    // - HPV は男子の場合 2025年4月から定期接種化（小6〜高1）だが、本テスト
    //   データではアプリ上の動作確認のため対象外として扱う（女子のみ対象としても
    //   現状のスキーマでは性別フィルタしていないので、ここでは含めず）
    // - 経過措置の「Hib単独」も対象外
    excludeVaccineIds: ["hpv", "influenza_b"],
  },
  {
    name: "はなこ",
    birth_date: new Date("2022-08-20T00:00:00+09:00"),
    gender: "female",
    // 3歳時点で完了している定期接種:
    // - 0〜3歳未満で接種する全ワクチン
    // - 日本脳炎第1期（3歳から）は3歳と数ヶ月の現時点で1〜2回目は完了している想定
    // - MR第2期（5歳〜）・日本脳炎第2期（9歳〜）・DT第2期（11歳〜）・HPV（12歳〜）は対象外
    excludeVaccineIds: [
      "mr_second",
      "japanese_encephalitis_second",
      "dt_second",
      "hpv",
      "influenza_b",
    ],
  },
];

// === 現在月齢計算 ===
function ageMonthsAt(birthDate, atDate) {
  const ms = atDate.getTime() - birthDate.getTime();
  return Math.floor(ms / (30.4375 * 24 * 60 * 60 * 1000));
}

// === 接種日生成（標準月齢範囲内でランダム） ===
function vaccinationDateFor(birthDate, doseInfo) {
  // 標準範囲の中央付近 ±数日でブレさせる
  const ageMonthsFrom = doseInfo.standardAgeMonthsFrom;
  const ageMonthsTo = doseInfo.standardAgeMonthsTo;
  // ランダムに範囲内の月齢
  const targetMonths = ageMonthsFrom + Math.random() * (ageMonthsTo - ageMonthsFrom);
  const d = new Date(birthDate);
  d.setMonth(d.getMonth() + Math.floor(targetMonths));
  // その月の中でランダムな日（1〜28日）
  d.setDate(1 + Math.floor(Math.random() * 27));
  return d;
}

async function main() {
  console.log("\n=== sodatelu vaccinations テストデータ投入 ===\n");

  // 1. サインイン
  console.log("1. テストアカウントにサインイン...");
  const auth = await signIn(TEST_ACCOUNT.email, TEST_ACCOUNT.password);
  if (auth.error) {
    throw new Error(
      `Auth エラー: ${JSON.stringify(auth.error)}\n` +
        `先に seed-test-account.mjs を実行してください。`
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

  // 3. children 一覧
  console.log("\n2. ファミリーの子ども一覧を取得...");
  const childrenNames = await listByRef(idToken, "children", "family_id", familyRef);
  const childMap = {};
  for (const fullName of childrenNames) {
    const cid = fullName.split("/").pop();
    const cdoc = await getDoc(idToken, `children/${cid}`);
    const name = cdoc.fields?.name?.stringValue;
    if (name) {
      childMap[name] = { id: cid };
      console.log(`  ${name}: id=${cid}`);
    }
  }

  // 4. 既存の vaccinations を一掃
  console.log("\n3. 既存 vaccinations を掃除...");
  const oldVaccs = await listByRef(idToken, "vaccinations", "family_id", familyRef);
  console.log(`  削除予定: ${oldVaccs.length}件`);
  for (const name of oldVaccs) await deleteByName(idToken, name);
  console.log(`  削除完了`);

  // 5. ワクチンマスタ読み込み
  console.log("\n4. 予防接種マスタ読み込み...");
  const schedule = await loadSchedule();
  console.log(`  ${schedule.vaccines.length}種のワクチン定義`);

  // 6. 各子どもに接種完了データ投入
  console.log("\n5. vaccinations 投入...");
  const today = new Date();
  let total = 0;

  for (const child of CHILDREN) {
    const childEntry = childMap[child.name];
    if (!childEntry) {
      console.log(`  ⚠ ${child.name} が見つかりません。スキップ`);
      continue;
    }
    const currentMonths = ageMonthsAt(child.birth_date, today);
    console.log(`\n  ${child.name} (現在 ${currentMonths}ヶ月):`);
    let count = 0;

    for (const vaccine of schedule.vaccines) {
      if (child.excludeVaccineIds.includes(vaccine.id)) continue;

      for (const dose of vaccine.doses) {
        // ロタウイルス3回目は1価ワクチンの場合スキップ。テストデータでは5価想定で
        // 全3回投入する（実機での「2回 or 3回」表示確認のため）
        // それ以外は doseTo 月齢を超えていたら完了済みとして投入
        if (dose.standardAgeMonthsTo > currentMonths) continue;

        const vaccDate = vaccinationDateFor(child.birth_date, dose);
        if (vaccDate > today) continue; // 念のため未来日除外

        await createDoc(idToken, "vaccinations", {
          child_id: ref("children", childEntry.id),
          family_id: ref("families", familyId),
          vaccine_id: vaccine.id,
          dose_number: dose.doseNumber,
          vaccinated_date: vaccDate,
          is_completed: true,
          memo: "",
          created_by_uid: uid,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        count++;
      }
    }
    console.log(`    投入: ${count}件`);
    total += count;
  }

  console.log(`\n=== 完了: 合計 ${total} 件の vaccinations を投入 ===`);
  console.log(`https://sodatelu.vercel.app の めやす→予防接種フィルタで確認可能`);
}

main().catch((err) => {
  console.error("\n投入失敗:", err);
  process.exit(1);
});
