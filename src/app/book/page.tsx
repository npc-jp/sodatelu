"use client";

// Book画面: 成長アルバム
// 写真付きの記録をタイムライン形式で表示。子ども切り替え対応
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { getRecordsByChild, type GrowthRecord } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import BottomNav from "@/components/bottom-nav";
import AppHeader from "@/components/app-header";
import Twemoji from "@/components/twemoji";
import { Plus } from "lucide-react";

const CATEGORY_STYLE: { [key: string]: { dot: string } } = {
  できた: { dot: "✨" },
  おめでとう: { dot: "🎉" },
  始めた: { dot: "🌱" },
  がんばった: { dot: "💪" },
  感じた: { dot: "💭" },
  言った: { dot: "💬" },
  行った: { dot: "🚀" },
  やめた: { dot: "🔖" },
  "あげた・もらった": { dot: "🎁" },
  のりこえた: { dot: "🏔️" },
  ありがとう: { dot: "🙏" },
};

// 記録日と生年月日からその時の年齢を計算
function ageAtRecord(birthDate: Timestamp, recordDate: Timestamp): string {
  const birth = birthDate.toDate();
  const record = recordDate.toDate();
  const diffMs = record.getTime() - birth.getTime();
  const totalMonths = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));

  if (totalMonths < 0) return "";
  if (totalMonths < 1) {
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return `${days}日`;
  }
  if (totalMonths < 12) return `${totalMonths}ヶ月`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y}歳${m}ヶ月` : `${y}歳`;
}

// 年月でグルーピング
function groupByMonth(records: (GrowthRecord & { id: string })[]) {
  const groups: { [key: string]: (GrowthRecord & { id: string })[] } = {};
  records.forEach((rec) => {
    const d = rec.recorded_date.toDate();
    const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(rec);
  });
  return groups;
}

export default function BookPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { children: kids, selectedChild: child, selectChild, loading: childLoading } = useChild();
  const [records, setRecords] = useState<(GrowthRecord & { id: string })[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"all" | "photos">("all");

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
        <p className="text-slate-400">読み込み中...</p>
      </div>
    );
  }

  const displayRecords = viewMode === "photos"
    ? records.filter((r) => r.photo_url)
    : records;

  const grouped = groupByMonth(displayRecords);
  const photoCount = records.filter((r) => r.photo_url).length;

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー */}
      <AppHeader
        title="アルバム"
        subtitle={`${child.name}の記録 ・ ${records.length}件 ・ 写真${photoCount}枚`}
        subtitlePosition="below"
        rightSlot={
          <button
            onClick={() => router.push("/add-child")}
            className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm text-white hover:bg-white/30"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            きょうだい
          </button>
        }
      >
        {/* 子ども切り替え（2人以上） */}
        {kids.length > 1 && (
          <div className="mt-3 -mx-5 overflow-x-auto px-5">
            <div className="flex gap-2 min-w-max">
              {kids.map((kid) => (
                <button
                  key={kid.id}
                  onClick={() => selectChild(kid.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    child.id === kid.id
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
      </AppHeader>

      {/* 表示切り替え */}
      <div className="flex border-b border-slate-200 bg-white px-5">
        <button
          onClick={() => setViewMode("all")}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            viewMode === "all"
              ? "border-b-2 border-amber-500 text-amber-600"
              : "text-slate-400"
          }`}
        >
          すべて
        </button>
        <button
          onClick={() => setViewMode("photos")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-center text-sm font-medium transition-colors ${
            viewMode === "photos"
              ? "border-b-2 border-amber-500 text-amber-600"
              : "text-slate-400"
          }`}
        >
          <Twemoji emoji="📷" size={16} ariaLabel="" />
          写真のみ
        </button>
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
        {recordsLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-slate-400">読み込み中...</p>
          </div>
        ) : displayRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex justify-center">
              <Twemoji emoji={viewMode === "photos" ? "📷" : "📖"} size={48} ariaLabel="" />
            </div>
            <p className="mt-4 font-medium text-slate-600">
              {viewMode === "photos"
                ? "写真付きの記録がまだありません"
                : "まだ記録がありません"}
            </p>
            <button
              onClick={() => router.push(`/write?childId=${child.id}`)}
              className="mt-4 rounded-full bg-amber-500 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              記録をつける
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([month, recs]) => (
            <div key={month} className="mb-6">
              <div className="mb-3 flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-sm font-bold text-slate-500">{month}</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="space-y-4">
                {recs.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => router.push(`/record?id=${rec.id}`)}
                    className="w-full text-left"
                  >
                    <div className="overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
                      {rec.photo_url && (
                        <img
                          src={rec.photo_url}
                          alt=""
                          className="h-48 w-full object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex items-start gap-2">
                          {CATEGORY_STYLE[rec.category]?.dot ? (
                            <Twemoji
                              emoji={CATEGORY_STYLE[rec.category].dot}
                              size={18}
                              ariaLabel={rec.category}
                            />
                          ) : (
                            <span className="text-base" aria-hidden>⚪</span>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{rec.title}</p>
                            {rec.memo && (
                              <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                                {rec.memo}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-xs text-slate-400">
                            {rec.recorded_date.toDate().toLocaleDateString("ja-JP")}
                          </p>
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                            {ageAtRecord(child.birth_date, rec.recorded_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      <BottomNav current="book" />
    </div>
  );
}
