"use client";

// ファミリー設定画面: メンバー一覧 + 招待 + 招待の確認
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
import { Settings, Lock } from "lucide-react";
import AppHeader from "@/components/app-header";
import Twemoji from "@/components/twemoji";

export default function FamilyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPremium } = usePlan();
  const { refreshChildren } = useChild();

  const [familyId, setFamilyId] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [members, setMembers] = useState<(AppUser & { id: string })[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<(Invitation & { id: string })[]>([]);
  const [myInvitations, setMyInvitations] = useState<(Invitation & { id: string })[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      // ユーザーのfamily_idを取得
      const userSnap = await getDoc(doc(db, "users", user!.uid));
      if (!userSnap.exists()) return;
      const userData = userSnap.data();
      // family_id は DocumentReference<Family> として扱う
      const familyRef = userData.family_id as DocumentReference<Family> | null;

      if (familyRef) {
        setFamilyId(familyRef.id);
        // ファミリー名を取得（getDoc にジェネリクス付きの DocumentReference を渡すと
        // snap.data() が Family 型として推論される）
        const familySnap = await getDoc(familyRef);
        if (familySnap.exists()) {
          const familyData = familySnap.data();
          setFamilyName(familyData.family_name);
        }
        // メンバー一覧
        const m = await getFamilyMembers(familyRef.id);
        setMembers(m);
        // 保留中の招待
        const inv = await getPendingInvitations(familyRef.id);
        setPendingInvitations(inv);
      }

      // 自分宛ての招待
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

    // 無料版は1人まで（自分含めて2人）
    if (!isPremium && members.length >= 2) {
      setStatus("無料プランでは1人まで招待できます。プレミアムにアップグレードしてください");
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
      setStatus(`${inviteEmail} に招待を送りました`);
      setInviteEmail("");
      // 保留リストを更新
      const inv = await getPendingInvitations(familyId);
      setPendingInvitations(inv);
    } catch {
      setStatus("招待の送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  async function handleAccept(invitationId: string) {
    if (!user) return;
    try {
      await acceptInvitation(invitationId, user.uid);
      // 子ども一覧を再取得（新しいファミリーの子どもが見えるようになる）
      await refreshChildren();
      // 画面を更新
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
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー: タイトル下にファミリー名。絵文字はtwemoji統一タスクで別途対応するため一旦外す */}
      <AppHeader
        title="ファミリー"
        subtitle={familyName}
        subtitlePosition="below"
        showBack
        onBack={() => router.back()}
        rightSlot={
          <button
            onClick={() => router.push("/settings")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15"
            aria-label="設定"
          >
            <Settings className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
        {/* 自分宛ての招待（あれば最上部に表示） */}
        {myInvitations.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-3 text-sm font-bold text-slate-600">あなた宛ての招待</h3>
            {myInvitations.map((inv) => (
              <div key={inv.id} className="mb-2 rounded-2xl bg-amber-50 p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-800">
                  {inv.invited_by_name} さんからファミリーへの招待
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAccept(inv.id)}
                    className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    参加する
                  </button>
                  <button
                    onClick={() => handleDecline(inv.id)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    辞退する
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* メンバー一覧 */}
        <div className="mb-5">
          <h3 className="mb-3 text-sm font-bold text-slate-600">メンバー</h3>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                {member.photo_url ? (
                  <img src={member.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-600">
                    {(member.display_name || member.email || "?").charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {member.display_name || member.email}
                  </p>
                  <p className="text-xs text-slate-400">{member.email}</p>
                </div>
                {member.uid === user?.uid && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600">
                    あなた
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 保留中の招待 */}
        {pendingInvitations.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-3 text-sm font-bold text-slate-600">招待中</h3>
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="mb-2 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <Twemoji emoji="✉️" size={20} ariaLabel="" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{inv.invited_email}</p>
                  <p className="text-xs text-slate-400">承認待ち</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 招待フォーム */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="mb-1 font-bold text-slate-700">メンバーを招待</h3>
          <p className="mb-4 text-xs text-slate-400">
            メールアドレスで招待します。相手がsodateluにログインすると承認できます
          </p>
          <form onSubmit={handleInvite} className="space-y-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="招待するメールアドレス"
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {sending ? "送信中..." : "招待を送る"}
            </button>
          </form>
          {!isPremium && members.length >= 2 && (
            <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-slate-400">
              <Lock className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
              無料プランでは1人まで招待できます
            </p>
          )}
        </div>

        {status && (
          <p className="mt-4 text-center text-sm text-slate-600">{status}</p>
        )}
      </main>
    </div>
  );
}
