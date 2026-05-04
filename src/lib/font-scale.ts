// 文字サイズ設定（端末ごとに localStorage 保存）
// 「文字だけ大きく」よりも「全体を拡大」した方が、メニュー・カード・タップ領域も
// 一緒に大きくなって視認性・操作性が改善する。CSS の zoom で実装する。
//
// Firefox は zoom 非対応だが、現時点では Chrome/Safari (PWA含む) を主ターゲットとする。

export type FontScale = "small" | "medium" | "large";

export const FONT_SCALES: Record<FontScale, number> = {
  small: 1,
  medium: 1.5,
  large: 2,
};

export const FONT_SCALE_LABELS: Record<FontScale, string> = {
  small: "小",
  medium: "中（1.5倍）",
  large: "大（2倍）",
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

// html要素に zoom を適用。<html> 全体に効くので、レイアウトと文字が比例拡大される
export function applyFontScaleToDOM(value: FontScale) {
  if (typeof document === "undefined") return;
  const scale = FONT_SCALES[value];
  // CSS zoom は html 要素にかけて全体ズーム。Chromium/WebKit は対応。
  // Firefox は zoom 非対応だが β段階では割り切る
  document.documentElement.style.zoom = String(scale);
}
