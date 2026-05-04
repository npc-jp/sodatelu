"use client";

// ファミリー設定画面 — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom-extra.jsx の BloomFamily
// Heart ヘッダー / こども / 記録できるひと / 「+ 家族をしょうたい」CTA
//
// 既存ロジック維持: メンバー一覧 + 招待送信 + 自分宛招待の承認/辞退

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plan-context";
import { doc, getDoc, type DocumentReference } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Family } from "@/lib/firestore";
import {
  sendInvitation,
  getFamilyMembers,
  getPendingInvitations,
  getInvitationsForEmail,
  acceptInvitation,
  declineInvitation,
  type AppUser,
  type Invitation,
} from "@/lib/firestore";
import { useChild } from "@/lib/child-context";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import { Heart, Sparkle, Sprout, Star } from "@/components/illustrations";

// 子どもごとのカラー
const CHILD_COLORS = [
  "var(--bloom-primary)",
  "var(--bloom-accent)",
  "var(--bloom-pink)",
  "var(--bloom-yellow)",
];

// 月齢の簡易表示
function compactAge(birthMs: number): string {
  const diffMs = Date.now() - birthMs;
  const totalMonths = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
  if (totalMonths < 1) {
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return `${days}日`;
  }
  if (totalMonths < 12) return `${totalMonths}ヶ月`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y}歳${m}ヶ月` : `${y}歳`;
}

export default function FamilyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPremium } = usePlan();
  const { children: kids, refreshChildren } = useChild();

  const [familyId, setFamilyId] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [members, setMembers] = useState<(AppUser & { id: string })[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<(Invitation & { id: string })[]>([]);
  const [myInvitations, setMyInvitations] = useState<(Invitation & { id: string })[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  // 招待成功後に表示する「相手に送るメッセージ」（コピー用）
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const userSnap = await getDoc(doc(db, "users", user!.uid));
      if (!userSnap.exists()) return;
      const userData = userSnap.data();
      const familyRef = userData.family_id as DocumentReference<Family> | null;

      if (familyRef) {
        setFamilyId(familyRef.id);
        const familySnap = await getDoc(familyRef);
        if (familySnap.exists()) {
          const familyData = familySnap.data();
          setFamilyName(familyData.family_name);
        }
        const m = await getFamilyMembers(familyRef.id);
        setMembers(m);
        const inv = await getPendingInvitations(familyRef.id);
        setPendingInvitations(inv);
      }

      if (user!.email) {
        const myInv = await getInvitationsForEmail(user!.email);
        setMyInvitations(myInv);
      }

      setLoading(false);
    }

    fetchData();
  }, [user]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !familyId || !inviteEmail) return;

    if (!isPremium && members.length >= 2) {
      setStatus("無料プランでは1人まで招待できます");
      return;
    }

    setSending(true);
    setStatus("");
    try {
      await sendInvitation({
        familyId,
        invitedEmail: inviteEmail,
        invitedByUid: user.uid,
        invitedByName: user.displayName || user.email || "",
      });
      // 招待登録成功 → 相手に LINE 等で送ってもらうメッセージを生成
      const inviterName = user.displayName || user.email || "";
      const url = typeof window !== "undefined" ? window.location.origin : "https://sodatelu.vercel.app";
      const message = `sodatelu の家族に招待しました🌱

${inviterName} さんから招待が届いています。
下のURLを開いて、メールアドレス
${inviteEmail}
でログインすると参加できます👇

${url}`;
      setShareMessage(message);
      setStatus("");
      setInviteEmail("");
      const inv = await getPendingInvitations(familyId);
      setPendingInvitations(inv);
      setShowInviteForm(false);
    } catch {
      setStatus("招待の登録に失敗しました");
    } finally {
      setSending(false);
    }
  }

  async function handleCopyShareMessage() {
    if (!shareMessage) return;
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード使えない場合のフォールバック（古いブラウザ等）
      alert("コピーできませんでした。長押しで選択してコピーしてください");
    }
  }

  async function handleAccept(invitationId: string) {
    if (!user) return;
    try {
      await acceptInvitation(invitationId, user.uid);
      await refreshChildren();
      window.location.reload();
    } catch {
      setStatus("招待の承認に失敗しました");
    }
  }

  async function handleDecline(invitationId: string) {
    try {
      await declineInvitation(invitationId);
      setMyInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch {
      setStatus("招待の辞退に失敗しました");
    }
  }

  if (loading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--bloom-bg)" }}
      >
        <Sprout size={42} color="var(--bloom-primary)" />
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--bloom-bg)" }}
    >
      <BloomAppHeader
        title="ファミリー"
        subtitle={familyName}
        showBack
        rightSlot={<Heart size={16} color="var(--bloom-accent)" />}
      />

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        {/* 自分宛招待 */}
        {myInvitations.length > 0 && (
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkle size={14} color="var(--bloom-accent)" />
              <h2
                className="font-hand"
                style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
              >
                あなた宛の招待
              </h2>
            </div>
            {myInvitations.map((inv) => (
              <BloomCard
                key={inv.id}
                soft
                color="var(--bloom-accent-soft)"
                className="mb-2 p-3.5"
              >
                <p
                  className="font-hand"
                  style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
                >
                  {inv.invited_by_name} さんからの招待
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccept(inv.id)}
                    className="bloom-border bloom-shadow font-hand flex-1 rounded-xl py-2 text-white"
                    style={{
                      background: "var(--bloom-primary)",
                      fontSize: "0.8125rem",
                      letterSpacing: "0.05em",
                    }}
                  >
                    参加する
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(inv.id)}
                    className="bloom-border bloom-shadow-soft flex-1 rounded-xl py-2 text-sm"
                    style={{
                      background: "#fff",
                      color: "var(--bloom-ink)",
                    }}
                  >
                    辞退
                  </button>
                </div>
              </BloomCard>
            ))}
          </div>
        )}

        {/* こどもセクション */}
        <div className="mb-2 flex items-center gap-2">
          <Sprout size={16} color="var(--bloom-primary)" />
          <h2
            className="font-hand"
            style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
          >
            こども
          </h2>
        </div>
        {kids.map((kid, i) => {
          const color = CHILD_COLORS[i % CHILD_COLORS.length];
          return (
            <BloomCard key={kid.id} soft className="mb-2">
              <button
                type="button"
                onClick={() => router.push(`/edit-child/${kid.id}`)}
                className="flex w-full items-center gap-3 p-3 text-left"
                aria-label={`${kid.name} のプロフィールを編集`}
              >
                <div
                  className="bloom-border flex shrink-0 items-center justify-center rounded-full"
                  style={{
                    width: 44,
                    height: 44,
                    background: color,
                    fontFamily: "Yusei Magic, sans-serif",
                    fontSize: "1.125rem",
                    color: "#fff",
                  }}
                >
                  {kid.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-hand truncate"
                    style={{ fontSize: "0.9375rem", color: "var(--bloom-ink)" }}
                  >
                    {kid.name}
                  </div>
                  <div
                    className="mt-0.5 text-[0.75rem]"
                    style={{ color: "var(--bloom-ink-soft)" }}
                  >
                    {compactAge(kid.birth_date.toDate().getTime())}
                  </div>
                </div>
                <span style={{ color: "var(--bloom-ink-soft)" }}>›</span>
              </button>
            </BloomCard>
          );
        })}
        {/* きょうだい追加カード（dashed） */}
        <button
          type="button"
          onClick={() => router.push("/add-child")}
          className="mb-5 flex w-full items-center gap-3 rounded-[18px] px-3.5 py-3"
          style={{
            background: "var(--bloom-primary-soft)",
            border: "2px dashed var(--bloom-line)",
            boxShadow: "2px 2px 0 var(--bloom-line)",
          }}
        >
          <div
            className="flex shrink-0 items-center justify-center rounded-full"
            style={{
              width: 44,
              height: 44,
              background: "#fff",
              border: "2px dashed var(--bloom-line)",
              fontFamily: "Yusei Magic, sans-serif",
              fontSize: "1.375rem",
              color: "var(--bloom-ink-soft)",
            }}
          >
            ＋
          </div>
          <div className="flex-1 text-left">
            <div
              className="font-hand"
              style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
            >
              きょうだいを追加
            </div>
            <div
              className="mt-0.5 text-[0.75rem]"
              style={{ color: "var(--bloom-ink-soft)" }}
            >
              2人目から年表が並びます
            </div>
          </div>
        </button>

        {/* 記録できるひと */}
        <div className="mb-2 flex items-center gap-2">
          <Star size={16} color="var(--bloom-yellow)" />
          <h2
            className="font-hand"
            style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
          >
            記録できるひと
          </h2>
        </div>
        {members.map((member, i) => {
          const isMe = member.uid === user?.uid;
          const color = CHILD_COLORS[(i + 1) % CHILD_COLORS.length];
          const initial = (member.display_name || member.email || "?").charAt(0);
          return (
            <BloomCard
              key={member.id}
              soft
              className="mb-2 flex items-center gap-3 p-3"
            >
              <div
                className="bloom-border flex shrink-0 items-center justify-center rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  background: color,
                  fontFamily: "Yusei Magic, sans-serif",
                  fontSize: "0.8125rem",
                  color: "#fff",
                }}
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-hand truncate"
                  style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
                >
                  {isMe ? "あなた" : member.display_name || member.email}
                </div>
                <div
                  className="text-[0.75rem] truncate"
                  style={{ color: "var(--bloom-ink-soft)" }}
                >
                  {member.email}
                </div>
              </div>
              <span
                className="rounded-md px-2 py-0.5 text-[0.75rem]"
                style={{
                  background: "var(--bloom-bg)",
                  border: "1.5px solid var(--bloom-line-soft)",
                  color: "var(--bloom-ink-soft)",
                }}
              >
                {isMe ? "オーナー" : "メンバー"}
              </span>
            </BloomCard>
          );
        })}

        {/* 保留中の招待 */}
        {pendingInvitations.length > 0 && (
          <div className="mt-4">
            <div
              className="mb-2 text-[0.75rem]"
              style={{ color: "var(--bloom-ink-soft)" }}
            >
              招待中…
            </div>
            {pendingInvitations.map((inv) => (
              <BloomCard
                key={inv.id}
                soft
                className="mb-2 flex items-center gap-3 p-3"
              >
                <div
                  className="flex shrink-0 items-center justify-center rounded-full"
                  style={{
                    width: 36,
                    height: 36,
                    background: "var(--bloom-bg)",
                    border: "1.5px solid var(--bloom-line-soft)",
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>✉</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="truncate text-[0.8125rem]"
                    style={{ color: "var(--bloom-ink)" }}
                  >
                    {inv.invited_email}
                  </div>
                  <div
                    className="text-[0.75rem]"
                    style={{ color: "var(--bloom-ink-soft)" }}
                  >
                    承認待ち
                  </div>
                </div>
              </BloomCard>
            ))}
          </div>
        )}

        {/* 招待登録後に表示する「相手に送るメッセージ」 */}
        {shareMessage && (
          <BloomCard
            soft
            color="var(--bloom-primary-soft)"
            className="mt-4 p-4"
          >
            <p
              className="font-hand mb-2"
              style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
            >
              ✦ 招待を登録しました
            </p>
            <p
              className="text-[0.8125rem]"
              style={{ color: "var(--bloom-ink)", lineHeight: 1.7 }}
            >
              下のメッセージを LINE などで相手に送ってください。
              <br />
              相手がリンクからログインすると、家族に参加できます。
            </p>
            <pre
              className="mt-3 whitespace-pre-wrap rounded-xl p-3 text-[0.75rem]"
              style={{
                background: "#fff",
                border: "1.5px solid var(--bloom-line)",
                color: "var(--bloom-ink)",
                fontFamily: "Zen Kaku Gothic New, sans-serif",
                lineHeight: 1.7,
              }}
            >
              {shareMessage}
            </pre>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleCopyShareMessage}
                className="bloom-border bloom-shadow font-hand flex-1 rounded-xl py-2.5 text-white"
                style={{
                  background: "var(--bloom-primary)",
                  fontSize: "0.8125rem",
                }}
              >
                {copied ? "✓ コピーしました" : "コピーする"}
              </button>
              <button
                type="button"
                onClick={() => setShareMessage(null)}
                className="bloom-border bloom-shadow-soft flex-1 rounded-xl py-2.5 text-sm"
                style={{ background: "#fff", color: "var(--bloom-ink)" }}
              >
                とじる
              </button>
            </div>
          </BloomCard>
        )}

        {/* 招待CTA */}
        {!showInviteForm ? (
          <button
            type="button"
            onClick={() => setShowInviteForm(true)}
            className="bloom-border bloom-shadow font-hand mt-4 w-full rounded-[14px] py-3.5"
            style={{
              background: "var(--bloom-yellow)",
              color: "var(--bloom-ink)",
              fontSize: "0.875rem",
              letterSpacing: "0.05em",
            }}
          >
            ＋ 家族をしょうたい
          </button>
        ) : (
          <BloomCard soft className="mt-4 p-4">
            <form onSubmit={handleInvite} className="space-y-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="メールアドレス"
                className="block w-full rounded-xl px-3 py-2.5 text-[0.8125rem] focus:outline-none"
                style={{
                  background: "var(--bloom-bg)",
                  border: "1.5px solid var(--bloom-line-soft)",
                  color: "var(--bloom-ink)",
                }}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="bloom-border bloom-shadow font-hand flex-1 rounded-xl py-2 text-white disabled:opacity-50"
                  style={{
                    background: "var(--bloom-primary)",
                    fontSize: "0.8125rem",
                  }}
                >
                  {sending ? "送信中…" : "送る"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmail("");
                  }}
                  className="bloom-border bloom-shadow-soft flex-1 rounded-xl py-2 text-sm"
                  style={{ background: "#fff", color: "var(--bloom-ink)" }}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </BloomCard>
        )}

        <p
          className="mt-3 text-center text-[0.75rem]"
          style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.6 }}
        >
          招待を登録すると、相手にお知らせする
          <br />
          メッセージが表示されます
        </p>

        {status && (
          <p
            className="mt-3 text-center text-[0.8125rem]"
            style={{ color: "var(--bloom-ink)" }}
          >
            {status}
          </p>
        )}
      </main>

      <BloomBottomNav current="family" />
    </div>
  );
}
