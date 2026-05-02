// Next.js 16 の proxy.ts（旧 middleware.ts）
// 認証必須パスへの未認証アクセスを /login へリダイレクトする
//
// 仕組み:
// - クライアント側 (auth-context) で onAuthStateChanged を監視し、
//   ログイン状態を `sodatelu_auth` という名前の cookie に書き込む
// - proxy はこの cookie の有無だけで判定する（軽量・Edge互換）
// - cookie の値そのものはセキュリティ境界としては弱いので、
//   実際の認可・厳密な検証は Firestore Rules（CRIT-01）で担保する
//
// 注意:
// - Firebase Auth の本物の検証は ID token を Firebase Admin SDK で verify する必要がある
//   が、Edge runtime では admin SDK が動かない。Node.js runtime + Firebase REST API での
//   検証はパフォーマンス影響大なので、β段階では「未認証ユーザーを軽くブロック + 本番の
//   セキュリティは Firestore Rules で担保」という二段構えで行く

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 認証必須のパス
const PROTECTED_PATHS = [
  "/home",
  "/calendar",
  "/book",
  "/compare",
  "/milestones",
  "/record",
  "/write",
  "/family",
  "/add-child",
  "/admin",
  "/settings",
  "/upgrade",
];

// 認証済みでアクセスすると /home へ飛ばすパス
const AUTH_PATHS = ["/login"];

// クライアント側 (auth-context) で書き込む認証印 cookie の名前
const AUTH_COOKIE_NAME = "sodatelu_auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 認証済みかどうかは cookie の存在のみで判定
  const hasAuthCookie = request.cookies.has(AUTH_COOKIE_NAME);

  // 認証必須パスへの未認証アクセス → /login へ
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isProtected && !hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    // 元のパスを next クエリで保持（ログイン後に戻れるように）
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ログイン済みユーザーが /login を踏んだ場合は /home へ
  const isAuthPath = AUTH_PATHS.some((p) => pathname === p);
  if (isAuthPath && hasAuthCookie) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // 静的ファイル・APIルート・Next.js内部パスは除外
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
