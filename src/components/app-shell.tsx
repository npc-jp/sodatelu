"use client";

// アプリ全体のレイアウトラッパー
// - 通常画面: モバイル幅(max-w-md=448px)で中央配置
//   タブレット/PCサイズ(md以上)では左右の余白に Bloom の装飾SVGを散らして
//   「世界観が広がる」演出を加える（友人テストで iPad ユーザー対応のための B案）
// - /compare のような「N人を横並びで比較」したい画面: 全幅に開放
// - 文字サイズ設定（小/中/大）を起動時に localStorage から復元

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyFontScaleToDOM, getFontScale } from "@/lib/font-scale";
import {
  Cloud,
  Heart,
  PottedPlant,
  Sparkle,
  Sprout,
  Star,
  Sun,
  WavyLine,
} from "./illustrations";

// 全幅で表示したいパス（max-w-md ラッパーを外す）
const FULL_WIDTH_PATHS = ["/compare"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullWidth = FULL_WIDTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // 文字サイズ設定を初回マウント時に html に適用
  useEffect(() => {
    applyFontScaleToDOM(getFontScale());
  }, []);

  if (isFullWidth) {
    // 全幅: ラッパーなし
    return <div className="h-full w-full">{children}</div>;
  }

  // 通常: モバイル幅で中央配置 + iPad/PC のみ装飾を散らす
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* iPad/PC（md=768px以上）のみ表示する装飾。
          pointer-events-none で操作を阻害しない。
          opacity は控えめにしてコンテンツの邪魔をしない */}
      <div
        className="pointer-events-none absolute inset-0 hidden md:block"
        aria-hidden
      >
        {/* === 左側エリア === */}
        <div className="absolute" style={{ top: "6%", left: "6%", opacity: 0.85 }}>
          <Sun size={64} color="var(--bloom-yellow)" />
        </div>
        <div className="absolute" style={{ top: "22%", left: "13%", opacity: 0.7 }}>
          <Cloud size={72} strokeColor="var(--bloom-line-soft)" />
        </div>
        <div className="absolute" style={{ top: "44%", left: "4%", opacity: 0.85 }}>
          <PottedPlant size={140} />
        </div>
        <div className="absolute" style={{ top: "38%", left: "18%", opacity: 0.85 }}>
          <Sparkle size={22} color="var(--bloom-accent)" />
        </div>
        <div className="absolute" style={{ top: "70%", left: "16%", opacity: 0.85 }}>
          <Star size={20} color="var(--bloom-pink)" />
        </div>
        <div className="absolute" style={{ top: "80%", left: "8%", opacity: 0.7 }}>
          <WavyLine width={80} color="var(--bloom-primary)" stroke={2} />
        </div>

        {/* === 右側エリア（FABが右下にあるので、右下は装飾を控えめに） === */}
        <div className="absolute" style={{ top: "10%", right: "8%", opacity: 0.7 }}>
          <Cloud size={56} strokeColor="var(--bloom-line-soft)" />
        </div>
        <div className="absolute" style={{ top: "26%", right: "5%", opacity: 0.85 }}>
          <Sparkle size={28} color="var(--bloom-accent)" />
        </div>
        <div className="absolute" style={{ top: "44%", right: "13%", opacity: 0.85 }}>
          <Heart size={28} color="var(--bloom-pink)" />
        </div>
        <div className="absolute" style={{ top: "55%", right: "4%", opacity: 0.85 }}>
          <Sprout size={68} color="var(--bloom-primary)" />
        </div>
        <div className="absolute" style={{ top: "72%", right: "16%", opacity: 0.85 }}>
          <Star size={18} color="var(--bloom-yellow)" />
        </div>
      </div>

      {/* メインコンテンツ（中央モバイル幅） */}
      <div className="relative mx-auto h-full w-full max-w-md">{children}</div>
    </div>
  );
}
