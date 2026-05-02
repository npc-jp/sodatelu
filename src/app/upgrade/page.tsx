"use client";

// プレミアムアップグレード紹介画面 (/upgrade)
//
// 役割:
//   - 設定画面からの導線で、有料プラン（プレミアム）の特典を温かく紹介する
//   - β期間中は実購入はせず、CTAタップ時にalertで「準備中」案内を返す
//
// セクション構成:
//   1. ヒーロー（温かいキャッチ）
//   2. 現在のプラン表示（無料 / プレミアム）
//   3. 「いますぐ使える」特典 4項目（実装済み・ストア審査でも安全）
//   4. 「これからの予定」4項目（未実装・将来予定。バッジで明確に「予定」表示）
//   5. CTAボタン
//   6. 末尾の約束事
//
// トーン:
//   - 「ドキッとさせない」
//   - 「アップグレードしないとできない」ではなく「アップグレードでできる」
//   - 機能の説明は「便利」より「気持ち」「体験」に寄せる

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/app-header";
import Twemoji from "@/components/twemoji";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plan-context";

// 「いますぐ使える」特典リスト
const AVAILABLE_BENEFITS: ReadonlyArray<{
  emoji: string;
  title: string;
  body: string;
  hint: string;
}> = [
  {
    emoji: "✨",
    title: "カテゴリが11種類に",
    body: "「できた・おめでとう・始めた」に加えて、「がんばった」「感じた」「言った」「行った」「やめた」「あげた、もらった」「のりこえた」「ありがとう」が使えます。",
    hint: "感情の機微まで、丁寧に記録できる",
  },
  {
    emoji: "👶",
    title: "きょうだい無制限",
    body: "無料は2人まで。3人目以降のきょうだいも、同じ年表に並べて成長を見比べられます。",
    hint: "全員ぶんを、同じ場所で育てる",
  },
  {
    emoji: "📷",
    title: "写真 無制限",
    body: "無料は月10枚まで。プレミアムなら、毎日の小さな瞬間も全部残せます。",
    hint: "撮りたい時に、ためらわず",
  },
  {
    emoji: "👨‍👩‍👧‍👦",
    title: "家族共有 無制限",
    body: "無料はパートナー1人まで。祖父母や、親しい友人にも記録を共有できます。",
    hint: "離れていても、同じ景色を",
  },
];

// 「これから追加される機能」リスト
const COMING_BENEFITS: ReadonlyArray<{
  emoji: string;
  title: string;
  body: string;
}> = [
  {
    emoji: "📖",
    title: "思い出ページ卒業版",
    body: "12歳の誕生日に、12年間の記録を集めた「特別な思い出ページ」が現れます。",
  },
  {
    emoji: "🔔",
    title: "発達の気づきアラート",
    body: "お子さまの月齢から「気になるかもしれない」サインを、そっとお知らせ（オプトイン）。",
  },
  {
    emoji: "🌍",
    title: "sodateluみんなの統計",
    body: "世界中のsodateluファミリーの記録から、お子さまのペースを優しく可視化。",
  },
  {
    emoji: "👥",
    title: "友達と共有",
    body: "特定のきろくだけ、信頼できるお友達と共有できる。",
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isPremium } = usePlan();

  // 未ログインなら /login へ（proxy.ts でも保護するが、二重で安全側に倒す）
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  function handleUpgrade() {
    alert(
      "β期間中はアップグレードを準備中です。正式リリース後にご案内します"
    );
  }

  if (authLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <AppHeader
        title="プレミアムプラン"
        showBack
        onBack={() => router.back()}
      />

      <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* 1. ヒーロー */}
          <section className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/60 p-6 text-center shadow-sm">
            <div className="flex justify-center">
              <Twemoji emoji="🌟" size={56} ariaLabel="プレミアム" />
            </div>
            <h2 className="mt-3 text-lg font-bold text-slate-800">
              お子さまの記録を、
              <br />
              もっと豊かに。
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              プレミアムにすると、毎日のささやかな一瞬を、
              <br />
              もっと丁寧に、もっと自由に残せます。
            </p>
          </section>

          {/* 2. 現在のプラン */}
          <section className="rounded-2xl bg-amber-50/70 p-4">
            <p className="text-xs text-slate-500">現在のプラン</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              {isPremium ? "プレミアムプラン" : "無料プラン"}
            </p>
            {isPremium && (
              <p className="mt-1 text-xs text-slate-500">
                すべての機能をご利用いただけます。ありがとうございます
              </p>
            )}
          </section>

          {/* 3. いますぐ使える特典 */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-bold text-slate-800">
                アップグレードでできること
              </h3>
              <span className="text-xs text-slate-400">いますぐ使える</span>
            </div>

            <div className="space-y-3">
              {AVAILABLE_BENEFITS.map((b) => (
                <article
                  key={b.title}
                  className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 pt-0.5">
                      <Twemoji emoji={b.emoji} size={28} ariaLabel={b.title} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-800">
                        {b.title}
                      </h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                        {b.body}
                      </p>
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        {b.hint}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* 4. これから追加される機能（控えめ） */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-slate-600">
                これからの予定
              </h3>
              <span className="text-xs text-slate-400">Coming soon</span>
            </div>

            <div className="space-y-2.5">
              {COMING_BENEFITS.map((b) => (
                <article
                  key={b.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 pt-0.5 opacity-70">
                      <Twemoji emoji={b.emoji} size={22} ariaLabel={b.title} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-700">
                          {b.title}
                        </h4>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
                          <Twemoji emoji="🌱" size={10} />
                          準備中
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {b.body}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* 5. CTAボタン（プレミアムでない時だけ表示） */}
          {!isPremium && (
            <section className="pt-2">
              <button
                type="button"
                onClick={handleUpgrade}
                className="w-full rounded-2xl bg-amber-500 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-amber-600 active:bg-amber-600"
              >
                プレミアムにアップグレード
              </button>
            </section>
          )}

          {/* 6. 末尾の約束事 */}
          <section className="space-y-1 pt-2 text-center">
            <p className="text-xs text-slate-400">
              ※ 現在β版です。正式リリース時にご案内します
            </p>
            <p className="text-xs text-slate-400">
              ※ プレミアムプランは月額/年額制を予定しています（価格未定）
            </p>
          </section>

          {/* 戻る */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              戻る
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
