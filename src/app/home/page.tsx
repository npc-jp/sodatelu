"use client";

// ホーム画面: 子どもカード + フェーズ表示 + 直近の記録
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getRecordsByChild, updateChildPhoto, getInvitationsForEmail, type GrowthRecord, type Invitation } from "@/lib/firestore";
import { useChild } from "@/lib/child-context";
import { uploadImage } from "@/lib/storage";
import { Timestamp } from "firebase/firestore";
import { getPhase, PHASES } from "@/lib/phases";
import BottomNav from "@/components/bottom-nav";
import SodateluLogo from "@/components/sodatelu-logo";
import Twemoji from "@/components/twemoji";
import { Users, Settings, Camera } from "lucide-react";

// 生年月日から年齢を計算
function calcAge(birthDate: Timestamp): string {
  const birth = birthDate.toDate();
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  const totalMonths = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));

  if (totalMonths < 1) {
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return `${days}日`;
  }
  if (totalMonths < 12) {
    return `${totalMonths}ヶ月`;
  }
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y}歳${m}ヶ月` : `${y}歳`;
}

// カテゴリの色と絵文字
const CATEGORY_STYLE: { [key: string]: { color: string; dot: string } } = {
  できた: { color: "bg-yellow-400", dot: "✨" },
  おめでとう: { color: "bg-green-500", dot: "🎉" },
  始めた: { color: "bg-orange-400", dot: "🌱" },
  がんばった: { color: "bg-red-500", dot: "💪" },
  感じた: { color: "bg-blue-500", dot: "💭" },
  言った: { color: "bg-purple-500", dot: "💬" },
  行った: { color: "bg-cyan-400", dot: "🚀" },
  やめた: { color: "bg-gray-800", dot: "🔖" },
  "あげた・もらった": { color: "bg-pink-400", dot: "🎁" },
  のりこえた: { color: "bg-amber-700", dot: "🏔️" },
  ありがとう: { color: "bg-yellow-300", dot: "🙏" },
};

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { children: kids, selectedChild: child, selectChild, refreshChildren, loading: childLoading } = useChild();
  const [records, setRecords] = useState<(GrowthRecord & { id: string })[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [invitations, setInvitations] = useState<(Invitation & { id: string })[]>([]);

  useEffect(() => {
    if (authLoading || childLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (kids.length === 0) {
      router.replace("/onboarding");
      return;
    }
  }, [user, authLoading, childLoading, kids, router]);

  // 自分宛ての招待を取得
  useEffect(() => {
    if (!user?.email) return;
    getInvitationsForEmail(user.email).then(setInvitations);
  }, [user]);

  // 選択中の子どもが変わったら記録を再取得
  useEffect(() => {
    if (!child) return;
    setRecordsLoading(true);
    getRecordsByChild(child.id).then((recs) => {
      setRecords(recs);
      setRecordsLoading(false);
    });
  }, [child]);

  if (authLoading || childLoading || !child) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          {/* スプラッシュ用に縦並びロゴ（マーク上・テキスト下） */}
          <div className="flex justify-center">
            <SodateluLogo layout="stacked" height={120} />
          </div>
          <p className="mt-2 text-sm text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  const phase = child ? getPhase(child.birth_date.toDate()) : PHASES[0];

  // カテゴリ別の記録数を集計
  const categoryCounts: { [key: string]: number } = {};
  records.forEach((rec) => {
    categoryCounts[rec.category] = (categoryCounts[rec.category] || 0) + 1;
  });

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-gradient-to-b from-amber-500 to-amber-400 px-5 pb-6 pt-6">
        <div className="flex items-center justify-between">
          {/* ロゴ: マーク + sodatelu テキスト（白版）。amberヘッダーに馴染ませる */}
          <SodateluLogo variant="white" layout="horizontal" height={40} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/family")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15"
              aria-label="ファミリー"
            >
              <Users className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15"
              aria-label="設定"
            >
              <Settings className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* 子ども切り替えタブ（2人以上いる場合、横スクロール） */}
        {kids.length > 1 && (
          <div className="mt-3 -mx-5 overflow-x-auto px-5">
            <div className="flex gap-2 min-w-max">
              {kids.map((kid) => (
                <button
                  key={kid.id}
                  onClick={() => selectChild(kid.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    child?.id === kid.id
                      ? "bg-white text-amber-600 shadow-sm"
                      : "bg-amber-600/30 text-amber-100 hover:bg-amber-600/50"
                  }`}
                >
                  {kid.photo_url ? (
                    <img src={kid.photo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-700">
                      {kid.name.charAt(0)}
                    </span>
                  )}
                  {kid.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 子どもカード */}
        {child && (
          <div className="mt-4 rounded-2xl bg-white/95 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-4">
              {/* プロフィール写真（タップで変更可能） */}
              <label className="cursor-pointer">
                {child.photo_url ? (
                  <div className="relative">
                    <img
                      src={child.photo_url}
                      alt={child.name}
                      className="h-16 w-16 rounded-full object-cover shadow-md"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow">
                      <Camera className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    </div>
                  </div>
                ) : (
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-600">
                    {child.name.charAt(0)}
                    <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow">
                      <Camera className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !child) return;
                    try {
                      const url = await uploadImage(file, `children/${child.id}/${Date.now()}_profile`);
                      await updateChildPhoto(child.id, url);
                      // 画面を更新するためにchildrenを再取得
                      await refreshChildren();
                    } catch {
                      alert("写真のアップロードに失敗しました");
                    }
                  }}
                />
              </label>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800">
                  {child.name}
                </h2>
                <p className="text-sm text-slate-500">
                  {calcAge(child.birth_date)} ・ {child.gender}
                </p>
              </div>
            </div>

            {/* フェーズ表示 */}
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <Twemoji emoji={phase.emoji} size={22} ariaLabel={phase.name} />
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Phase {phase.number}
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {phase.name}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-400">{phase.ageRange}</p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto px-5 pb-24 pt-5">
        {/* 招待通知バナー */}
        {invitations.length > 0 && (
          <button
            onClick={() => router.push("/family")}
            className="mb-5 flex w-full items-center gap-3 rounded-2xl bg-amber-50 p-4 text-left shadow-sm border border-amber-200 hover:bg-amber-100"
          >
            <Twemoji emoji="✉️" size={24} ariaLabel="招待" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">
                ファミリーへの招待が{invitations.length}件あります
              </p>
              <p className="text-xs text-amber-600">
                タップして確認する
              </p>
            </div>
            <span className="text-amber-400">›</span>
          </button>
        )}

        {/* 記録サマリー */}
        {records.length > 0 && (
          <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-600">きろくサマリー</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <span
                  key={cat}
                  className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {CATEGORY_STYLE[cat]?.dot ? (
                    <Twemoji emoji={CATEGORY_STYLE[cat].dot} size={14} />
                  ) : (
                    <span aria-hidden>⚪</span>
                  )}{" "}
                  {cat}
                  <span className="ml-1 font-bold text-amber-600">{count}</span>
                </span>
              ))}
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600">
                合計 {records.length}件
              </span>
            </div>
          </div>
        )}

        {/* 成長のめやす + きょうだい追加 */}
        <div className="mb-3 flex gap-3">
          <button
            onClick={() => router.push("/milestones")}
            className="flex flex-1 items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm hover:bg-slate-50 active:bg-slate-100"
          >
            <Twemoji emoji="🏆" size={28} ariaLabel="成長のめやす" />
            <div>
              <p className="text-sm font-bold text-slate-700">成長のめやす</p>
              <p className="text-xs text-slate-400">{phase.name}</p>
            </div>
          </button>
          <button
            onClick={() => router.push("/add-child")}
            className="flex items-center gap-2 rounded-2xl bg-white p-4 text-left shadow-sm hover:bg-slate-50 active:bg-slate-100"
          >
            <Twemoji emoji="👶" size={28} ariaLabel="きょうだい追加" />
            <div>
              <p className="text-sm font-bold text-slate-700">きょうだい</p>
              <p className="text-xs text-slate-400">追加</p>
            </div>
          </button>
        </div>

        {/* おもいで（普段見られる版） */}
        <button
          onClick={() => router.push("/memory")}
          className="mb-5 flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm hover:bg-slate-50 active:bg-slate-100"
        >
          <Twemoji emoji="📖" size={28} ariaLabel="おもいで" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-700">
              {child?.name ? `${child.name}のこれまで` : "これまでのおもいで"}
            </p>
            <p className="text-xs text-slate-400">
              写真と一緒にゆっくり振り返る
            </p>
          </div>
          <span className="text-slate-300">›</span>
        </button>

        {/* 直近の記録 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-700">最近の記録</h3>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="flex justify-center">
              <Twemoji emoji="🌱" size={48} ariaLabel="" />
            </div>
            <p className="mt-3 text-slate-600 font-medium">
              まだ記録がありません
            </p>
            <p className="mt-1 text-sm text-slate-400">
              お子さまの「できた！」を記録しましょう
            </p>
            <button
              onClick={() => router.push(`/write?childId=${child?.id}`)}
              className="mt-5 rounded-full bg-amber-500 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-amber-600"
            >
              最初の記録をつける
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {records.slice(0, 10).map((rec) => (
              <button
                key={rec.id}
                onClick={() => router.push(`/record?id=${rec.id}`)}
                className="flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100"
              >
                <div className="mt-0.5">
                  {CATEGORY_STYLE[rec.category]?.dot ? (
                    <Twemoji
                      emoji={CATEGORY_STYLE[rec.category].dot}
                      size={20}
                      ariaLabel={rec.category}
                    />
                  ) : (
                    <span aria-hidden>⚪</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{rec.title}</p>
                  {rec.memo && (
                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                      {rec.memo}
                    </p>
                  )}
                  {rec.photo_url && (
                    <img
                      src={rec.photo_url}
                      alt=""
                      className="mt-2 h-20 w-28 rounded-lg object-cover"
                    />
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    {rec.recorded_date.toDate().toLocaleDateString("ja-JP")}
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                      {rec.category}
                    </span>
                    {rec.recorded_by_name && (
                      <span className="ml-2 text-slate-300">
                        by {rec.recorded_by_name}
                      </span>
                    )}
                  </p>
                </div>
                <span className="mt-1 text-slate-300">›</span>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* 記録追加FAB */}
      <button
        onClick={() => router.push(`/write?childId=${child?.id}`)}
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-2xl text-white shadow-lg transition-transform hover:scale-105 hover:bg-amber-600 active:scale-95"
      >
        +
      </button>

      <BottomNav current="home" />
    </div>
  );
}
