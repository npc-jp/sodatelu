// /terms ページのメタデータ。
// page.tsx が "use client" 指定のため、metadata は server component の layout に分離する。

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | sodatelu",
  description: "sodateluの利用規約です。",
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
