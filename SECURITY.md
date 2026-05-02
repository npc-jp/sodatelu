# sodatelu セキュリティ運用ガイド

このドキュメントは、sodatelu の Webβ リリース前後で実施する
セキュリティ設定（Firestore Rules / Storage Rules）の反映手順を Azu 向けにまとめたものです。

最終更新: 2026-04-30

---

## 全体像

sodatelu のセキュリティは「3層構え」で組まれています。

1. **クライアントUI層** — disabled / hidden での操作制限（UX重視）
2. **proxy.ts 層** — 認証必須パスへの未認証アクセスを `/login` へリダイレクト（軽量・Edge）
3. **Firebase セキュリティルール層** — 本物のセキュリティ境界（CRIT-01 / CRIT-04）

UI層と proxy 層はすり抜け可能なので、データの正当性は **必ずセキュリティルールで担保** します。

---

## 反映するファイル

```
app/
├── firestore.rules    ← Firebase Console → Firestore → ルール に貼り付け
└── storage.rules      ← Firebase Console → Storage → ルール に貼り付け
```

これらは Git で管理されており、コードと同期して進化します。
**サーバー（Firebase）への反映は Azu が手動で行う想定**です（誤った Rules で
本番のデータアクセスを止めてしまうリスクを避けるため）。

---

## 反映手順

### 1. Firestore Rules の反映

1. <https://console.firebase.google.com/> を開く
2. `sodatelu` プロジェクトを選択
3. 左メニュー「Firestore Database」→ 上部タブ「ルール」
4. 既存のルールをいったん**コピーして安全な場所に保存**（ロールバック用）
5. `app/firestore.rules` の内容を全選択コピー → エディタに貼り付け
6. 「公開」ボタンをクリック
7. 公開後、sodatelu アプリでログイン → 記録の作成・編集・削除が動くことを確認

### 2. Storage Rules の反映

1. 左メニュー「Storage」→ 上部タブ「ルール」
2. 既存のルールをコピーして安全な場所に保存
3. `app/storage.rules` の内容を全選択コピー → エディタに貼り付け
4. 「公開」ボタンをクリック
5. 公開後、写真付きの記録を作成 → 写真が表示されることを確認

---

## 開発環境と本番環境の違い

- 現状、Firebase プロジェクトは `sodatelu` 1つだけ（dev/prod 分離なし）
- そのため、Rules を変更すると即座に本番にも影響する
- 大きなルール変更は、**まずコメントアウトで段階的に厳しくする** のが安全
  - 例: `allow read: if true;` → `allow read: if isSignedIn();` → 厳格化
- 将来的には `sodatelu-dev` プロジェクトを別途作って、開発時は分離することを推奨

---

## 動作確認のチェックリスト

Rules を反映したあと、以下のシナリオで動作確認します。

### ✅ 通常運用シナリオ

- [ ] ログイン後、ホーム画面に自分の子どもが表示される
- [ ] 記録を新規作成できる（無料カテゴリ）
- [ ] 記録の編集・削除ができる
- [ ] 写真付き記録の写真が表示される
- [ ] 記録削除時に Firebase Storage 側の写真も消える

### ✅ 認可シナリオ

- [ ] 未ログイン状態で `/home` にアクセスすると `/login` へリダイレクトされる（proxy.ts）
- [ ] 別アカウントでログインしても、他人のファミリーの記録は見えない
- [ ] 別アカウントの URL（`/record?id=xxx`）を直接踏んでも 404 or アクセス拒否

### ✅ プレミアム制限（CRIT-04）

- [ ] 無料プランで「がんばった」「感じた」などのプレミアムカテゴリが書き込めない
  （クライアント側で disabled だが、もし開発者ツールで突破しても Firestore Rules で拒否される）
- [ ] プレミアムプランに切り替えると上記が書き込めるようになる

### ✅ 管理画面（CRIT-02）

- [ ] `NEXT_PUBLIC_ADMIN_UID` に設定された UID 以外で `/admin` を踏むと `/home` にリダイレクトされる
- [ ] 設定された UID でログインすると `/admin` が見られる

---

## トラブルシューティング

### 全画面で「Missing or insufficient permissions」エラーが出る

Rules の構文エラー or 過剰な制限が原因。
- Firebase Console → ルール画面で公開時のエラー表示を確認
- 「ルールのテスト」タブで対象パスをシミュレーションする
- 緊急時は元のルールに戻す（コピーしておいたバックアップから）

### 写真がアップロードできない

- Storage Rules の `isValidImage()` の条件（5MB 以下・image/* のみ）を満たしているか確認
- ブラウザのコンソールで `storage/unauthorized` などのエラーコードを確認

### プレミアムカテゴリで書き込めない（プレミアムプランなのに）

- `families/{id}` ドキュメントの `plan` フィールドが `"premium"` になっているか確認
- `getDoc(familyRef).data().plan` が文字列の "premium" であること（boolean ではない）

---

## 認証印 cookie の仕組み（HIGH-03）

`proxy.ts` は `sodatelu_auth` という cookie の有無で認証状態を判定します。
これは `auth-context.tsx` の `onAuthStateChanged` 内で書き込まれます。

- ログイン時 → cookie 設定（7日間）
- ログアウト時 → cookie 削除

注意: この cookie は**軽量な認証印**であって、本物のセキュリティ境界ではありません。
本物のアクセス制御は Firestore Rules / Storage Rules で行います。

---

## 環境変数

Webβ で本番運用する前に、以下の環境変数を Vercel に登録してください。

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sodatelu.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sodatelu
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sodatelu.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_ADMIN_UID=          # /admin に入れる Firebase Auth UID（複数はカンマ区切り）
```

`NEXT_PUBLIC_ADMIN_UID` は Firebase Console → Authentication → Users から
Azu 自身の UID をコピーして設定します。

---

## 今後の改善メモ

- [ ] dev / prod の Firebase プロジェクト分離
- [ ] Firebase Authentication App Check の有効化（bot 対策）
- [ ] Storage の Custom Claims による厳格なファミリー判定
- [ ] アカウント削除フローの実装（プライバシーポリシー 6 章で約束）
- [ ] App Check と reCAPTCHA Enterprise の連携（将来のスパム対策）
