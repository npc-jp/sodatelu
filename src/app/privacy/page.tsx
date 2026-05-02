"use client";

// プライバシーポリシー（β版）
// ビジョン文書 ver.2 のトーンに合わせて、温かい言葉で誠実に書く。
// 法的に万全な文書は本番リリース前に弁護士監修を入れる前提（注釈で明示）。
//
// このポリシーは Webβリリース（W3）でストア申請の必要要件を満たすために強化。
// COPPA（米国 児童オンラインプライバシー保護法）/ GDPR-K（EU児童版）の趣旨に従う。

import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/app-header";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <AppHeader title="プライバシーポリシー" showBack onBack={() => router.back()} />

      <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* β版注釈 */}
          <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
            これは β 版（ベータ版）のプライバシーポリシーです。
            正式リリース前には専門家の監修を経て改訂します。
            <br />
            最終更新: 2026-04-30
          </div>

          {/* 前文 */}
          <section>
            <p className="leading-relaxed text-slate-700">
              sodatelu（そだてる）は、保護者さまがお子さまの成長を記録するためのアプリです。
              ここに書かれているのは、私たち（運営者：npc / 薮根 梓）が
              みなさまからお預かりした情報を、どのように扱うかという約束です。
              <br />
              小さなお子さまの大切な情報を扱うサービスだからこそ、
              できるかぎりわかりやすく、誠実に書きました。
            </p>
          </section>

          {/* 1. 収集する情報 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              1. お預かりする情報
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
              <p>sodatelu でお預かりするのは、次の情報です。</p>

              <div>
                <p className="font-semibold text-slate-700">
                  保護者さまのアカウント情報
                </p>
                <ul className="ml-5 mt-1 list-disc space-y-0.5 text-slate-600">
                  <li>メールアドレス（ログインに使用）</li>
                  <li>表示名（ファミリー内で「誰が記録したか」表示用）</li>
                  <li>プロフィール写真（任意・未設定でOK）</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-700">
                  お子さまの基本情報
                </p>
                <ul className="ml-5 mt-1 list-disc space-y-0.5 text-slate-600">
                  <li>お名前またはニックネーム</li>
                  <li>生年月日</li>
                  <li>性別（男の子・女の子・じぶんらしく）</li>
                  <li>プロフィール写真（任意）</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-700">
                  記録された成長の出来事
                </p>
                <ul className="ml-5 mt-1 list-disc space-y-0.5 text-slate-600">
                  <li>記録のタイトル・カテゴリ・日時</li>
                  <li>メモ（自由記述のテキスト）</li>
                  <li>添付された写真</li>
                  <li>マイルストーンとの紐付け情報</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-700">
                  ファミリー設定
                </p>
                <ul className="ml-5 mt-1 list-disc space-y-0.5 text-slate-600">
                  <li>家族名・プラン（無料・プレミアム）</li>
                  <li>招待中・参加中のメンバー（メールアドレスと表示名）</li>
                </ul>
              </div>

              <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                ヒント: お子さまの名前は、本名でなくニックネームでも構いません。
                プライバシーを大切にされたい場合は、ニックネーム運用をおすすめしています。
              </p>
            </div>
          </section>

          {/* 2. 利用目的 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              2. 情報の使い方
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>お預かりした情報は、次の目的だけに使います。</p>
              <ul className="ml-5 list-disc space-y-1 text-slate-600">
                <li>記録の保存・表示・編集・きょうだい比較などの基本機能を動かすため</li>
                <li>家族で共有するため（招待された家族メンバーに記録を見せるため）</li>
                <li>サービスの不具合を直したり、使い心地をよくしたりするため</li>
                <li>サービスからの大切なお知らせ（重要なポリシー変更など）をお届けするため</li>
              </ul>
              <p>
                <strong>広告配信・第三者への販売には絶対に使いません。</strong>
              </p>
            </div>
          </section>

          {/* 3. 保存場所と保存期間 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              3. 保存場所と保存期間
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>
                記録された情報は Google が提供する Firebase Firestore、
                写真は Firebase Storage に保存されます。
                データセンターはいずれも東京リージョン（asia-northeast1）にあり、
                通信はすべて暗号化されます。
              </p>
              <p>
                Firebase は世界中のサービスで使われている信頼性の高いプラットフォームで、
                Google が定める厳格なセキュリティ基準で運用されています。
              </p>
              <p>
                <strong>保存期間：</strong>
                お預かりした情報は、保護者さまがアカウントを削除されるまで保存し続けます。
                アカウント削除後は、原則として速やかに（遅くとも30日以内に）
                すべての情報を削除します。
              </p>
            </div>
          </section>

          {/* 4. 第三者提供 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              4. 第三者への提供について
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>
                お預かりした情報を、第三者に売ったり、広告会社に渡したりすることは
                <strong>絶対にしません</strong>。
              </p>
              <p>
                次のいずれかに該当する場合のみ、情報を開示することがあります。
              </p>
              <ul className="ml-5 list-disc space-y-1 text-slate-600">
                <li>保護者さまご自身の同意がある場合</li>
                <li>法令に基づき、裁判所・捜査機関などから正当な手続で開示を求められた場合</li>
                <li>
                  人の生命・身体・財産の保護のために必要で、ご本人の同意を得ることが
                  困難な場合
                </li>
              </ul>
            </div>
          </section>

          {/* 5. 集計データの将来利用について */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              5. 集計データの将来利用について
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>
                sodatelu は将来、ユーザーが増えた段階で
                「個人を特定できない統計データ（どのお子さまのものかわからない、
                数字や月齢の分布など）」を、子育て研究や医療研究に役立てたいと考えています。
              </p>
              <p>
                これは私たちの長期的なビジョンの一部ですが、
                <strong>事前に必ずお知らせし、保護者さまがオプトイン（同意）してくださった場合のみ</strong>
                行います。同意していなくてもアプリのすべての機能はご利用いただけます。
              </p>
              <p>
                同意の有無は「設定 → プライバシー」からいつでも変更できます。
              </p>
            </div>
          </section>

          {/* 6. お子さまの情報の扱い（COPPA / GDPR-K） */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              6. お子さまの情報を守るために
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>
                sodatelu は「保護者さまが、ご自分のお子さまの成長を記録する」ためのアプリです。
                お子さまご自身がアプリを操作することは想定していません。
              </p>
              <p>
                COPPA（米国 児童オンラインプライバシー保護法）および
                GDPR-K（EU 一般データ保護規則 児童版）の趣旨に従い、
                <strong>13歳未満のお子さまから直接情報を収集することはありません</strong>。
                すべての記録は、保護者さまのアカウントを通じて、
                保護者さまの判断で入力されます。
              </p>
              <p>
                お子さまの個人データの扱いについては、
                保護者さまが「データ主体としての権利」（次項参照）を行使してください。
              </p>
            </div>
          </section>

          {/* 7. データ主体の権利 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              7. みなさまの権利
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>
                保護者さまには、お預かりしている情報について次の権利があります。
              </p>
              <ul className="ml-5 list-disc space-y-1 text-slate-600">
                <li>
                  <strong>アクセスする権利：</strong>
                  どのような情報がお預かりされているかを確認できます
                  （アプリ内でいつでも確認できます）
                </li>
                <li>
                  <strong>訂正する権利：</strong>
                  記録内容・お子さまの情報・プロフィールはアプリ内でいつでも編集できます
                </li>
                <li>
                  <strong>削除する権利：</strong>
                  個別の記録、または全データ（アカウントごと）を削除できます
                </li>
                <li>
                  <strong>データ移行（持ち運び）の権利：</strong>
                  記録データのエクスポート機能は今後追加予定です。
                  それまでの間は、お問い合わせ先までご連絡ください
                </li>
                <li>
                  <strong>同意を撤回する権利：</strong>
                  集計データの将来利用などの同意は、いつでも撤回できます
                </li>
              </ul>
            </div>
          </section>

          {/* 8. データの削除 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              8. データの削除について
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>お預かりした情報は、いつでも削除できます。</p>

              <div>
                <p className="font-semibold text-slate-700">個別の記録を削除する</p>
                <p className="text-slate-600">
                  記録の詳細画面から「削除する」ボタンで、その記録だけを削除できます。
                  紐付いた写真も同時に削除されます。
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-700">アカウントごと削除する</p>
                <p className="text-slate-600">
                  アプリ内の「設定 → アカウントを削除する」から、いつでも自分で削除できます。
                  削除されるのは、お子さまの情報・記録・写真・ファミリー設定すべてです。
                </p>
                <p className="mt-1 text-slate-600">
                  ファミリーに他のメンバーがいる場合は、自分だけがファミリーから抜ける形になり、
                  ファミリー本体や他のメンバーの記録は残ります。
                  自分が唯一のメンバーの場合は、ファミリーごとすべて削除されます。
                </p>
              </div>

              <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                削除は数秒で完了し、削除後は元に戻すことはできません。
                操作の前に、必要な記録は保存しておいてください。
              </p>
            </div>
          </section>

          {/* 9. ブラウザに保存される情報 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              9. ブラウザに保存される情報
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>
                sodatelu はサービスを動かすために、お使いのブラウザに以下の情報を保存します。
              </p>
              <ul className="ml-5 list-disc space-y-1 text-slate-600">
                <li>
                  <strong>認証 Cookie（sodatelu_auth）：</strong>
                  ログイン中であることを示す印。アプリの認証必須ページへのアクセスを
                  制御するために使います。広告トラッキングには使いません
                </li>
                <li>
                  <strong>Firebase 認証セッション（LocalStorage）：</strong>
                  ログイン状態を維持するための仕組み。ログアウトすると消えます
                </li>
              </ul>
              <p className="text-xs text-slate-500">
                ※ 第三者の解析・広告 SDK は組み込まれていません。
                将来 Google Analytics などを導入する場合は、改めてお知らせします。
              </p>
            </div>
          </section>

          {/* 10. お問い合わせ */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              10. お問い合わせ
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>
                プライバシーに関するご質問・データ削除リクエスト・その他お問い合わせは、
                以下の連絡先までお願いします。
              </p>
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold">運営者: npc（薮根 梓）</p>
                <p className="mt-1">プロダクト用: sodatelu.app@gmail.com</p>
                <p>運営者へ直接: azusa-y@n-pc.jp</p>
              </div>
              <p className="text-xs text-slate-500">
                ご返信には数日いただくことがあります。あらかじめご了承ください。
              </p>
            </div>
          </section>

          {/* 11. 改訂について */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800">
              11. このポリシーの改訂
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>
                サービスの内容や法令の変更に応じて、このプライバシーポリシーを
                更新することがあります。
                重要な変更がある場合は、アプリ内のお知らせまたはご登録のメールアドレスに
                ご連絡します。
              </p>

              <div>
                <p className="font-semibold text-slate-700">改定履歴</p>
                <ul className="ml-5 mt-1 list-disc space-y-1 text-slate-600">
                  <li>
                    2026-04-30: ver.2 へ改訂。COPPA / GDPR-K 対応を明示。
                    アプリ内アカウント削除機能の追加に伴い削除手順を更新。
                    集計データ将来利用についてオプトイン方針を追加
                  </li>
                  <li>2026-04-上旬: 初版（ver.1）を β 公開</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 末尾の注釈 */}
          <div className="rounded-2xl bg-slate-100 p-4 text-xs leading-relaxed text-slate-600">
            ※ 本ポリシーは β 版での暫定版です。本番リリース前に弁護士監修を経て改訂します。
            ご質問・ご懸念があれば、お気軽に上記連絡先までお寄せください。
          </div>

          {/* 戻るリンク */}
          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-amber-600 hover:text-amber-700"
            >
              ログイン画面に戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
