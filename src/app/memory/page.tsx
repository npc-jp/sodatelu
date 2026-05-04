"use client";

// 思い出ページ — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom-extra.jsx の BloomMemory
// accent ヘッダー / OpenBook 70px / メモリーカード縦並び / 末尾「これからも」帯
//
// 既存設計鉄則 (docs/product-vision.md ver.2):
//   - 親→子への愛の手紙
//   - 月齢順に写真付き記録のみ表示
//   - 自動生成キャプション・順位・達成度なし
//   - 「ドキッとさせない」

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import { getRecordsByChild, type GrowthRecord } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import BloomAppHeader from "@/components/bloom-app-header";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import { Heart, OpenBook, Sprout, WavyLine } from "@/components/illustrations";

// 記録時点の月齢
function ageAtRecord(birthDate: Timestamp, recordDate: Timestamp): string {
  const birth = birthDate.toDate();
  const record = recordDate.toDate();
  const diffMs = record.getTime() - birth.getTime();
  const totalMonths = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
  if (totalMonths < 0) return "";
  if (totalMonths < 1) {
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return `生後${days}日`;
  }
  if (totalMonths < 12) return `${totalMonths}ヶ月`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y}歳${m}ヶ月` : `${y}歳`;
}

export default function MemoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    selectedChild: child,
    loading: childLoading,
  } = useChild();
  const [records, setRecords] = useState<(GrowthRecord & { id: string })[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // 認証ガード
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!child) return;
    setRecordsLoading(true);
    getRecordsByChild(child.id)
      .then((recs) => {
        // 写真付きの記録だけを月齢順（古い順）に
        const photoOnly = recs
          .filter((r) => !!r.photo_url)
          .sort((a, b) => a.recorded_date.seconds - b.recorded_date.seconds);
        setRecords(photoOnly);
      })
      .finally(() => setRecordsLoading(false));
  }, [child]);

  if (authLoading || childLoading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--bloom-bg)" }}
      >
        <Sprout size={42} color="var(--bloom-primary)" />
      </div>
    );
  }

  if (!child) {
    return (
      <div
        className="flex h-full flex-col"
        style={{ background: "var(--bloom-bg)" }}
      >
        <BloomAppHeader title="おもいで" showBack />
        <main className="flex-1 px-5 pt-8">
          <p className="text-sm" style={{ color: "var(--bloom-ink-soft)" }}>
            お子さまが 登録されていません。
          </p>
        </main>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{ background: "var(--bloom-bg)" }}
    >
      {/* ヘッダー: accent 色 + 白文字 + Heart */}
      <BloomAppHeader
        title={`${child.name}のこれまで`}
        showBack
        bgColor="var(--bloom-accent)"
        textColor="#fff"
        rightSlot={<Heart size={16} color="#fff" />}
      />

      <main className="flex-1 overflow-y-auto px-[18px] pt-5 pb-28">
        {/* ヒーロー */}
        <div className="mb-6 text-center">
          <div className="mb-3 flex justify-center">
            <OpenBook size={70} />
          </div>
          <div
            className="font-hand"
            style={{ fontSize: "1.0625rem", color: "var(--bloom-ink)", lineHeight: 1.7 }}
          >
            おおきくなった
            <br />
            {child.name}へ。
          </div>
          <div className="mt-2 flex justify-center">
            <WavyLine width={120} color="var(--bloom-accent)" stroke={2} />
          </div>
          <div
            className="mt-2.5 text-[0.75rem]"
            style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
          >
            きみが まだ ちいさかった ころの
            <br />
            おもいでを まとめました
          </div>
        </div>

        {/* メモリー */}
        {recordsLoading ? (
          <BloomCard soft className="p-4 text-center">
            <p className="text-[0.8125rem]" style={{ color: "var(--bloom-ink-soft)" }}>
              読み込み中…
            </p>
          </BloomCard>
        ) : records.length === 0 ? (
          <BloomCard soft className="p-6 text-center">
            <Sprout size={36} color="var(--bloom-primary)" />
            <p
              className="font-hand mt-3"
              style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
            >
              写真付きの きろくが まだありません
            </p>
            <p
              className="mt-2 text-[0.75rem]"
              style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.6 }}
            >
              {child.name}の 毎日を 写真と一緒に きろくすると
              <br />
              ここに おもいでが ならんでいきます。
            </p>
          </BloomCard>
        ) : (
          <>
            {records.map((rec) => {
              const age = ageAtRecord(child.birth_date, rec.recorded_date);
              const dateStr = rec.recorded_date.toDate().toLocaleDateString("ja-JP");
              return (
                <div key={rec.id} className="mb-3.5">
                  {/* 月齢 + 日付ラベル */}
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span
                      className="font-hand"
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--bloom-accent)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      ● {age}
                    </span>
                    <span
                      className="text-[0.75rem]"
                      style={{ color: "var(--bloom-ink-soft)" }}
                    >
                      {dateStr}
                    </span>
                  </div>
                  {/* 記録カード */}
                  <BloomCard soft className="cursor-pointer overflow-hidden">
                    <button
                      type="button"
                      onClick={() => router.push(`/record?id=${rec.id}`)}
                      className="block w-full text-left"
                    >
                      {rec.photo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rec.photo_url}
                          alt=""
                          className="h-44 w-full object-cover"
                          style={{ borderBottom: "2px solid var(--bloom-line)" }}
                        />
                      )}
                      <div className="p-3">
                        <div
                          className="font-hand"
                          style={{ fontSize: "0.9375rem", color: "var(--bloom-ink)" }}
                        >
                          {rec.title}
                        </div>
                        {rec.memo && (
                          <p
                            className="mt-1 text-[0.75rem]"
                            style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.5 }}
                          >
                            {rec.memo}
                          </p>
                        )}
                      </div>
                    </button>
                  </BloomCard>
                </div>
              );
            })}

            {/* 末尾の primary-soft 帯（dashed border） */}
            <div
              className="mt-7 rounded-[14px] px-5 py-5 text-center"
              style={{
                background: "var(--bloom-primary-soft)",
                border: "2px dashed var(--bloom-line)",
              }}
            >
              <Sprout size={24} color="var(--bloom-primary)" />
              <div
                className="font-hand mt-2"
                style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)", lineHeight: 1.7 }}
              >
                これからも、ゆっくり
                <br />
                育っていこうね。
              </div>
            </div>
          </>
        )}
      </main>

      <BloomBottomNav current="memory" />
    </div>
  );
}
