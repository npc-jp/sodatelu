// アプリ内ブラウザ（embedded webview）の検出
// LINE / X / Instagram / Facebook / Discord / TikTok 等のアプリ内で開いた場合、
// Google OAuth が `disallowed_useragent` エラーで拒否される（Googleの仕様、2021年〜）。
// 検出してユーザーに「Safari/Chrome で開いてください」案内を出すために使う。

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const patterns = [
    /Line\//i, // LINE
    /FBAN|FBAV|FB_IAB/i, // Facebook (FBAN=ネイティブ, FBAV=アプリ版, FB_IAB=Android)
    /Instagram/i, // Instagram
    /Twitter|TwitterAndroid/i, // X (Twitter)
    /Discord/i, // Discord
    /Snapchat/i, // Snapchat
    /TikTok/i, // TikTok
    /MicroMessenger/i, // WeChat
    /KAKAOTALK/i, // KakaoTalk
  ];
  return patterns.some((p) => p.test(ua));
}

// 主要ブラウザの推奨URLを生成（任意）
export function getCurrentUrl(): string {
  if (typeof window === "undefined") return "https://sodatelu.vercel.app";
  return window.location.href;
}

// OS判定して案内する推奨ブラウザ名を返す
// iOS → Safari / Android → Chrome / その他 → Safari か Chrome
export function getRecommendedBrowserName(): string {
  if (typeof navigator === "undefined") return "Safari か Chrome";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "Safari";
  if (/Android/i.test(ua)) return "Chrome";
  return "Safari か Chrome";
}
