import type { CapacitorConfig } from "@capacitor/cli";

// sodatelu Capacitor 設定
//
// 戦略: 案A（Remote URL / Vercel 本番を WebView で表示）
// - アプリは Vercel 本番URL を WebView でラップする「シェル」
// - Next.js の middleware（proxy.ts）・SSR・dynamic routes をそのまま活かす
// - 将来オフライン対応が必要になったら案B（Static Export）への移行を検討
//
// CAPACITOR_SERVER_URL 環境変数で接続先を切り替え可能（例: PR Preview URL）。
// 未指定時は本番URL（sodatelu.vercel.app）。
//
// 注意:
// - server.url を使うため webDir のファイルは実質配信されないが、Capacitor は webDir
//   の存在を要求する。最低限のフォールバック用 HTML を public/ に置いている前提で
//   webDir: 'public' を指定（オフライン時 or サーバー到達不可時の退避先）。
// - cleartext: false で HTTPS を強制。Vercel は常時 HTTPS なので問題なし。

const config: CapacitorConfig = {
  appId: "jp.npc.sodatelu",
  appName: "sodatelu",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://sodatelu.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
  android: {
    backgroundColor: "#fef3c7", // amber-100（splash背景と統一）
  },
};

export default config;
