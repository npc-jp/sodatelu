"use client";

// 成長のめやす一覧ページ — Bloom デザイン適用
// 参照: design_handoff_bloom/dir-bloom.jsx の BloomMilestones
// Sprout + 成長のめやす / 4フェーズタブ / 現フェーズカード（緑） / めやす項目リスト
//
// 設計鉄則: 達成率・%表示は使わない（ドキッとさせない）
// 「これから来るもの／きろくできるもの」として中立に見せる
//
// === 2026-05-14: 成長機能 Phase 1〜3 完了 ===
// Phase 1: 「めやす / すくすく」サブタブ + フィルタチップ + 身長体重CRUD
// Phase 2: すくすくタブ内に成長曲線グラフ（GrowthChart）を組み込み済み
// Phase 3: 予防接種13種マスタ + めやすタブ内マージ表示 + 接種チェックトラッキング
// 仕様書: docs/growth-feature-spec-v1-2026-05-14.md A-1, A-2, A-4 参照

import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Timestamp } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { useChild } from "@/lib/child-context";
import {
  getRecordsByChild,
  getMeasurementsByChild,
  deleteMeasurement,
  getVaccinationsByChild,
  deleteVaccination,
  type GrowthRecord,
  type Measurement,
  type VaccinationRecord,
} from "@/lib/firestore";
import { MILESTONES } from "@/lib/milestones-data";
import { getPhase, PHASES } from "@/lib/phases";
import {
  buildTimeline,
  formatMonthsLabel,
  getVaccinationStatus,
  type TimelineItem,
  type VaccineSchedule,
  type VaccinationStatus,
} from "@/lib/timeline";
import BloomBottomNav from "@/components/bloom-bottom-nav";
import BloomCard from "@/components/bloom-card";
import ConfirmModal from "@/components/confirm-modal";
import MeasurementForm from "@/components/measurement-form";
import VaccinationForm from "@/components/vaccination-form";
import GrowthChart from "@/components/growth-chart";
import { PottedPlant, Sprout } from "@/components/illustrations";

// 成長曲線で扱う性別の型（Child.gender と同じ）
type ChildGender = "男の子" | "女の子" | "じぶんらしく";
// 成長曲線のメトリック切替（身長 / 体重）
type GrowthMetric = "height" | "weight";

// サブタブの種類
// - milestones: 既存の成長のめやす表示
// - growth: すくすく（身長体重・成長曲線）
type SubTab = "milestones" | "growth";

// めやすサブタブ内のフィルタチップ
// - all: 成長の目安 + 予防接種を月齢順に混在
// - milestone: 成長の目安のみ
// - vaccination: 予防接種のみ（Phase 3 で実データ表示）
type MilestoneFilter = "all" | "milestone" | "vaccination";

// フェーズ番号 → アクティブ時の背景色
// 以前は 1, 3 が *-soft（薄色）だったが、白文字が読めなくなるため濃色に統一
const PHASE_COLORS: { [key: number]: string } = {
  1: "var(--bloom-primary)",
  2: "var(--bloom-accent)",
  3: "var(--bloom-pink)",
  4: "var(--bloom-yellow)",
};

function MilestonesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  // ChildContext の selectedChild に追従。home で選んだ子のめやすが見える
  const { selectedChild, loading: childLoading } = useChild();
  const [currentPhase, setCurrentPhase] = useState(1);
  const [achievedIds, setAchievedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  // 予防接種マスタ（/public/data から fetch）
  const [vaccineSchedule, setVaccineSchedule] =
    useState<VaccineSchedule | null>(null);
  // 子供の接種記録（Firestore）
  const [vaccinationRecords, setVaccinationRecords] = useState<
    (VaccinationRecord & { id: string })[]
  >([]);
  const childName = selectedChild?.name ?? "";

  // サブタブ状態（URLクエリ ?tab=milestones|growth）
  const tabParam = searchParams.get("tab");
  const subTab: SubTab = tabParam === "growth" ? "growth" : "milestones";

  // フィルタチップ状態（コンポーネント内 state で管理）
  // 状態を URL に同期しないのは、フィルタは一時的な UI 操作で
  // ブックマーク・共有の対象にしない判断（仕様書 A-2 のチップ仕様）
  const [milestoneFilter, setMilestoneFilter] =
    useState<MilestoneFilter>("all");

  // 予防接種フォームのモーダル制御
  const [vaccinationFormState, setVaccinationFormState] = useState<{
    open: boolean;
    vaccineId: string;
    doseNumber: number;
    vaccineLabel: string;
    initial: (VaccinationRecord & { id: string }) | null;
  } | null>(null);

  // 接種チェック解除（未完了に戻す）確認モーダル
  const [uncheckTarget, setUncheckTarget] =
    useState<(VaccinationRecord & { id: string }) | null>(null);
  const [unchecking, setUnchecking] = useState(false);

  // 子供の現在月齢（誕生日から計算。年月日が無ければ0）
  const currentAgeMonths = useMemo(() => {
    if (!selectedChild?.birth_date) return 0;
    const birth = selectedChild.birth_date.toDate();
    const now = new Date();
    let months =
      (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) months -= 1;
    return Math.max(0, months);
  }, [selectedChild]);

  // 予防接種マスタ JSON を初回読込み（成功すれば再fetchしない）
  useEffect(() => {
    if (vaccineSchedule) return;
    let cancelled = false;
    fetch("/data/vaccination-schedule.json", { cache: "force-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: VaccineSchedule) => {
        if (!cancelled) setVaccineSchedule(json);
      })
      .catch((err) => {
        console.error("[milestones] vaccination-schedule.json 取得失敗:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [vaccineSchedule]);

  // 子供の接種記録を取得
  const fetchVaccinationRecords = useCallback(async () => {
    if (!selectedChild?.id) {
      setVaccinationRecords([]);
      return;
    }
    try {
      const recs = await getVaccinationsByChild(selectedChild.id);
      setVaccinationRecords(recs);
    } catch (err) {
      console.error("[milestones] 予防接種記録取得失敗:", err);
      setVaccinationRecords([]);
    }
  }, [selectedChild?.id]);

  useEffect(() => {
    fetchVaccinationRecords();
  }, [fetchVaccinationRecords]);

  // (vaccineId, doseNumber) → VaccinationRecord の Map
  const vaccinationMap = useMemo(() => {
    const map = new Map<string, VaccinationRecord & { id: string }>();
    vaccinationRecords.forEach((r) => {
      map.set(`${r.vaccine_id}__${r.dose_number}`, r);
    });
    return map;
  }, [vaccinationRecords]);

  // タイムライン構築（フィルタ別に使う元データ）
  // - 「全て」: 全 phase の milestones + vaccinations をマージ
  // - 「予防接種」: vaccinations のみ
  // - 「成長の目安」: 既存のフェーズタブ表示にフォールバック（このタイムラインは未使用）
  const timeline = useMemo<TimelineItem[]>(() => {
    if (!vaccineSchedule) return [];
    return buildTimeline({
      milestones: MILESTONES,
      schedule: vaccineSchedule,
    });
  }, [vaccineSchedule]);

  // フィルタ適用後のタイムライン
  const filteredTimeline = useMemo<TimelineItem[]>(() => {
    if (milestoneFilter === "milestone") {
      // 「成長の目安」のみのケース。既存フェーズタブ表示で使うので不要だが
      // 念のため type=milestone のみのリストも作っておく
      return timeline.filter((t) => t.type === "milestone");
    }
    if (milestoneFilter === "vaccination") {
      return timeline.filter((t) => t.type === "vaccination");
    }
    return timeline;
  }, [milestoneFilter, timeline]);

  // 接種チェック解除（confirm-modal 確定時）
  async function handleUncheckConfirm() {
    if (!uncheckTarget) return;
    setUnchecking(true);
    try {
      await deleteVaccination(uncheckTarget.id);
      setUncheckTarget(null);
      await fetchVaccinationRecords();
    } catch (err) {
      console.error("[milestones] 接種チェック解除失敗:", err);
      alert("解除に失敗しました");
    } finally {
      setUnchecking(false);
    }
  }

  // サブタブ切替: URLクエリを書き換える
  function changeSubTab(next: SubTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "growth") {
      params.set("tab", "growth");
    } else {
      // デフォルトの milestones は ?tab= を削除してURLをきれいに保つ
      params.delete("tab");
    }
    const qs = params.toString();
    router.replace(qs ? `/milestones?${qs}` : `/milestones`);
  }

  useEffect(() => {
    if (authLoading || childLoading || !user) return;
    if (!selectedChild) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      if (!selectedChild) return;
      const phase = getPhase(selectedChild.birth_date.toDate());
      setCurrentPhase(phase.number);

      // 記録済みマイルストーンを取得（記録に milestone_id があるもの）
      const records = await getRecordsByChild(selectedChild.id);
      const achieved = new Set<string>();
      records.forEach((rec: GrowthRecord & { id: string }) => {
        if (rec.milestone_id) {
          achieved.add(rec.milestone_id.id);
        }
      });
      setAchievedIds(achieved);
      setLoading(false);
    }

    fetchData();
  }, [user, authLoading, childLoading, selectedChild]);

  // 選択中フェーズのマイルストーン
  const filteredMilestones = MILESTONES.filter((m) => m.phase === currentPhase);
  const phaseInfo = PHASES[currentPhase - 1];
  const recordedCount = filteredMilestones.filter((m) => achievedIds.has(m.id)).length;
  const remaining = filteredMilestones.length - recordedCount;
  // プログレスバーの幅（最大40%程度に抑えてプレッシャーにならないように）
  const progressPct = filteredMilestones.length > 0
    ? Math.min(100, Math.round((recordedCount / filteredMilestones.length) * 100))
    : 0;

  if (authLoading || loading) {
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
      className="flex h-full flex-col pb-24"
      style={{ background: "var(--bloom-bg)" }}
    >
      {/* ヘッダー */}
      <header
        className="px-[18px] pt-3.5 pb-3"
        style={{ borderBottom: "2px solid var(--bloom-line)" }}
      >
        <div className="flex items-center gap-2">
          <Sprout size={20} color="var(--bloom-primary)" />
          <h1
            className="font-hand"
            style={{ fontSize: "1.375rem", color: "var(--bloom-ink)" }}
          >
            成長のめやす
          </h1>
        </div>
        <p
          className="mt-0.5 text-[0.75rem]"
          style={{ color: "var(--bloom-ink-soft)", marginLeft: 28 }}
        >
          {childName ? `${childName}のこれから・きろく` : "これから・きろく"}
        </p>
      </header>

      {/* サブタブ（めやす / すくすく） */}
      {/* 既存フェーズタブの上に配置（仕様書 A-1 配置指示）*/}
      <div
        className="flex gap-2 px-3.5 py-2.5"
        style={{ borderBottom: "2px solid var(--bloom-line)" }}
      >
        <SubTabButton
          active={subTab === "milestones"}
          label="めやす ✦"
          onClick={() => changeSubTab("milestones")}
        />
        <SubTabButton
          active={subTab === "growth"}
          label="すくすく 🌱"
          onClick={() => changeSubTab("growth")}
        />
      </div>

      {/* 「めやす」サブタブ */}
      {subTab === "milestones" && (
        <>
          {/* フィルタチップ（全て / 成長の目安 / 予防接種）*/}
          <div
            className="flex gap-1.5 overflow-x-auto px-3.5 py-2"
            style={{ borderBottom: "2px solid var(--bloom-line-soft)" }}
          >
            <FilterChip
              active={milestoneFilter === "all"}
              label="全て"
              onClick={() => setMilestoneFilter("all")}
            />
            <FilterChip
              active={milestoneFilter === "milestone"}
              label="成長の目安"
              onClick={() => setMilestoneFilter("milestone")}
            />
            <FilterChip
              active={milestoneFilter === "vaccination"}
              label="予防接種"
              onClick={() => setMilestoneFilter("vaccination")}
            />
          </div>

          {/* フェーズタブ（横スクロール）— 「成長の目安」フィルタ時のみ表示
              「全て」「予防接種」では月齢順タイムラインを使うのでフェーズ概念を使わない */}
          {milestoneFilter === "milestone" && (
            <div
              className="flex gap-1.5 overflow-x-auto px-3.5 py-2.5"
              style={{ borderBottom: "2px solid var(--bloom-line)" }}
            >
              {PHASES.map((phase) => {
                const active = currentPhase === phase.number;
                const tabColor = PHASE_COLORS[phase.number] ?? "#fff";
                return (
                  <button
                    key={phase.number}
                    type="button"
                    onClick={() => setCurrentPhase(phase.number)}
                    className="bloom-border font-hand whitespace-nowrap rounded-xl px-3.5 py-1.5"
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      background: active ? tabColor : "#fff",
                      color: active
                        ? tabColor === "var(--bloom-yellow)"
                          ? "var(--bloom-ink)"
                          : "#fff"
                        : "var(--bloom-ink)",
                      boxShadow: active ? "2px 2px 0 var(--bloom-line)" : "none",
                    }}
                  >
                    {phase.ageRange}
                  </button>
                );
              })}
            </div>
          )}

          <main className="flex-1 overflow-y-auto px-4 pb-10 pt-3.5">
            {/* 「予防接種」 or 「全て」フィルタ時: 月齢順タイムライン表示 */}
            {milestoneFilter !== "milestone" ? (
              <TimelineView
                items={filteredTimeline}
                vaccineSchedule={vaccineSchedule}
                vaccinationMap={vaccinationMap}
                currentAgeMonths={currentAgeMonths}
                achievedIds={achievedIds}
                onClickMilestone={(id) => router.push(`/milestones/${id}`)}
                onOpenVaccinationForm={(args) =>
                  setVaccinationFormState({ ...args, open: true })
                }
                onRequestUncheck={(rec) => setUncheckTarget(rec)}
              />
            ) : (
              <>
                {/* 趣旨説明 */}
                <p
                  className="font-hand mb-4 text-center"
                  style={{ fontSize: "0.8125rem", color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
                >
                  時期はあくまで目安。
                  <br />
                  うちの子のペースで、ゆっくり育ちます。
                </p>

                {/* 現フェーズカード */}
                {phaseInfo && (
                  <BloomCard
                    color="var(--bloom-primary)"
                    className="relative overflow-hidden p-4"
                  >
                    <div
                      className="absolute pointer-events-none"
                      style={{ right: -10, top: -10, opacity: 0.2 }}
                    >
                      <PottedPlant size={80} />
                    </div>
                    <div className="relative text-white">
                      <div className="font-hand" style={{ fontSize: "1.125rem" }}>
                        {phaseInfo.name}
                      </div>
                      <div className="text-[0.75rem] mt-0.5 opacity-90">
                        {phaseInfo.ageRange}
                      </div>
                      <div
                        className="bloom-border font-hand mt-3 inline-block rounded-[10px] px-2.5 py-1"
                        style={{
                          background: "#fff",
                          color: "var(--bloom-ink)",
                          fontSize: "0.75rem",
                        }}
                      >
                        {recordedCount}件 きろく ・ あと{remaining}件
                      </div>
                      <div
                        className="mt-2.5 overflow-hidden rounded"
                        style={{ height: 5, background: "rgba(255,255,255,0.3)" }}
                      >
                        <div
                          style={{
                            width: `${progressPct}%`,
                            height: "100%",
                            background: "var(--bloom-yellow)",
                            transition: "width 0.4s",
                          }}
                        />
                      </div>
                    </div>
                  </BloomCard>
                )}

                {/* めやす項目リスト */}
                <div className="mt-3 space-y-2.5">
                  {filteredMilestones.map((ms) => {
                    const isRecorded = achievedIds.has(ms.id);
                    return (
                      <BloomCard
                        key={ms.id}
                        soft
                        color={isRecorded ? "var(--bloom-primary-soft)" : "#fff"}
                        className="cursor-pointer"
                      >
                        <button
                          type="button"
                          onClick={() => router.push(`/milestones/${ms.id}`)}
                          className="block w-full p-3 text-left"
                        >
                          <div className="flex items-start gap-2.5">
                            {/* 状態アイコン */}
                            <div className="shrink-0" style={{ marginTop: 2 }}>
                              {isRecorded ? (
                                <div
                                  className="bloom-border font-hand flex items-center justify-center rounded-full"
                                  style={{
                                    width: 26,
                                    height: 26,
                                    background: "var(--bloom-primary)",
                                    color: "#fff",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  ✓
                                </div>
                              ) : (
                                <div
                                  className="rounded-full"
                                  style={{
                                    width: 26,
                                    height: 26,
                                    border: "2px dashed var(--bloom-line)",
                                    background: "#fff",
                                  }}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className="font-hand"
                                style={{ fontSize: "0.9375rem", color: "var(--bloom-ink)" }}
                              >
                                {ms.title}
                              </div>
                              {ms.description && (
                                <div
                                  className="mt-1 text-[0.75rem]"
                                  style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.5 }}
                                >
                                  {ms.description}
                                </div>
                              )}
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <span
                                  className="font-hand inline-block rounded-lg px-2 py-0.5"
                                  style={{
                                    background: "var(--bloom-yellow)",
                                    color: "var(--bloom-ink)",
                                    fontSize: "0.75rem",
                                    border: "1.5px solid var(--bloom-line)",
                                  }}
                                >
                                  {ms.category}
                                </span>
                                <span
                                  className="inline-block rounded-lg px-2 py-0.5"
                                  style={{
                                    background: "#fff",
                                    color: "var(--bloom-ink-soft)",
                                    fontSize: "0.75rem",
                                    border: "1.5px solid var(--bloom-line-soft)",
                                  }}
                                >
                                  {ms.age_hint}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      </BloomCard>
                    );
                  })}
                </div>
              </>
            )}
          </main>
        </>
      )}

      {/* 「すくすく」サブタブ: 身長・体重の記録 + 成長曲線グラフ
          Phase 2 (2026-05-14) で GrowthChart 組み込み完了 */}
      {subTab === "growth" && (
        <main className="flex-1 overflow-y-auto px-4 pb-10 pt-4">
          <GrowthTab
            childId={selectedChild?.id ?? ""}
            childName={childName}
            childGender={selectedChild?.gender ?? "じぶんらしく"}
            childBirthDate={selectedChild?.birth_date ?? null}
            familyId={selectedChild?.family_id?.id ?? ""}
            createdByUid={user?.uid ?? ""}
          />
        </main>
      )}

      {/* 予防接種の接種日入力モーダル */}
      {vaccinationFormState && selectedChild && (
        <VaccinationForm
          open={vaccinationFormState.open}
          childId={selectedChild.id}
          familyId={selectedChild.family_id?.id ?? ""}
          createdByUid={user?.uid ?? ""}
          vaccineId={vaccinationFormState.vaccineId}
          doseNumber={vaccinationFormState.doseNumber}
          vaccineLabel={vaccinationFormState.vaccineLabel}
          initial={vaccinationFormState.initial}
          onClose={() => setVaccinationFormState(null)}
          onSuccess={fetchVaccinationRecords}
        />
      )}

      {/* 接種チェック解除（未完了に戻す）確認モーダル */}
      <ConfirmModal
        open={!!uncheckTarget}
        title="接種きろくを取り消しますか？"
        description="完了マークを外して、未接種の状態に戻します。"
        confirmLabel="取り消す"
        cancelLabel="キャンセル"
        destructive
        loading={unchecking}
        onConfirm={handleUncheckConfirm}
        onCancel={() => {
          if (!unchecking) setUncheckTarget(null);
        }}
      />

      <BloomBottomNav current="milestones" />
    </div>
  );
}

// === サブタブボタン ===
// 仕様書 A-1 のスタイル指定（SUBTAB_ACTIVE / SUBTAB_INACTIVE）に準拠
function SubTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-hand flex-1 rounded-xl py-2"
      style={{
        fontSize: "0.9375rem",
        fontWeight: 700,
        background: active ? "var(--bloom-primary)" : "#fff",
        color: active ? "#fff" : "var(--bloom-ink)",
        border: active
          ? "2px solid var(--bloom-line)"
          : "2px solid var(--bloom-line-soft)",
        boxShadow: active ? "2px 2px 0 var(--bloom-line)" : "none",
      }}
    >
      {label}
    </button>
  );
}

// === フィルタチップ ===
// 仕様書 A-2 のチップスタイル指定（var(--bloom-accent) 背景）に準拠
function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-hand whitespace-nowrap rounded-full px-3.5 py-1"
      style={{
        fontSize: "0.8125rem",
        fontWeight: 600,
        background: active ? "var(--bloom-accent)" : "#fff",
        color: active ? "#fff" : "var(--bloom-ink-soft)",
        border: active
          ? "1.5px solid var(--bloom-line)"
          : "1.5px solid var(--bloom-line-soft)",
      }}
    >
      {label}
    </button>
  );
}

// === グラフのメトリック切替タブ（身長 / 体重）===
// すくすくタブ内のグラフ上部に配置
function MetricTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-hand flex-1 rounded-[10px] py-1.5"
      style={{
        fontSize: "0.8125rem",
        fontWeight: 700,
        background: active ? "var(--bloom-accent)" : "#fff",
        color: active ? "#fff" : "var(--bloom-ink-soft)",
        border: active
          ? "1.5px solid var(--bloom-line)"
          : "1.5px solid var(--bloom-line-soft)",
        boxShadow: active ? "1.5px 1.5px 0 var(--bloom-line)" : "none",
      }}
    >
      {label}
    </button>
  );
}

// === タイムライン表示（成長の目安 + 予防接種を月齢順マージ）===
// 仕様書 A-2 に準拠。フィルタチップ「全て」「予防接種」時に表示
function TimelineView({
  items,
  vaccineSchedule,
  vaccinationMap,
  currentAgeMonths,
  achievedIds,
  onClickMilestone,
  onOpenVaccinationForm,
  onRequestUncheck,
}: {
  items: TimelineItem[];
  vaccineSchedule: VaccineSchedule | null;
  vaccinationMap: Map<string, VaccinationRecord & { id: string }>;
  currentAgeMonths: number;
  achievedIds: Set<string>;
  onClickMilestone: (milestoneId: string) => void;
  onOpenVaccinationForm: (args: {
    vaccineId: string;
    doseNumber: number;
    vaccineLabel: string;
    initial: (VaccinationRecord & { id: string }) | null;
  }) => void;
  onRequestUncheck: (rec: VaccinationRecord & { id: string }) => void;
}) {
  // 予防接種マスタの読み込み中
  if (!vaccineSchedule) {
    return (
      <div className="flex justify-center py-6">
        <Sprout size={32} color="var(--bloom-primary)" />
      </div>
    );
  }

  // データが空のときの案内
  if (items.length === 0) {
    return (
      <BloomCard className="p-6 text-center">
        <p
          className="font-hand"
          style={{ fontSize: "0.9375rem", color: "var(--bloom-ink-soft)" }}
        >
          表示できる項目がありません。
        </p>
      </BloomCard>
    );
  }

  return (
    <>
      {/* 趣旨説明 */}
      <p
        className="font-hand mb-4 text-center"
        style={{
          fontSize: "0.8125rem",
          color: "var(--bloom-ink-soft)",
          lineHeight: 1.7,
        }}
      >
        月齢の順番で表示しています。
        <br />
        うちの子のペースで、ゆっくり進めます。
      </p>

      <div className="space-y-2.5">
        {items.map((item) => {
          if (item.type === "milestone") {
            const ms = item.data;
            const isRecorded = achievedIds.has(ms.id);
            return (
              <BloomCard
                key={`m-${ms.id}`}
                soft
                color={isRecorded ? "var(--bloom-primary-soft)" : "#fff"}
                className="cursor-pointer"
              >
                <button
                  type="button"
                  onClick={() => onClickMilestone(ms.id)}
                  className="block w-full p-3 text-left"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="shrink-0" style={{ marginTop: 2 }}>
                      {isRecorded ? (
                        <div
                          className="bloom-border font-hand flex items-center justify-center rounded-full"
                          style={{
                            width: 26,
                            height: 26,
                            background: "var(--bloom-primary)",
                            color: "#fff",
                            fontSize: "0.875rem",
                          }}
                        >
                          ✓
                        </div>
                      ) : (
                        <div
                          className="rounded-full"
                          style={{
                            width: 26,
                            height: 26,
                            border: "2px dashed var(--bloom-line)",
                            background: "#fff",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-hand"
                        style={{
                          fontSize: "0.9375rem",
                          color: "var(--bloom-ink)",
                        }}
                      >
                        {ms.title}
                      </div>
                      {ms.description && (
                        <div
                          className="mt-1 text-[0.75rem]"
                          style={{
                            color: "var(--bloom-ink-soft)",
                            lineHeight: 1.5,
                          }}
                        >
                          {ms.description}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className="font-hand inline-block rounded-lg px-2 py-0.5"
                          style={{
                            background: "var(--bloom-yellow)",
                            color: "var(--bloom-ink)",
                            fontSize: "0.75rem",
                            border: "1.5px solid var(--bloom-line)",
                          }}
                        >
                          {ms.category}
                        </span>
                        <span
                          className="inline-block rounded-lg px-2 py-0.5"
                          style={{
                            background: "#fff",
                            color: "var(--bloom-ink-soft)",
                            fontSize: "0.75rem",
                            border: "1.5px solid var(--bloom-line-soft)",
                          }}
                        >
                          {ms.age_hint}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </BloomCard>
            );
          }
          // type === "vaccination"
          const key = `${item.vaccineId}__${item.doseNumber}`;
          const record = vaccinationMap.get(key) ?? null;
          const isCompleted = record?.is_completed === true;
          const status = getVaccinationStatus({
            currentAgeMonths,
            standardAgeMonthsFrom: item.dose.standardAgeMonthsFrom,
            standardAgeMonthsTo: item.dose.standardAgeMonthsTo,
            isCompleted,
          });
          return (
            <VaccinationRow
              key={`v-${key}`}
              vaccineLabel={`${item.vaccine.name} ${item.doseNumber}回目`}
              ageLabel={formatMonthsLabel(item.dose.standardAgeMonthsFrom)}
              note={item.dose.note}
              status={status}
              record={record}
              vaccinatedDate={record?.vaccinated_date ?? null}
              onAdd={() =>
                onOpenVaccinationForm({
                  vaccineId: item.vaccineId,
                  doseNumber: item.doseNumber,
                  vaccineLabel: `${item.vaccine.name} ${item.doseNumber}回目`,
                  initial: null,
                })
              }
              onEdit={() => {
                if (!record) return;
                onOpenVaccinationForm({
                  vaccineId: item.vaccineId,
                  doseNumber: item.doseNumber,
                  vaccineLabel: `${item.vaccine.name} ${item.doseNumber}回目`,
                  initial: record,
                });
              }}
              onUncheck={() => {
                if (record) onRequestUncheck(record);
              }}
            />
          );
        })}
      </div>

      {/* 出典・注記 */}
      <p
        className="mt-6 text-center text-[0.6875rem]"
        style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
      >
        予防接種スケジュールは厚生労働省・日本小児科学会の公開情報をもとに作成しています。
        <br />
        実際の接種計画はかかりつけ医にご相談ください。
      </p>
    </>
  );
}

// === 予防接種の1行表示 ===
// 仕様書 A-2 のステータス3区分 + 完了 + 標準範囲内 のスタイリングを表現
function VaccinationRow({
  vaccineLabel,
  ageLabel,
  note,
  status,
  record,
  vaccinatedDate,
  onAdd,
  onEdit,
  onUncheck,
}: {
  vaccineLabel: string;
  ageLabel: string;
  note: string;
  status: VaccinationStatus;
  record: (VaccinationRecord & { id: string }) | null;
  vaccinatedDate: Timestamp | null;
  onAdd: () => void;
  onEdit: () => void;
  onUncheck: () => void;
}) {
  // ステータス別の背景色とバッジ
  let bg = "#fff";
  let badge: { text: string; bg: string; color: string } | null = null;
  if (status === "completed") {
    bg = "var(--bloom-primary-soft)";
  } else if (status === "next") {
    bg = "#fff";
    badge = {
      text: "もうすぐ",
      bg: "var(--bloom-accent)",
      color: "#fff",
    };
  } else if (status === "current") {
    bg = "#fff";
    badge = {
      text: "いま頃",
      bg: "var(--bloom-yellow)",
      color: "var(--bloom-ink)",
    };
  } else if (status === "overdue") {
    bg = "#fff";
    badge = {
      text: "早めに確認を",
      bg: "#fff",
      color: "var(--bloom-ink-soft)",
    };
  }

  return (
    <BloomCard soft color={bg}>
      <div className="flex items-start gap-2.5 p-3">
        {/* 状態アイコン（チェック or 注射） */}
        <div className="shrink-0" style={{ marginTop: 2 }}>
          {status === "completed" ? (
            <div
              className="bloom-border font-hand flex items-center justify-center rounded-full"
              style={{
                width: 26,
                height: 26,
                background: "var(--bloom-primary)",
                color: "#fff",
                fontSize: "0.875rem",
              }}
            >
              ✓
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 26,
                height: 26,
                border: "2px dashed var(--bloom-line)",
                background: "#fff",
                fontSize: "0.875rem",
              }}
              aria-hidden
            >
              💉
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <div
              className="font-hand"
              style={{
                fontSize: "0.9375rem",
                color: "var(--bloom-ink)",
              }}
            >
              {vaccineLabel}
            </div>
            {badge && (
              <span
                className="font-hand inline-block rounded-full px-2 py-0.5"
                style={{
                  background: badge.bg,
                  color: badge.color,
                  fontSize: "0.6875rem",
                  border: "1.5px solid var(--bloom-line-soft)",
                }}
              >
                {badge.text}
              </span>
            )}
          </div>
          <div
            className="mt-1 text-[0.75rem]"
            style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.5 }}
          >
            {note}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-block rounded-lg px-2 py-0.5"
              style={{
                background: "#fff",
                color: "var(--bloom-ink-soft)",
                fontSize: "0.75rem",
                border: "1.5px solid var(--bloom-line-soft)",
              }}
            >
              {ageLabel}
            </span>
            {status === "completed" && vaccinatedDate && (
              <span
                className="font-hand inline-block rounded-lg px-2 py-0.5"
                style={{
                  background: "var(--bloom-primary-soft)",
                  color: "var(--bloom-ink)",
                  fontSize: "0.75rem",
                  border: "1.5px solid var(--bloom-line-soft)",
                }}
              >
                接種日: {vaccinatedDate.toDate().toLocaleDateString("ja-JP")}
              </span>
            )}
            {status === "completed" && !vaccinatedDate && record && (
              <span
                className="font-hand inline-block rounded-lg px-2 py-0.5"
                style={{
                  background: "var(--bloom-primary-soft)",
                  color: "var(--bloom-ink)",
                  fontSize: "0.75rem",
                  border: "1.5px solid var(--bloom-line-soft)",
                }}
              >
                完了（日付未入力）
              </span>
            )}
          </div>
          {status === "overdue" && (
            <div
              className="mt-2 text-[0.75rem]"
              style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.5 }}
            >
              標準月齢を過ぎています。かかりつけ医にご相談ください。
            </div>
          )}

          {/* アクションボタン */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {status === "completed" ? (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  className="font-hand rounded-md px-2.5 py-1 text-[0.75rem]"
                  style={{
                    background: "#fff",
                    color: "var(--bloom-ink)",
                    border: "1.5px solid var(--bloom-line)",
                  }}
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={onUncheck}
                  className="font-hand rounded-md px-2.5 py-1 text-[0.75rem]"
                  style={{
                    background: "#fff",
                    color: "#A8421B",
                    border: "1.5px solid var(--bloom-line-soft)",
                  }}
                >
                  取り消す
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                className="bloom-border font-hand rounded-md px-3 py-1 text-[0.8125rem]"
                style={{
                  background: "var(--bloom-primary)",
                  color: "#fff",
                  letterSpacing: "0.04em",
                }}
              >
                ＋ 接種を記録
              </button>
            )}
          </div>
        </div>
      </div>
    </BloomCard>
  );
}

// === 「すくすく」サブタブ本体（Phase 1 後半 P1-T06）===
// 身長・体重の入力ボタン + 最新サマリーカード + 履歴リスト
// 成長曲線グラフは Phase 2 で実装予定（下部にプレースホルダを表示）
function GrowthTab({
  childId,
  childName,
  childGender,
  childBirthDate,
  familyId,
  createdByUid,
}: {
  childId: string;
  childName: string;
  childGender: ChildGender;
  childBirthDate: Timestamp | null;
  familyId: string;
  createdByUid: string;
}) {
  // 身長 / 体重 切替（Phase 2 で追加）
  const [chartMetric, setChartMetric] = useState<GrowthMetric>("height");
  const [measurements, setMeasurements] = useState<
    (Measurement & { id: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  // 編集中の Measurement（null なら新規作成モード）
  const [editing, setEditing] = useState<
    (Measurement & { id: string }) | null
  >(null);
  // 削除確認モーダル
  const [deleteTarget, setDeleteTarget] = useState<
    (Measurement & { id: string }) | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // 計測データの取得（子供切替・保存後の再フェッチ用）
  const fetchMeasurements = useCallback(async () => {
    if (!childId) {
      setMeasurements([]);
      setLoading(false);
      return;
    }
    try {
      const items = await getMeasurementsByChild(childId);
      setMeasurements(items);
    } catch (err) {
      console.error("[milestones/growth] 計測データ取得失敗:", err);
      setMeasurements([]);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    fetchMeasurements();
  }, [fetchMeasurements]);

  function handleAddClick() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEditClick(m: Measurement & { id: string }) {
    setEditing(m);
    setFormOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteMeasurement(deleteTarget.id);
      setDeleteTarget(null);
      await fetchMeasurements();
    } catch (err) {
      console.error("[milestones/growth] 計測データ削除失敗:", err);
      alert("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  // 子供未選択の場合
  if (!childId) {
    return (
      <BloomCard className="p-6 text-center">
        <p
          className="font-hand"
          style={{ fontSize: "0.9375rem", color: "var(--bloom-ink-soft)" }}
        >
          子どもを選択してください
        </p>
      </BloomCard>
    );
  }

  // family_id 未設定（onboarding未完了等）
  if (!familyId) {
    return (
      <BloomCard className="p-6 text-center">
        <p
          className="font-hand"
          style={{ fontSize: "0.9375rem", color: "var(--bloom-ink-soft)" }}
        >
          ファミリー情報を読み込み中…
        </p>
      </BloomCard>
    );
  }

  // 最新計測（measured_date 降順なので先頭が最新）
  const latest = measurements[0];

  return (
    <div>
      {/* 1. 新規記録ボタン */}
      <button
        type="button"
        onClick={handleAddClick}
        className="bloom-border bloom-shadow font-hand w-full rounded-[14px] py-3 text-white"
        style={{
          background: "var(--bloom-primary)",
          fontSize: "0.9375rem",
          letterSpacing: "0.05em",
        }}
      >
        ＋ 新しい計測をきろく
      </button>

      {/* 2. 最新サマリー（データがあるとき） */}
      {latest && (
        <BloomCard className="mt-4 p-4">
          <div className="flex items-baseline gap-2">
            <Sprout size={16} color="var(--bloom-primary)" />
            <div
              className="font-hand"
              style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
            >
              さいきんの計測
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            {latest.height_cm != null && (
              <div>
                <span
                  className="font-hand"
                  style={{ fontSize: "1.5rem", color: "var(--bloom-ink)" }}
                >
                  {latest.height_cm}
                </span>
                <span
                  className="ml-0.5 text-[0.75rem]"
                  style={{ color: "var(--bloom-ink-soft)" }}
                >
                  cm
                </span>
              </div>
            )}
            {latest.weight_kg != null && (
              <div>
                <span
                  className="font-hand"
                  style={{ fontSize: "1.5rem", color: "var(--bloom-ink)" }}
                >
                  {latest.weight_kg}
                </span>
                <span
                  className="ml-0.5 text-[0.75rem]"
                  style={{ color: "var(--bloom-ink-soft)" }}
                >
                  kg
                </span>
              </div>
            )}
          </div>
          <div
            className="mt-1 text-[0.75rem]"
            style={{ color: "var(--bloom-ink-soft)" }}
          >
            {formatJpDate(latest.measured_date)}
            {childBirthDate &&
              ` ・ ${formatAgeAt(childBirthDate, latest.measured_date)}`}
          </div>
        </BloomCard>
      )}

      {/* 3. 成長曲線グラフ（Phase 2 で実装）
          身長 / 体重 切替タブ + SVG グラフ本体 */}
      <BloomCard className="mt-4 p-3">
        {/* メトリック切替タブ */}
        <div className="flex gap-2 mb-3">
          <MetricTabButton
            active={chartMetric === "height"}
            label="身長"
            onClick={() => setChartMetric("height")}
          />
          <MetricTabButton
            active={chartMetric === "weight"}
            label="体重"
            onClick={() => setChartMetric("weight")}
          />
        </div>

        {/* グラフ本体 / データなし時は案内 */}
        {childBirthDate ? (
          measurements.length === 0 ? (
            <div
              className="rounded-[12px] p-5 text-center"
              style={{
                background: "var(--bloom-primary-soft)",
                border: "1.5px dashed var(--bloom-line-soft)",
              }}
            >
              <p
                className="font-hand"
                style={{ fontSize: "0.875rem", color: "var(--bloom-ink)" }}
              >
                計測のきろくがまだありません
              </p>
              <p
                className="mt-1 text-[0.75rem]"
                style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.6 }}
              >
                身長・体重を記録すると、ここに
                <br />
                成長曲線グラフが表示されます。
              </p>
            </div>
          ) : (
            <GrowthChart
              childName={childName}
              gender={childGender}
              birthDate={childBirthDate}
              measurements={measurements}
              metric={chartMetric}
            />
          )
        ) : (
          <p
            className="py-6 text-center text-[0.8125rem]"
            style={{ color: "var(--bloom-ink-soft)" }}
          >
            生年月日が未設定のためグラフを表示できません
          </p>
        )}
      </BloomCard>

      {/* 4. 計測履歴リスト */}
      <div className="mt-5">
        <div
          className="font-hand mb-2"
          style={{ fontSize: "0.8125rem", color: "var(--bloom-ink)" }}
        >
          ● 計測のきろく
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Sprout size={32} color="var(--bloom-primary)" />
          </div>
        ) : measurements.length === 0 ? (
          <BloomCard soft className="p-5 text-center">
            <p
              className="text-[0.8125rem]"
              style={{ color: "var(--bloom-ink-soft)", lineHeight: 1.7 }}
            >
              まだ計測のきろくがありません。
              <br />
              身長・体重を記録してみましょう。
            </p>
          </BloomCard>
        ) : (
          <div className="space-y-2">
            {measurements.slice(0, 20).map((m) => (
              <BloomCard soft key={m.id} className="p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-hand"
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--bloom-ink)",
                      }}
                    >
                      {formatJpDate(m.measured_date)}
                      {childBirthDate && (
                        <span
                          className="ml-1.5 text-[0.75rem]"
                          style={{ color: "var(--bloom-ink-soft)" }}
                        >
                          （{formatAgeAt(childBirthDate, m.measured_date)}）
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[0.8125rem]">
                      {m.height_cm != null && (
                        <span
                          className="rounded-md px-1.5 py-0.5"
                          style={{
                            background: "var(--bloom-bg)",
                            color: "var(--bloom-ink)",
                            border: "1px solid var(--bloom-line-soft)",
                          }}
                        >
                          身長 {m.height_cm} cm
                        </span>
                      )}
                      {m.weight_kg != null && (
                        <span
                          className="rounded-md px-1.5 py-0.5"
                          style={{
                            background: "var(--bloom-bg)",
                            color: "var(--bloom-ink)",
                            border: "1px solid var(--bloom-line-soft)",
                          }}
                        >
                          体重 {m.weight_kg} kg
                        </span>
                      )}
                    </div>
                    {m.memo && (
                      <div
                        className="mt-1.5 text-[0.75rem]"
                        style={{
                          color: "var(--bloom-ink-soft)",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {m.memo}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditClick(m)}
                      className="font-hand rounded-md px-2 py-1 text-[0.75rem]"
                      style={{
                        background: "#fff",
                        color: "var(--bloom-ink)",
                        border: "1.5px solid var(--bloom-line)",
                      }}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(m)}
                      className="font-hand rounded-md px-2 py-1 text-[0.75rem]"
                      style={{
                        background: "#fff",
                        color: "#A8421B",
                        border: "1.5px solid var(--bloom-line-soft)",
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </BloomCard>
            ))}
            {measurements.length > 20 && (
              <p
                className="mt-2 text-center text-[0.75rem]"
                style={{ color: "var(--bloom-ink-soft)" }}
              >
                最新の20件を表示しています
              </p>
            )}
          </div>
        )}
      </div>

      {/* 入力モーダル（新規 / 編集 共通） */}
      <MeasurementForm
        open={formOpen}
        childId={childId}
        familyId={familyId}
        createdByUid={createdByUid}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchMeasurements}
      />

      {/* 削除確認モーダル */}
      <ConfirmModal
        open={!!deleteTarget}
        title="この計測きろくを削除しますか？"
        description="削除すると元に戻せません。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        destructive
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

// 日付フォーマット: 2026年5月14日 形式
function formatJpDate(ts: Timestamp): string {
  return ts.toDate().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 生後N月齢（または N歳M月）の表記
// 0歳台: 「生後5ヶ月」 / 1歳以上: 「1歳3ヶ月」
function formatAgeAt(birth: Timestamp, target: Timestamp): string {
  const b = birth.toDate();
  const t = target.toDate();
  let months =
    (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
  if (t.getDate() < b.getDate()) months -= 1;
  if (months < 0) return "誕生前";
  if (months < 12) return `生後${months}ヶ月`;
  const years = Math.floor(months / 12);
  const remain = months % 12;
  return remain === 0 ? `${years}歳` : `${years}歳${remain}ヶ月`;
}

// === ページ本体（Suspense ラップ） ===
// useSearchParams は Suspense ラップが必須（既存 /write ページと同じパターン）
export default function MilestonesPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex h-full items-center justify-center"
          style={{ background: "var(--bloom-bg)" }}
        >
          <Sprout size={42} color="var(--bloom-primary)" />
        </div>
      }
    >
      <MilestonesPageInner />
    </Suspense>
  );
}
