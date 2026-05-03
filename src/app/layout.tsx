import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import AppShell from "@/components/app-shell";
import "./globals.css";

// 本番URL（ストア申請・OG展開で参照される）
// 環境変数で上書きできるようにしておく（dev環境・ステージング対応）
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sodatelu.app";

const SITE_NAME = "sodatelu";
const SITE_DESCRIPTION =
  "0〜12歳の子どもの成長を、家族で記録するアプリ。WHO・医学のめやすと一緒に、お子さまのペースで。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "sodatelu - 子どもの成長記録",
    template: "%s | sodatelu",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "成長記録",
    "育児",
    "子育て",
    "発達",
    "マイルストーン",
    "きょうだい比較",
    "家族",
    "アルバム",
  ],
  authors: [{ name: "npc" }],
  creator: "npc",
  publisher: "npc",
  // 電話番号などの自動リンク化を抑止（誤検知防止）
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // PWA / マニフェスト
  manifest: "/manifest.webmanifest",
  // アイコン参照
  // app/favicon.ico, app/icon.svg, app/apple-icon.png は Next.js が自動でリンクするが、
  // public/ に置いた PNG（192/512）も明示しておくとPWAインストール時に確実に拾われる
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  // OGP（SNS共有時のカード表示）
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "sodatelu - 子どもの成長記録",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "sodatelu",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "sodatelu - 子どもの成長記録",
    description: SITE_DESCRIPTION,
    images: ["/icon-512.png"],
  },
  // iOS の「ホーム画面に追加」時の扱い（standalone PWA として開く）
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  // 検索エンジン制御（β版は当面 noindex を環境変数で切替できるようにしておく）
  robots:
    process.env.NEXT_PUBLIC_ROBOTS_NOINDEX === "1"
      ? { index: false, follow: false }
      : { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // PWA テーマカラー（amber-500）。ブラウザのアドレスバー・ステータスバーに反映される
  themeColor: "#f59e0b",
  // ブラウザ既定のカラースキーム（明るめ）
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full">
      <head>
        {/* Bloom デザイン用フォント: 見出し=Yusei Magic / 本文=Zen Kaku Gothic New */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Yusei+Magic&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
        />
      </head>
      <body className="h-full antialiased" style={{ background: "var(--bloom-bg)", color: "var(--bloom-ink)" }}>
        {/* モバイル前提アプリ。AppShell が pathname を見て:
            - 通常画面: max-w-md で中央配置
            - /compare: 全幅に開放（N人横並び＋横スクロール用） */}
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
