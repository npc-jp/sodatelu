"use client";

// プライバシーポリシー — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom-extra2.jsx の BloomPrivacy
// 3つのお約束カード（primary-soft）が冒頭 / β版注釈 yellow / セクション列挙 / 末尾 dashed メール
//
// 設計鉄則: COPPA / GDPR-K の趣旨に従う・温かい言葉で誠実に
// 既存ロジック維持: 全11セクションのフルテキスト保持

import Link from "next/link";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import { Heart } from "@/components/illustrations";

const PROMISES = [
  "こどもの情報を 広告に使いません",
  "データを 勝手に売りません",
  "いつでも 全部 ダウンロード・削除できます",
];

export default function PrivacyPage() {
  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--bloom-bg)" }}
    >
      <BloomAppHeader
        title="プライバシーポリシー"
        subtitle="2026-05-19 制定"
        showBack
      />

      <main className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
        {/* 3つのお約束（冒頭） */}
        <BloomCard soft color="var(--bloom-primary-soft)" className="p-3.5">
          <div className="flex items-center gap-2">
            <Heart size={16} color="var(--bloom-accent)" />
            <div
              className="font-hand"
              style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
            >
              3つのお約束
            </div>
          </div>
          {PROMISES.map((p, i) => (
            <div
              key={i}
              className="mt-2 flex items-start gap-2"
            >
              <span
                className="font-hand shrink-0"
                style={{
                  color: "var(--bloom-primary)",
                  fontSize: "0.875rem",
                  lineHeight: 1.4,
                }}
              >
                ✦
              </span>
              <span
                className="text-[0.8125rem]"
                style={{ color: "var(--bloom-ink)", lineHeight: 1.6 }}
              >
                {p}
              </span>
            </div>
          ))}
        </BloomCard>

        {/* β版注釈 (yellow 太線帯) */}
        <div
          className="mt-4 rounded-xl px-3.5 py-2.5"
          style={{
            background: "var(--bloom-yellow)",
            border: "2px solid var(--bloom-line)",
            color: "var(--bloom-ink)",
            fontSize: "0.75rem",
            lineHeight: 1.6,
          }}
        >
          β版（ベータ版）のため、内容は今後アップデートされる可能性があります。
          重大な変更時は事前にお知らせします。制定: 2026-05-19
        </div>

        {/* 前文 */}
        <p
          className="mt-5 text-[0.8125rem]"
          style={{ color: "var(--bloom-ink)", lineHeight: 1.8 }}
        >
          sodatelu（そだてる）は、保護者さまがお子さまの成長を記録するためのアプリです。
          ここに書かれているのは、私たち（運営者：npc / 薮根 梓）が
          みなさまからお預かりした情報を、どのように扱うかという約束です。
          <br />
          <br />
          小さなお子さまの大切な情報を扱うサービスだからこそ、
          できるかぎりわかりやすく、誠実に書きました。
        </p>

        {/* 1. 収集する情報 */}
        <Section title="1. お預かりする情報">
          <p>sodatelu でお預かりするのは、次の情報です。</p>

          <Subtitle>保護者さまのアカウント情報</Subtitle>
          <UList
            items={[
              "メールアドレス（ログインに使用）",
              "表示名（ファミリー内で「誰が記録したか」表示用）",
              "プロフィール写真（任意・未設定でOK）",
            ]}
          />

          <Subtitle>お子さまの基本情報</Subtitle>
          <UList
            items={[
              "お名前またはニックネーム",
              "生年月日",
              "性別（男の子・女の子・じぶんらしく）",
              "プロフィール写真（任意）",
            ]}
          />

          <Subtitle>記録された成長の出来事</Subtitle>
          <UList
            items={[
              "記録のタイトル・カテゴリ・日時",
              "メモ（自由記述のテキスト）",
              "添付された写真",
              "マイルストーンとの紐付け情報",
            ]}
          />

          <Subtitle>ファミリー設定</Subtitle>
          <UList
            items={[
              "家族名・プラン（無料・プレミアム）",
              "招待中・参加中のメンバー（メールアドレスと表示名）",
            ]}
          />

          <p
            className="mt-3 rounded-xl px-3 py-2.5 text-[0.75rem]"
            style={{
              background: "var(--bloom-yellow)",
              border: "1.5px solid var(--bloom-line)",
              color: "var(--bloom-ink)",
              lineHeight: 1.6,
            }}
          >
            ヒント: お子さまの名前は、本名でなくニックネームでも構いません。
            プライバシーを大切にされたい場合は、ニックネーム運用をおすすめしています。
          </p>
        </Section>

        {/* 2. 利用目的 */}
        <Section title="2. 情報の使い方">
          <p>お預かりした情報は、次の目的だけに使います。</p>
          <UList
            items={[
              "記録の保存・表示・編集・きょうだい比較などの基本機能を動かすため",
              "家族で共有するため（招待された家族メンバーに記録を見せるため）",
              "サービスの不具合を直したり、使い心地をよくしたりするため",
              "サービスからの大切なお知らせをお届けするため",
            ]}
          />
          <p className="mt-2 font-bold" style={{ color: "var(--bloom-ink)" }}>
            広告配信・第三者への販売には絶対に使いません。
          </p>
        </Section>

        {/* 3. 保存場所と保存期間 */}
        <Section title="3. 保存場所と保存期間">
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
        </Section>

        {/* 4. 第三者提供 */}
        <Section title="4. 第三者への提供について">
          <p>
            お預かりした情報を、第三者に売ったり、広告会社に渡したりすることは
            <strong>絶対にしません</strong>。
          </p>
          <p>次のいずれかに該当する場合のみ、情報を開示することがあります。</p>
          <UList
            items={[
              "保護者さまご自身の同意がある場合",
              "法令に基づき、裁判所・捜査機関などから正当な手続で開示を求められた場合",
              "人の生命・身体・財産の保護のために必要で、ご本人の同意を得ることが困難な場合",
            ]}
          />
        </Section>

        {/* 5. 集計データの将来利用 */}
        <Section title="5. 集計データの将来利用について">
          <p>
            sodatelu は将来、ユーザーが増えた段階で
            「個人を特定できない統計データ」を、子育て研究や医療研究に役立てたいと考えています。
          </p>
          <p>
            これは私たちの長期的なビジョンの一部ですが、
            <strong>事前に必ずお知らせし、保護者さまがオプトイン（同意）してくださった場合のみ</strong>
            行います。同意していなくてもアプリのすべての機能はご利用いただけます。
          </p>
          <p>同意の有無は「設定 → プライバシー」からいつでも変更できます。</p>
        </Section>

        {/* 6. 子どもの情報（COPPA / GDPR-K） */}
        <Section title="6. お子さまの情報を守るために">
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
        </Section>

        {/* 7. データ主体の権利 */}
        <Section title="7. みなさまの権利">
          <p>保護者さまには、お預かりしている情報について次の権利があります。</p>
          <UList
            items={[
              "アクセスする権利：どのような情報がお預かりされているかを確認できます",
              "訂正する権利：記録内容・お子さまの情報・プロフィールはアプリ内でいつでも編集できます",
              "削除する権利：個別の記録、または全データ（アカウントごと）を削除できます",
              "データ移行（持ち運び）の権利：エクスポート機能は今後追加予定です",
              "同意を撤回する権利：集計データの将来利用などの同意は、いつでも撤回できます",
            ]}
          />
        </Section>

        {/* 8. データの削除 */}
        <Section title="8. データの削除について">
          <p>お預かりした情報は、いつでも削除できます。</p>
          <Subtitle>個別の記録を削除する</Subtitle>
          <p>
            記録の詳細画面から「削除する」ボタンで、その記録だけを削除できます。
            紐付いた写真も同時に削除されます。
          </p>
          <Subtitle>アカウントごと削除する</Subtitle>
          <p>
            アプリ内の「設定 → アカウントを削除する」から、いつでも自分で削除できます。
            削除されるのは、お子さまの情報・記録・写真・ファミリー設定すべてです。
          </p>
          <p
            className="mt-3 rounded-xl px-3 py-2.5 text-[0.75rem]"
            style={{
              background: "var(--bloom-bg)",
              border: "1.5px solid var(--bloom-line-soft)",
              color: "var(--bloom-ink-soft)",
              lineHeight: 1.6,
            }}
          >
            削除は数秒で完了し、削除後は元に戻すことはできません。
            操作の前に、必要な記録は保存しておいてください。
          </p>
        </Section>

        {/* 9. ブラウザに保存される情報 */}
        <Section title="9. ブラウザに保存される情報">
          <p>
            sodatelu はサービスを動かすために、お使いのブラウザに以下の情報を保存します。
          </p>
          <UList
            items={[
              "認証 Cookie（sodatelu_auth）：ログイン中であることを示す印",
              "Firebase 認証セッション（LocalStorage）：ログイン状態を維持するための仕組み",
            ]}
          />
          <p
            className="mt-2 text-[0.75rem]"
            style={{ color: "var(--bloom-ink-soft)" }}
          >
            ※ 第三者の解析・広告 SDK は組み込まれていません。
          </p>
        </Section>

        {/* 10. お問い合わせ */}
        <Section title="10. お問い合わせ">
          <p>
            プライバシーに関するご質問・データ削除リクエスト・その他お問い合わせは、
            以下の連絡先までお願いします。
          </p>
        </Section>

        {/* 11. 改訂について */}
        <Section title="11. このポリシーの改訂">
          <p>
            サービスの内容や法令の変更に応じて、このプライバシーポリシーを
            更新することがあります。重要な変更がある場合は、アプリ内のお知らせまたは
            ご登録のメールアドレスにご連絡します。
          </p>
          <p
            className="mt-2 text-[0.75rem]"
            style={{ color: "var(--bloom-ink-soft)" }}
          >
            制定日: 2026年5月19日
          </p>
        </Section>

        {/* 12. 事業者情報（個人情報取扱事業者） */}
        <Section title="12. 事業者情報">
          <p>
            sodatelu の運営者（個人情報取扱事業者）は以下のとおりです。
          </p>
          <div
            className="mt-2 rounded-xl px-3.5 py-3 text-[0.8125rem]"
            style={{
              background: "#fff",
              border: "1.5px solid var(--bloom-line-soft)",
              color: "var(--bloom-ink)",
              lineHeight: 1.9,
            }}
          >
            <div>
              <span style={{ color: "var(--bloom-ink-soft)" }}>屋号 / </span>
              npc（エヌ・ピー・シー）
            </div>
            <div>
              <span style={{ color: "var(--bloom-ink-soft)" }}>代表者 / </span>
              薮根 梓（やぶね あづさ）
            </div>
            <div>
              <span style={{ color: "var(--bloom-ink-soft)" }}>所在地 / </span>
              〒272-0138 千葉県市川市南行徳3-10-14
            </div>
            <div>
              <span style={{ color: "var(--bloom-ink-soft)" }}>連絡先 / </span>
              azusa-y@n-pc.jp
            </div>
            <div>
              <span style={{ color: "var(--bloom-ink-soft)" }}>電話 / </span>
              090-1077-5123
            </div>
            <div>
              <span style={{ color: "var(--bloom-ink-soft)" }}>
                インボイス登録番号 /{" "}
              </span>
              T7810616364509
            </div>
          </div>
        </Section>

        {/* 末尾: 問い合わせ先（dashed 枠） */}
        <div
          className="mt-7 rounded-[14px] p-3.5 text-center"
          style={{
            background: "#fff",
            border: "1.5px dashed var(--bloom-line-soft)",
          }}
        >
          <div
            className="font-hand"
            style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
          >
            ● ご質問は
          </div>
          <div
            className="mt-1 text-[0.75rem]"
            style={{
              color: "var(--bloom-ink-soft)",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            sodatelu.app@gmail.com
          </div>
          <div
            className="mt-1 text-[0.75rem]"
            style={{
              color: "var(--bloom-ink-soft)",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            azusa-y@n-pc.jp
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <Link
            href="/terms"
            className="font-hand text-[0.8125rem]"
            style={{ color: "var(--bloom-accent)" }}
          >
            利用規約はこちら →
          </Link>
          <Link
            href="/login"
            className="font-hand text-[0.8125rem]"
            style={{ color: "var(--bloom-accent)" }}
          >
            ログイン画面に戻る →
          </Link>
        </div>
      </main>

      <BloomBottomNav current="privacy" />
    </div>
  );
}

// セクション見出し + 本文ラッパ
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <h2
        className="font-hand mb-2"
        style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
      >
        {title}
      </h2>
      <div
        className="space-y-2 text-[0.8125rem]"
        style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.8 }}
      >
        {children}
      </div>
    </div>
  );
}

// 小見出し
function Subtitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-hand mt-2"
      style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
    >
      ● {children}
    </p>
  );
}

// 箇条書き
function UList({ items }: { items: string[] }) {
  return (
    <ul
      className="ml-4 list-disc space-y-0.5"
      style={{ color: "var(--bloom-ink-soft)" }}
    >
      {items.map((item, i) => (
        <li key={i} className="text-[0.8125rem]" style={{ lineHeight: 1.7 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}
