import type { MetadataRoute } from "next";

// Web App Manifest (PWA)
// Next.js 16: app/manifest.ts は MetadataRoute.Manifest を返すと自動的に /manifest.webmanifest として配信される
// ビジョン文書 ver.2 のトーンに合わせ、温かい言葉で簡潔に。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "sodatelu - 子どもの成長記録",
    short_name: "sodatelu",
    description: "子どもの毎日を、家族で記録する場所。",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF6E8", // bloom-bg (cream)
    theme_color: "#7BA85F", // bloom-primary (sage-green)
    lang: "ja",
    dir: "ltr",
    categories: ["lifestyle", "parenting"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
