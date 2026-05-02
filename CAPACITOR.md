# sodatelu Capacitor 運用ガイド

最終更新: 2026-04-30

---

## 採用戦略：案A（Remote URL / Vercel本番をWebViewで表示）

このアプリの Capacitor 構成は **「シェル方式」** です。  
ネイティブアプリは Vercel 本番（`https://sodatelu.vercel.app`）を WebView で開くだけで、アプリ本体（HTML/JS）はサーバー側に置きます。

### なぜこの方式か

| 観点 | 案A（Remote） | 案B（Static Export） |
|------|---------------|----------------------|
| middleware（proxy.ts） | そのまま動く | 動かない・書き換え必要 |
| dynamic routes (`/milestones/[id]`) | そのまま動く | `generateStaticParams` 必須 |
| アップデート | Vercel push のみ（即反映） | アプリ再ビルド・ストア再申請 |
| オフライン動作 | 不可 | 可 |
| コード変更コスト | ほぼゼロ | 大きい |

**選定理由**: Webβ→ストア配信の最短ルート優先。`proxy.ts` の認証ガードが既に動いているので、それを活かす。  
将来オフライン対応が必要になったら案Bへ移行を検討。

---

## セットアップ完了状態（2026-04-30 時点）

- [x] `@capacitor/core` `@capacitor/cli` v7.6.x インストール
- [x] `@capacitor/android` v7 インストール
- [x] `@capacitor/ios` v7 インストール（Capacitor SDK のみ。`cap add ios` は未実行）
- [x] `@capacitor/assets` v3 インストール（dev依存）
- [x] `capacitor.config.ts` 作成（appId: `jp.npc.sodatelu`、server.url で Vercel本番）
- [x] `assets/` ディレクトリにアイコン・スプラッシュ素材生成
- [x] `npx cap add android` 実行 → `android/` プロジェクト生成
- [x] `npx capacitor-assets generate --android` で全解像度展開
- [ ] `npx cap add ios` ← **CocoaPods 未インストールのため待機**

### 重要：Capacitor のバージョンについて

当初 v8 をインストールしたが、CLI が Node.js 22 以上を厳格チェック。現環境（Node 20.20.2）では起動不可だったため **v7.6.x にダウングレード**した。

**Node 22 にアップグレード後、Capacitor v8 へ戻すことを推奨**（W4でNode 22対応する計画）。

---

## ディレクトリ構成

```
app/
├── capacitor.config.ts        # Capacitor 設定（appId・server.url）
├── assets/                    # @capacitor/assets 入力素材
│   ├── icon.png               # 1024x1024 アプリアイコン
│   ├── icon-foreground.png    # Android adaptive 前景
│   ├── icon-background.png    # Android adaptive 背景
│   ├── splash.png             # 2732x2732 スプラッシュ
│   └── splash-dark.png        # ダークモード版
├── android/                   # Android ネイティブプロジェクト（generated）
└── ios/                       # iOS ネイティブプロジェクト（CocoaPods 入れた後で生成）
```

---

## 開発フロー

### Web側を変更してネイティブに反映

```bash
# Web側を編集
vim src/app/home/page.tsx

# Vercel に push（プレビューURLが発行される）
git push origin feature/xxx

# ネイティブアプリは Vercel本番URLを見ているので、本番デプロイ後に
# アプリを再起動すれば最新が表示される（ストア再申請不要）
```

### サーバーURLを切り替え（PR Preview検証など）

```bash
# 環境変数で接続先を切り替え可能
CAPACITOR_SERVER_URL=https://sodatelu-pr-42.vercel.app npx cap sync
```

### アイコン・スプラッシュを更新

```bash
# 1. assets/ 内の素材を再生成（既存 logo.svg 元）
node scripts/generate-capacitor-assets.mjs

# 2. iOS/Android プロジェクトに展開
node node_modules/@capacitor/assets/bin/capacitor-assets generate --android
# iOS追加後は: --ios も付ける
```

---

## ネイティブビルド（Azu の手元で実行）

### Android

```bash
# 1. Web 側を Vercel に push（本番URLに反映）
git push

# 2. Capacitor sync（capacitor.config.json をネイティブにコピー）
npx cap sync android

# 3. Android Studio を開く
npx cap open android
```

Android Studio が起動したら:
- 上部メニュー: Build → Build Bundle(s) / APK(s) → Build APK(s)
- 出力先: `android/app/build/outputs/apk/debug/app-debug.apk`
- 実機転送: USB接続のAndroid → Run ボタン

### iOS（CocoaPods インストール後）

```bash
# 0. CocoaPods 未インストールの場合、最初に1回だけ
brew install cocoapods

# 1. Web 側を Vercel に push
git push

# 2. iOS プロジェクトを追加（最初の1回のみ）
npx cap add ios

# 3. アセット展開
node node_modules/@capacitor/assets/bin/capacitor-assets generate --ios

# 4. Capacitor sync
npx cap sync ios

# 5. Xcode を開く
npx cap open ios
```

Xcode が起動したら:
- 上部メニュー: Product → Build
- Simulator 実行: 上部 Run ボタン
- 実機転送: Apple Developer 登録後にプロビジョニング設定

---

## ストア申請に向けた残タスク（Azu の手動作業）

### Google Play

1. **Google Play Developer 登録（$25 一回・W4で発生）**
   - https://play.google.com/console/signup
   - Googleアカウント・身分証・支払いカード必要
   - 登録後、ダッシュボードで「アプリを作成」

2. **署名キー（keystore）生成・本番AABビルド**
   ```bash
   keytool -genkey -v -keystore sodatelu-release.keystore \
     -alias sodatelu -keyalg RSA -keysize 2048 -validity 10000
   ```
   - **生成した keystore は紛失するとアプリ更新不可**。安全な場所にバックアップ
   - Android Studio: Build → Generate Signed Bundle/APK → AAB を選択

3. **ストア申請素材** (`STORE_LISTING.md` 参照)
   - スクリーンショット（最低2枚、推奨8枚）
   - フィーチャーグラフィック 1024x500
   - アプリ説明文
   - プライバシーポリシーURL

4. **コンテンツレーティング・対象年齢**
   - Play Console上のアンケート回答
   - 子ども向けアプリ扱いになる場合 GDPR/COPPA 関連の追加対応必要

### App Store

1. **Apple Developer Program 登録（$99/年・6月で発生）**
   - https://developer.apple.com/programs/enroll/
   - Apple ID・支払いカード・電話確認

2. **CocoaPods インストール**
   ```bash
   brew install cocoapods
   ```
   - 既存環境で `command -v pod` が空なら未インストール

3. **iOS プロジェクト追加・ビルド**
   - 上記「ネイティブビルド > iOS」セクション参照

4. **App Store Connect でアプリ作成・素材アップ**
   - https://appstoreconnect.apple.com/
   - スクリーンショット（6.5/6.7インチ iPhone）
   - アプリ説明・プライバシーポリシー・カテゴリ

5. **TestFlight で内部テスト**

---

## トラブルシューティング

### `npx cap` が `Node 22 required` で動かない

→ Capacitor v7 にダウングレード済（2026-04-30）。  
将来 Node 22 にアップグレードしたら v8 に戻して OK。

### `npx cap add ios` が CocoaPods エラー

→ `brew install cocoapods` で解決。Apple Silicon Mac 推奨。

### アプリが「サーバーに接続できません」と表示される

→ `capacitor.config.ts` の `server.url` を確認。  
`CAPACITOR_SERVER_URL` 環境変数で上書き可能。

### Vercel本番が落ちている時にアプリが固まる

→ 案A（Remote）の宿命。将来案Bへの移行を検討。

---

## 参照

- [Capacitor 公式ドキュメント](https://capacitorjs.com/docs)
- [STORE_LISTING.md](./STORE_LISTING.md) — ストア掲載情報
- [DEPLOY.md](./DEPLOY.md) — Webβ・Vercel デプロイ手順
- [SECURITY.md](./SECURITY.md) — セキュリティ運用
