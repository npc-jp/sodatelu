// 文字サイズ設定（端末ごとに localStorage 保存）
// 文字だけを拡大したいので、html の font-size を変えて、
// 各fontSize は rem 単位で記述する設計にする。
// アイコン・パディング・カードサイズは px のまま → 拡大されない。
//
// 基準: html font-size = 16px (small)。各UIテキストは rem 単位 = 設計時px / 16

export type FontScale = "small" | "medium" | "large";

// html の font-size (px)
export const FONT_SCALES: Record<FontScale, number> = {
  small: 16,
  medium: 20,
  large: 24,
};

export const FONT_SCALE_LABELS: Record<FontScale, string> = {
  small: "小",
  medium: "中",
  large: "大",
};

// セレクター下部の説明用
export const FONT_SCALE_DESCRIPTIONS: Record<FontScale, string> = {
  small: "標準サイズ",
  medium: "1.25倍",
  large: "1.5倍",
};

const STORAGE_KEY = "sodatelu.font_scale";

export function getFontScale(): FontScale {
  if (typeof window === "undefined") return "small";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "medium" || v === "large") return v;
  return "small";
}

export function setFontScale(value: FontScale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, value);
  applyFontScaleToDOM(value);
}

// html要素の font-size を変える。rem単位で書かれた文字は連動して拡大される
export function applyFontScaleToDOM(value: FontScale) {
  if (typeof document === "undefined") return;
  const px = FONT_SCALES[value];
  document.documentElement.style.fontSize = `${px}px`;
}
