"use client";

// 利用規約 — Bloom デザイン適用
// 参照: /privacy/page.tsx の構造を踏襲
// 弱免責 + バックアップ案内セット
//
// 設計鉄則: ストア申請用の最小限の規約。法的に必要な条項は揃えつつ温かい言葉で
// エクスポート機能は現時点で未実装のため「準備中・スクリーンショット推奨」と明記

import Link from "next/link";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import { Heart } from "@/components/illustrations";

export default function TermsPage() {
  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--bloom-bg)" }}
    >
      <BloomAppHeader
        title="利用規約"
        subtitle="2026-05-19 制定"
        showBack
      />

      <main className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
        {/* 冒頭メッセージ（primary-soft カード） */}
        <BloomCard soft color="var(--bloom-primary-soft)" className="p-3.5">
          <div className="flex items-center gap-2">
            <Heart size={16} color="var(--bloom-accent)" />
            <div
              className="font-hand"
              style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
            >
              はじめに
            </div>
          </div>
          <p
            className="mt-2 text-[0.8125rem]"
            style={{ color: "var(--bloom-ink)", lineHeight: 1.7 }}
          >
            この規約は、sodatelu（そだてる）をご利用いただくときの
            お約束ごとをまとめたものです。安心して使っていただくために、
            できるだけわかりやすく書きました。
          </p>
        </BloomCard>

        {/* β版注釈 */}
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
          本利用規約（以下「本規約」といいます）は、npc（以下「当方」といいます）が
          提供する sodatelu（以下「本サービス」といいます）の利用条件を定めるものです。
          ご利用にあたっては、本規約に同意いただいたものとみなします。
        </p>

        {/* 第1条 サービス内容 */}
        <Section title="第1条 サービス内容">
          <p>
            本サービスは、保護者が、お子さまの成長記録（身長・体重・写真・メモなど）を
            記録・保存し、家族と共有するためのアプリケーションです。
          </p>
          <p>
            本サービスは、保護者によるお子さまの記録を目的としており、
            お子さまご自身が直接利用することは想定していません。
          </p>
        </Section>

        {/* 第2条 アカウント */}
        <Section title="第2条 アカウント">
          <UList
            items={[
              "本サービスは、1ユーザーにつき1アカウントの登録を原則とします。",
              "本サービスは、13歳以上の保護者、または保護者の同意を得た成年の方にご利用いただけます。",
              "アカウントの登録情報（メールアドレス・パスワードなど）の管理責任は、利用者に帰属します。",
              "アカウントの不正利用、第三者による利用を発見した場合は、速やかに当方までご連絡ください。",
            ]}
          />
        </Section>

        {/* 第3条 禁止事項 */}
        <Section title="第3条 禁止事項">
          <p>本サービスのご利用にあたり、以下の行為を禁止します。</p>
          <UList
            items={[
              "他人のアカウントを不正に利用する行為",
              "本サービスのリバースエンジニアリング、解析、スクレイピング等の行為",
              "本サービスの運営を妨害する行為、サーバーやデータを改ざんする行為",
              "法令、公序良俗に反する行為",
              "第三者または当方の権利を侵害する行為",
              "その他、当方が不適切と判断する行為",
            ]}
          />
        </Section>

        {/* 第4条 知的財産 */}
        <Section title="第4条 知的財産">
          <Subtitle>本サービスに関する権利</Subtitle>
          <p>
            本サービス、および本サービス上で当方が提供するコンテンツ（デザイン・
            ロゴ・テキスト・プログラム等）に関する著作権、商標権その他の知的財産権は、
            すべて当方に帰属します。
          </p>

          <Subtitle>利用者がアップロードしたコンテンツ</Subtitle>
          <p>
            利用者が本サービス上にアップロードした写真・記録テキスト等のコンテンツ
            （以下「ユーザーコンテンツ」といいます）の著作権は、
            <strong>利用者ご本人に帰属します</strong>。
          </p>
          <p>
            当方は、本サービスの提供・運営・改善に必要な範囲で、
            ユーザーコンテンツを利用するためのライセンスのみ許諾を受けるものとします。
            個別の宣伝・販売・第三者への提供は行いません。
          </p>
        </Section>

        {/* 第5条 免責事項 */}
        <Section title="第5条 免責事項">
          <p>
            当方は、利用者の大切な記録を保護するため、最大限の注意を払って
            サービスを運営します。ただし、以下の事由により発生したデータの消失・
            サービスの停止・遅延等について、当方は損害賠償の責任を負わないものとします。
          </p>
          <UList
            items={[
              "本サービスの障害、サーバーの障害",
              "通信回線・コンピュータ等の故障",
              "天災・地変・戦争・暴動・労働争議その他の不可抗力",
              "第三者による不正アクセス、サイバー攻撃",
              "その他、当方の責に帰すべからざる事由",
            ]}
          />
          <p
            className="mt-2 text-[0.75rem]"
            style={{ color: "var(--bloom-ink-soft)" }}
          >
            ※ 当方に故意または重大な過失がある場合には、本条は適用されません。
          </p>
        </Section>

        {/* 第6条 データのバックアップ推奨 */}
        <Section title="第6条 データのバックアップ">
          <p>
            利用者は、大切な記録を保護するため、
            <strong>
              定期的にご自身でデータのバックアップを取ることを推奨します
            </strong>
            。
          </p>
          <p
            className="mt-3 rounded-xl px-3 py-2.5 text-[0.75rem]"
            style={{
              background: "var(--bloom-yellow)",
              border: "1.5px solid var(--bloom-line)",
              color: "var(--bloom-ink)",
              lineHeight: 1.6,
            }}
          >
            現在、データのエクスポート機能は実装準備中です。
            大切な思い出は、スクリーンショット等で
            お手元にも残しておくことを推奨します。
            エクスポート機能の追加時には、改めてご案内します。
          </p>
        </Section>

        {/* 第7条 サービスの変更・終了 */}
        <Section title="第7条 サービスの変更・終了">
          <p>
            当方は、事前に告知の上、本サービスの内容を変更、または提供を終了することができます。
          </p>
          <p>
            重要な変更・サービス終了の場合は、アプリ内のお知らせまたは
            ご登録のメールアドレスにて事前にご連絡します。
          </p>
        </Section>

        {/* 第8条 改定 */}
        <Section title="第8条 規約の改定">
          <p>
            当方は、必要に応じて本規約を改定することがあります。
            改定後の規約は、アプリ内のお知らせまたはご登録のメールアドレスにて
            告知した時点から効力を生じるものとします。
          </p>
          <p>
            改定後も継続して本サービスをご利用いただく場合は、
            改定後の規約に同意いただいたものとみなします。
          </p>
        </Section>

        {/* 第9条 準拠法・管轄 */}
        <Section title="第9条 準拠法および管轄裁判所">
          <p>本規約の準拠法は日本法とします。</p>
          <p>
            本サービスに関連して当方と利用者との間で生じた紛争については、
            <strong>千葉地方裁判所を第一審の専属的合意管轄裁判所</strong>
            とします。
          </p>
        </Section>

        {/* 制定日 */}
        <p
          className="mt-5 text-[0.75rem]"
          style={{ color: "var(--bloom-ink-soft)" }}
        >
          制定日: 2026年5月19日
        </p>

        {/* 事業者情報 */}
        <Section title="事業者情報">
          <p>本サービスの運営者は以下のとおりです。</p>
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
              薮根 梓(やぶね あづさ)
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

        {/* 関連リンク */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <Link
            href="/privacy"
            className="font-hand text-[0.8125rem]"
            style={{ color: "var(--bloom-accent)" }}
          >
            プライバシーポリシーはこちら →
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

      <BloomBottomNav current="terms" />
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
