# sodatelu（そだてる）

子どもの成長を、家族の物語に。  
0〜12歳のお子さまの「できた！」を記録し、世界の発達データと一緒に振り返るアプリ。

## ビジョン

> 子どもの成長を記録する。その行為が、人類の発達理解に貢献する。

「親が子を愛して記録する」その記録が、世界規模の発達研究データに変換される。  
ユーザーに「データ提供」という負担を一切かけない設計。

詳細: [`../docs/product-vision.md`](../docs/product-vision.md)

## コア機能

1. **個人記録**: 親が子の成長を日々記録（11カテゴリ・写真付き）
2. **きょうだい比較**: 年表でスタート地点を揃えて見られる
3. **発達のめやす**: WHO/医学・コミュニティ統計を「ドキッとさせない」設計で提示
4. **思い出ページ**: 親→子への愛の手紙として完結

設計鉄則: アプリは観察者・医者ではない。「遅い・早い」は使わない。

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **バックエンド**: Firebase Auth + Firestore (asia-northeast1) + Storage (Blaze)
- **ホスティング**: Vercel（Hobby）
- **ネイティブシェル**: Capacitor v7（案A: Vercel本番をWebViewで表示）
  - 詳細: [`CAPACITOR.md`](./CAPACITOR.md)

## ディレクトリ構成

```
src/
├── app/                # ページ（Next.js App Router）
│   ├── home/          # ホーム
│   ├── milestones/    # マイルストーン一覧
│   │   └── [id]/      # マイルストーン詳細（W2新機能）
│   ├── memory/        # 思い出ページ（W2新機能）
│   ├── write/         # 記録入力
│   ├── record/        # 記録詳細・編集
│   ├── calendar/      # カレンダー
│   ├── compare/       # きょうだい年表
│   ├── book/          # アルバム
│   ├── family/        # ファミリー設定
│   ├── add-child/     # きょうだい追加
│   ├── settings/      # アカウント設定（W3）
│   ├── admin/         # 管理画面（NEXT_PUBLIC_ADMIN_UID限定）
│   ├── privacy/       # プライバシーポリシー
│   ├── login/         # ログイン
│   └── onboarding/    # 初回オンボーディング
├── components/        # 共通コンポーネント
│   ├── bottom-nav.tsx
│   ├── confirm-modal.tsx
│   ├── milestone-range-bar.tsx   # W2: めやす範囲バー
│   └── milestone-stats.tsx       # W2: 統計2層
├── lib/               # 共通ロジック
│   ├── firebase.ts
│   ├── firestore.ts
│   ├── storage.ts
│   ├── auth-context.tsx
│   ├── child-context.tsx
│   ├── plan-context.tsx
│   ├── milestones-data.ts        # 46項目マスター（0-12歳）
│   ├── phases.ts                 # フェーズ定義（4段階）
│   ├── category-map.ts
│   ├── age-range.ts              # W2: age_hint パース
│   └── plan.ts
└── proxy.ts           # Next.js middleware（認証ガード）

firestore.rules        # Firestore セキュリティルール
storage.rules          # Storage セキュリティルール
firebase.json          # Firebase CLI 設定
.firebaserc            # Firebase プロジェクト紐付け
SECURITY.md            # セキュリティ運用ガイド
DEPLOY.md              # デプロイ手順（Webβ/Vercel）
```

## ローカル開発

### 前提

- Node.js 20+ (nvm使用推奨)
- Firebase CLI（`npm install -g firebase-tools`）

### 環境変数

`.env.local` を作成（`env.local.example` をコピー）:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sodatelu.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sodatelu
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sodatelu.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_ADMIN_UID=...   # /admin にアクセス可能なFirebase Auth UID
```

### 起動

```bash
nvm use 20
npm install
npm run dev
```

http://localhost:3000 を開く。

### Firestore Rules / Storage Rules の更新

```bash
firebase deploy --only firestore:rules,storage
```

事前に `firebase login` 済みであること。

## ビルド・デプロイ

詳細は [`DEPLOY.md`](./DEPLOY.md) 参照。

## ロードマップ

- ✅ W1（5/1-7）: ビジョン反映・マイルストーン再構成・UI改修・Rules整備
- ✅ W2（5/8-14）: 発達の気づき・統計2層・思い出ページ
- 🔄 W3（5/15-21）: PWA対応・プライバシー強化・Webβリリース
- 🔄 W4（5/22-31）: Capacitor化（雛形完了 ✅）・Google Play申請（要 $25 登録）
- ⬜ 6月: App Store申請（要 $99 登録 + CocoaPods）

## ライセンス

非公開・npc 自社プロダクト

## 問い合わせ

azusa-y@n-pc.jp
