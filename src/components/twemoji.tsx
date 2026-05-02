// Twemoji コンポーネント
//
// 役割: 絵文字を Twitter由来のオープンソースSVG（twemoji）に置き換えて、
//       OS差分（iOS / Android / Mac / Windows）を吸収する。
//
// 実装方針: ライブラリ依存を増やさず、CDN(jsdelivr)上の twemoji SVG を <img> で参照する。
//   - SSR / 静的生成 / Capacitor (iOS/Android) すべてで同じ見た目になる
//   - useEffect が要らない（DOM操作なし）→ ハイドレーション差分も出ない
//   - メモリ配置: Discord 等が利用している現役メンテfork `jdecked/twemoji` v15.1.0 を固定参照
//     （元 twitter/twemoji は v14.0.2 で更新停止済み。jdecked が公式fork）
//
// 利用例:
//   <Twemoji emoji="🌱" size={20} />                  // 行内に絵文字相当の高さで配置
//   <Twemoji emoji="🏆" size={24} ariaLabel="トロフィー" />
//   <Twemoji emoji="👶" size={64} />                  // 大きなアイコン
//
// 注意: 複合絵文字（ZWJ結合: 👨‍👩‍👧‍👦 等）も対応済み（codepoints() でゼロ幅結合子をきちんと拾う）

import type { ReactElement } from "react";

type Props = {
  /** 表示する絵文字（U+1F600 など、unicode emoji 文字列） */
  emoji: string;
  /** 表示サイズ（px）。行内なら現在のフォントサイズ近く（16〜20）、ボタンなら24〜32、ヒーローなら48〜64 */
  size?: number;
  /** 追加クラス（必要に応じて余白等） */
  className?: string;
  /** スクリーンリーダー用ラベル。装飾用なら未指定で aria-hidden になる */
  ariaLabel?: string;
};

// twemoji が採用する codepoint ファイル名生成ロジックの最小実装。
// 絵文字 1 文字 → "1f600" / "1f1ef-1f1f5" / "1f468-200d-1f469-200d-1f467-200d-1f466" 等。
// 下記の VARIATION_16 (FE0F) は twemoji 側で省略されることが多いので、特定のケースを除いて落とす。
const VARIATION_16 = 0xfe0f;
const ZERO_WIDTH_JOINER = 0x200d;

// twemoji の filenames 互換ロジック:
//   - 単一コードポイントで FE0F を含まない場合: そのままコードポイントだけ採用
//   - 単一コードポイントで FE0F を含む場合: FE0F を落とす
//   - ZWJ シーケンスを含む場合: FE0F は落とすが ZWJ (200D) は保持
function emojiToCodepoint(emoji: string): string {
  const codepoints: number[] = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined) {
      codepoints.push(cp);
    }
  }

  // ZWJ を含むかどうかで FE0F の扱いを変える
  const hasZwj = codepoints.includes(ZERO_WIDTH_JOINER);

  // ZWJ がない単一絵文字でも FE0F は落とす（twemoji の慣習）
  // ZWJ シーケンスでは FE0F は基本落とす（twemoji ファイル命名でも通常落としてある）
  void hasZwj;
  const filtered = codepoints.filter((cp) => cp !== VARIATION_16);

  return filtered.map((cp) => cp.toString(16)).join("-");
}

// jdecked/twemoji は元 twitter/twemoji の現役メンテfork (Discord 等が利用)。
// バージョンを明示固定することで、CDN 側のリリース変更に左右されない。
const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg";

export default function Twemoji({
  emoji,
  size = 20,
  className = "",
  ariaLabel,
}: Props): ReactElement {
  const codepoint = emojiToCodepoint(emoji);
  const src = `${TWEMOJI_BASE}/${codepoint}.svg`;

  // インラインフロー内で行高に揃えやすいように inline-block + vertical-align
  // フォント差をなくすためサイズは width/height の数値で固定
  // next/image を使わない理由:
  //   - twemoji SVG は1KB前後で既に最適化済み (LCP影響軽微)
  //   - Capacitor (iOS/Android) 環境では next/image の最適化エンジンが効かない
  //   - 静的書出 (next export) でも素の <img> の方が安全
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={ariaLabel ?? ""}
      aria-hidden={ariaLabel ? undefined : true}
      role={ariaLabel ? "img" : undefined}
      width={size}
      height={size}
      draggable={false}
      className={`inline-block align-[-0.125em] ${className}`}
      // 読み込み失敗時に元の絵文字テキストにフォールバックさせる属性
      // （CDNが落ちても何も見えなくなる事故を防ぐ）
      onError={(e) => {
        const img = e.currentTarget;
        // フォールバックとして親に絵文字テキストを差し込む（一度だけ）
        if (img.dataset.fallback !== "1" && img.parentElement) {
          img.dataset.fallback = "1";
          const span = document.createElement("span");
          span.textContent = emoji;
          span.style.fontSize = `${size}px`;
          span.style.lineHeight = "1";
          img.replaceWith(span);
        }
      }}
    />
  );
}
