# sodatelu デプロイ手順

最終更新: 2026-05-01

---

## 全体像

| 環境 | URL | 用途 | 課金 |
|------|-----|------|------|
| ローカル | http://localhost:3000 | 開発 | なし |
| Vercel Preview | xxx-pr-N.vercel.app | PR毎の自動Preview | なし（Hobby） |
| Vercel 本番 | sodatelu.vercel.app | Webβリリース先 | なし（Hobby） |
| Capacitor（ネイティブシェル） | Vercel本番をWebView表示 | iOS/Android配信用 | なし（SDKは無料） |
| Google Play | （未申請） | Androidストア | $25 一回（W4で発生） |
| App Store | （未申請） | iOSストア | $99/年（6月で発生） |

---

## Webβリリース手順（Vercel）

### 1. 事前確認

- [ ] `npm run build` がローカルで通る
- [ ] 全画面エラーなしで動作（playwrightテスト済）
- [ ] Firestore Rules / Storage Rules が `firebase deploy` で本番反映済
- [ ] PWA manifest / アイコンが用意されている（W3で対応）
- [ ] プライバシーポリシーページ（`/privacy`）が公開ベースで充実（W3で対応）

### 2. GitHub リポジトリの準備

`npc-jp` Org に sodatelu リポジトリを作成（既存ならスキップ）:

```bash
# このディレクトリ（app/）からリポジトリ作成
cd ~/npc-team/partners/npc/apps/sodatelu/app
gh repo create npc-jp/sodatelu --private --source=. --push
```

### 3. Vercel 連携

1. Vercel ダッシュボード（Azu のアカウント）にログイン
2. 「Add New」→ Project → GitHub から `npc-jp/sodatelu` を選択
3. **Root Directory**: `./`（app直下）
4. **Framework Preset**: Next.js（自動検出）
5. **Build Command**: `npm run build`（デフォルト）
6. **Output Directory**: `.next`（デフォルト）

### 4. 環境変数の設定（Vercel ダッシュボード）

```
NEXT_PUBLIC_FIREBASE_API_KEY            # ローカルの .env.local と同じ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        # sodatelu.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID         # sodatelu
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     # sodatelu.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_ADMIN_UID                   # /admin に入れる UID（カンマ区切りで複数可）
```

### 5. デプロイ

「Deploy」ボタン → 数分待つ → `https://sodatelu.vercel.app` で公開される。

### 6. Firebase Auth 認証ドメイン設定

本番URLを Firebase Console → Authentication → Settings → Authorized domains に追加:

```
localhost
sodatelu.firebaseapp.com
sodatelu.web.app
sodatelu.vercel.app           # ← 追加
```

これがないと Vercel上でログインできない。

### 7. スモークテスト

本番URLで以下を確認:
- [ ] ログイン
- [ ] オンボーディング（新アカウントで子ども登録）
- [ ] 記録作成（写真付き）
- [ ] /home /milestones /milestones/[id] /memory /family すべて表示
- [ ] /privacy が表示される

### 8. モニターに案内

Azu家族・限定モニターに URL を共有。  
モニター用の事前ガイドを別途用意推奨。

---

## Firestore Rules / Storage Rules の反映

```bash
cd ~/npc-team/partners/npc/apps/sodatelu/app
firebase deploy --only firestore:rules,storage
```

事前に `firebase login` 済みであること。Azu のFirebaseプロジェクトオーナーアカウントで認証。

---

## Capacitor化（2026-04-30 セットアップ完了）

### 採用戦略：案A（Remote URL / Vercel本番をWebViewで表示）

ネイティブアプリは Vercel 本番（`https://sodatelu.vercel.app`）を WebView で開くシェル方式。  
middleware（proxy.ts）・SSR・dynamic routesがそのまま動く。

詳細運用は [`CAPACITOR.md`](./CAPACITOR.md) 参照。

### セットアップ完了状態

- [x] Capacitor SDK v7.6.x（`@capacitor/core` `@capacitor/cli` `@capacitor/android` `@capacitor/ios`）
- [x] `capacitor.config.ts`（appId: `jp.npc.sodatelu`、server.url で Vercel本番）
- [x] `assets/` にアイコン・スプラッシュ素材（1024x1024 / 2732x2732）
- [x] `android/` ネイティブプロジェクト生成・全解像度アイコン展開
- [ ] `ios/` ← **CocoaPods 未インストールのため未生成**

### 残タスク（Azu の手動作業）

1. **CocoaPods インストール**（iOS用・無料）
   ```bash
   brew install cocoapods
   ```

2. **iOS プロジェクト追加**（CocoaPods 入れた後・無料）
   ```bash
   npx cap add ios
   node node_modules/@capacitor/assets/bin/capacitor-assets generate --ios
   ```

3. **Google Play Developer 登録（$25 一回・W4で発生）**
   - https://play.google.com/console/signup

4. **Apple Developer Program 登録（$99/年・6月で発生）**
   - https://developer.apple.com/programs/enroll/

5. **ストア申請素材**: [`STORE_LISTING.md`](./STORE_LISTING.md) 参照

### Node.js バージョンに関する注意

Capacitor v8 は Node.js 22 以上必須。現在 Node 20 なので **v7.6.x にダウングレード済**。  
Node 22 にアップグレード後、v8 へ戻すことを推奨。

---

## 既知の課題（W3でフォロー予定）

- /family のメンバー一覧表示（クエリ通るが表示されない）
- マイルストーン旧ID互換性（テスト記録リセット推奨）
- HIGH-06 招待承認時の既存ファミリー脱退処理
- `react-hooks/set-state-in-effect` のlint警告7件（プロジェクト全体・許容済み）

---

## ロールバック手順

### Vercel
- Vercel ダッシュボード → Deployments → 過去のデプロイから「Promote to Production」

### Firestore Rules
- Firebase Console → Firestore → ルール → 履歴から過去版を選択 → 復元
- または `git checkout <commit>` で過去のfirestore.rules を取り出し → `firebase deploy --only firestore:rules`

---

## 参照

- [SECURITY.md](./SECURITY.md) — セキュリティ運用ガイド
- [Vercel Docs](https://vercel.com/docs)
- [Firebase Docs](https://firebase.google.com/docs)
