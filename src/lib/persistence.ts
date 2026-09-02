import type { TrainingRecord, PerformanceStats, MarchLetter } from '@/engine/types';
import type { AARResult } from '@/engine/aar';
import type { PerformanceBand } from '@/engine/types';

const STORAGE_KEY = '68w-training-records';

export function saveTrainingRecord(
  scenarioId: string,
  scenarioTitle: string,
  aar: AARResult,
  durationSeconds: number,
): TrainingRecord {
  const records = getTrainingRecords();
  const weakAreas = aar.categoryScores
    .filter((c) => c.percentage < 75)
    .map((c) => c.label);

  const record: TrainingRecord = {
    id: `record-${Date.now()}`,
    scenarioId,
    scenarioTitle,
    completedAt: new Date().toISOString(),
    overallScore: aar.overallScore,
    performanceBand: aar.performanceBand,
    marchScores: aar.marchScores,
    timeToCriticalIntervention: aar.timeToCriticalIntervention,
    durationSeconds,
    casualtyOutcome: aar.casualtyOutcome,
    weakAreas,
    aar,
  };

  records.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 50)));
  return record;
}

export function getTrainingRecords(): TrainingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TrainingRecord[];
  } catch {
    return [];
  }
}

export function getTrainingRecordById(id: string): TrainingRecord | undefined {
  return getTrainingRecords().find((record) => record.id === id);
}

export function getPerformanceStats(): PerformanceStats {
  const records = getTrainingRecords();

  if (records.length === 0) {
    return {
      totalScenarios: 0,
      averageScore: 0,
      marchAverages: { M: 0, A: 0, R: 0, C: 0, H: 0 },
      recentRecords: [],
      weakAreas: [],
    };
  }

  const marchLetters: MarchLetter[] = ['M', 'A', 'R', 'C', 'H'];
  const marchAverages = {} as Record<MarchLetter, number>;
  for (const letter of marchLetters) {
    const scores = records.map((r) => r.marchScores[letter]).filter((s) => s > 0);
    marchAverages[letter] =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  const criticalTimes = records
    .map((r) => r.timeToCriticalIntervention)
    .filter((t): t is number => t !== undefined);

  const allWeak = records.flatMap((r) => r.weakAreas);
  const weakCounts = allWeak.reduce(
    (acc, w) => {
      acc[w] = (acc[w] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const weakAreas = Object.entries(weakCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([area]) => area);

  return {
    totalScenarios: records.length,
    averageScore: Math.round(
      records.reduce((s, r) => s + r.overallScore, 0) / records.length,
    ),
    averageCriticalInterventionTime:
      criticalTimes.length > 0
        ? Math.round(criticalTimes.reduce((a, b) => a + b, 0) / criticalTimes.length)
        : undefined,
    marchAverages,
    recentRecords: records.slice(0, 5),
    weakAreas,
  };
}

export function getProficiencyBand(score: number): PerformanceBand {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Proficient';
  if (score >= 60) return 'Needs Improvement';
  return 'Unsatisfactory';
}
