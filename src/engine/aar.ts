import type {
  ActionType,
  CategoryScore,
  CheckResult,
  MarchLetter,
  PerformanceBand,
  SimulationEvent,
  SimulationState,
} from './types';
import type { ScenarioDefinition } from './types';
import { formatDuration } from '@/lib/formatDuration';
import { evaluateScenarioTcccRules, getScenarioTcccGuidelineVersion } from '@/data/tccc';
import { failedMassiveHemorrhageDeadline, MASSIVE_HEMORRHAGE_FAIL_REASON } from './hemorrhageDeadline';

export interface AARResult {
  missionResult: 'SUCCESS' | 'PARTIAL SUCCESS' | 'FAILURE';
  casualtyOutcome: string;
  overallScore: number;
  performanceBand: PerformanceBand;
  timeToCriticalIntervention?: number;
  /** Wall-clock scenario duration in seconds. */
  totalElapsedSeconds?: number;
  /** Time attributed to each MARCH letter from trainee actions. Sums to totalElapsedSeconds. */
  marchTimeSeconds?: Record<MarchLetter, number>;
  categoryScores: CategoryScore[];
  marchScores: Record<'M' | 'A' | 'R' | 'C' | 'H', number>;
  criticalErrors: CheckResult[];
  missedFindings: string[];
  unnecessaryInterventions: string[];
  sequenceDeviations: string[];
  reassessmentQuality: CheckResult[];
  timeline: TimelineEntry[];
  whatWentWell: string[];
  needsImprovement: string[];
  recommendedTraining: string[];
  tcccGuidelineVersionId?: string;
  tcccGuidelineVersionDate?: string;
  tcccResults: import('@/data/tccc/types').TcccRuleResult[];
  unknownTcccRuleIds: string[];
}

export interface TimelineEntry {
  timestamp: number;
  formattedTime: string;
  label: string;
  significant: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  hemorrhage: 'Massive Hemorrhage',
  airway: 'Airway',
  respiration: 'Respiration',
  circulation: 'Circulation',
  hypothermia: 'Hypothermia / Head',
  reassessment: 'Reassessment',
  prioritization: 'Prioritization / Timing',
  critical: 'Critical Actions',
};

const CATEGORY_WEIGHTS: Record<string, number> = {
  hemorrhage: 0.25,
  airway: 0.15,
  respiration: 0.15,
  circulation: 0.15,
  hypothermia: 0.05,
  reassessment: 0.1,
  prioritization: 0.1,
  critical: 0.05,
};

function getPerformanceBand(score: number): PerformanceBand {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Proficient';
  if (score >= 60) return 'Needs Improvement';
  return 'Unsatisfactory';
}

function buildTimeline(events: SimulationEvent[]): TimelineEntry[] {
  const significantActions = new Set([
    'assess_avpu',
    'check_responsiveness',
    'assess_massive_hemorrhage',
    'blood_sweep',
    'expose',
    'apply_tourniquet',
    'pack_wound',
    'apply_chest_seal',
    'assess_airway',
    'assess_breathing',
    'assess_circulation',
    'reassess_hemorrhage',
    'reassess_breathing',
    'reassess_circulation',
    'reassess_general',
    'prevent_hypothermia',
    'initiate_iv_access',
    'initiate_saline_lock',
    'administer_txa',
    'administer_whole_blood',
    'request_evacuation',
  ]);

  return events
    .filter((e) => significantActions.has(e.action))
    .map((e) => ({
      timestamp: e.timestamp,
      formattedTime: formatDuration(e.timestamp),
      label: e.message.split('.')[0] ?? e.message,
      significant: e.result === 'discovery' || e.action === 'apply_tourniquet',
    }));
}

function detectMissedFindings(state: SimulationState): string[] {
  return state.findings
    .filter((f) => !f.discovered && !f.hidden)
    .map((f) => f.label);
}

function detectUnnecessaryInterventions(state: SimulationState): string[] {
  const unnecessary: string[] = [];
  for (const intervention of state.interventions) {
    if (!intervention.effective && intervention.type !== 'check_responsiveness' && intervention.type !== 'assess_avpu') {
      unnecessary.push(
        `${intervention.type.replace(/_/g, ' ')} at ${intervention.location ?? 'unknown location'} — ineffective or inappropriate`,
      );
    }
  }
  return unnecessary;
}

function detectSequenceDeviations(state: SimulationState): string[] {
  const deviations: string[] = [];

  const tqTime = state.tourniquetAppliedAt;
  const mhIdentified = state.massiveHemorrhageIdentifiedAt;

  if (mhIdentified && tqTime && tqTime - mhIdentified > 90) {
    deviations.push(
      `Critical delay: Massive hemorrhage remained uncontrolled for ${tqTime - mhIdentified} seconds after recognition.`,
    );
  }

  const airwayBeforeHemorrhage = state.events.find(
    (e) => e.action === 'assess_airway' && (!tqTime || e.timestamp < tqTime),
  );
  const hemorrhageIdentified = state.events.find(
    (e) => e.action === 'assess_massive_hemorrhage' || e.result === 'discovery',
  );

  if (
    airwayBeforeHemorrhage &&
    hemorrhageIdentified &&
    !state.hemorrhageControlledAt &&
    airwayBeforeHemorrhage.timestamp < (mhIdentified ?? Infinity)
  ) {
    const uncontrolledInjury = state.injuries.some((i) => i.requiresTourniquet && !i.controlled);
    if (uncontrolledInjury) {
      deviations.push(
        'Airway assessment was performed before controlling life-threatening hemorrhage.',
      );
    }
  }

  if (state.tourniquetAppliedAt && !state.events.some((e) => e.action === 'reassess_hemorrhage' && e.timestamp > (state.tourniquetAppliedAt ?? 0))) {
    deviations.push('Tourniquet was applied without subsequent hemorrhage reassessment.');
  }

  if (state.events.some((e) => e.action === 'request_evacuation' && e.result === 'failure')) {
    deviations.push('Tactical evacuation was attempted before all interventions were reassessed.');
  }

  return deviations;
}

const MARCH_ACTION_LETTER: Partial<Record<ActionType, MarchLetter>> = {
  assess_massive_hemorrhage: 'M',
  blood_sweep: 'M',
  apply_tourniquet: 'M',
  pack_wound: 'M',
  reassess_hemorrhage: 'M',
  assess_airway: 'A',
  reassess_airway: 'A',
  assess_breathing: 'R',
  check_respirations: 'R',
  check_penetrating_chest_trauma: 'R',
  apply_chest_seal: 'R',
  needle_decompression: 'R',
  reassess_breathing: 'R',
  assess_circulation: 'C',
  check_radial_pulse: 'C',
  initiate_iv_access: 'C',
  initiate_saline_lock: 'C',
  administer_txa: 'C',
  administer_whole_blood: 'C',
  reassess_circulation: 'C',
  prevent_hypothermia: 'H',
};

function marchLetterForEvent(event: SimulationEvent): MarchLetter | undefined {
  if (event.action === 'expose' || event.action === 'visual_inspection') {
    const loc = event.location ?? '';
    if (loc.includes('chest')) return 'R';
    if (
      loc.includes('leg') ||
      loc.includes('thigh') ||
      loc.includes('foot') ||
      loc.includes('arm') ||
      loc.includes('hand')
    ) {
      return 'M';
    }
    return undefined;
  }
  return MARCH_ACTION_LETTER[event.action];
}

export function buildMarchTimeSeconds(state: SimulationState): Record<MarchLetter, number> {
  const times: Record<MarchLetter, number> = { M: 0, A: 0, R: 0, C: 0, H: 0 };
  const elapsed = Math.max(0, Math.floor(state.elapsedSeconds));
  if (elapsed === 0) return times;

  const mapped = state.events
    .map((event) => ({ t: Math.max(0, event.timestamp), letter: marchLetterForEvent(event) }))
    .filter((event): event is { t: number; letter: MarchLetter } => event.letter !== undefined)
    .sort((a, b) => a.t - b.t);

  let last = 0;
  let current: MarchLetter = 'M';

  for (const event of mapped) {
    const t = Math.min(event.t, elapsed);
    times[event.letter] += Math.max(0, t - last);
    current = event.letter;
    last = t;
  }

  times[current] += Math.max(0, elapsed - last);
  return times;
}

function buildMarchScores(categoryScores: CategoryScore[]): Record<'M' | 'A' | 'R' | 'C' | 'H', number> {
  const map: Record<string, 'M' | 'A' | 'R' | 'C' | 'H'> = {
    hemorrhage: 'M',
    airway: 'A',
    respiration: 'R',
    circulation: 'C',
    hypothermia: 'H',
  };

  const scores: Record<'M' | 'A' | 'R' | 'C' | 'H', number> = {
    M: 0,
    A: 0,
    R: 0,
    C: 0,
    H: 0,
  };

  for (const cat of categoryScores) {
    const letter = Object.entries(map).find(([key]) => cat.category === key)?.[1];
    if (letter) scores[letter] = cat.percentage;
  }

  // Default H to assessed baseline if no hypothermia checks
  if (scores.H === 0) scores.H = 64;

  return scores;
}

function buildFeedback(
  checks: CheckResult[],
  deviations: string[],
  missed: string[],
): { well: string[]; improve: string[]; training: string[] } {
  const well: string[] = [];
  const improve: string[] = [];
  const training: string[] = [];

  for (const check of checks.filter((c) => c.passed && c.points > 0)) {
    if (check.critical) well.push(check.detail);
  }

  for (const check of checks.filter((c) => !c.passed)) {
    improve.push(`${check.label}: ${check.detail}`);
    training.push(check.teaching);
  }

  for (const d of deviations) improve.push(d);
  for (const m of missed) {
    improve.push(`Missed finding: ${m}`);
    training.push(`Ensure systematic exposure and blood sweep to identify ${m.toLowerCase()}.`);
  }

  if (well.length === 0) {
    well.push('Scenario completed — review timeline for specific improvement areas.');
  }

  return { well, improve, training: [...new Set(training)].slice(0, 5) };
}

export function generateAAR(
  state: SimulationState,
  scenario: ScenarioDefinition,
): AARResult {
  const checks: CheckResult[] = scenario.scoreRules.map((rule) => rule.evaluate(state));

  const byCategory = new Map<string, CheckResult[]>();
  for (const check of checks) {
    const list = byCategory.get(check.category) ?? [];
    list.push(check);
    byCategory.set(check.category, list);
  }

  const categoryScores: CategoryScore[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const catChecks = byCategory.get(category) ?? [];
    const earned = catChecks.reduce((s, c) => s + c.points, 0);
    const available = catChecks.reduce((s, c) => s + c.maxPoints, 0);
    const percentage = available > 0 ? Math.round((earned / available) * 100) : 100;

    categoryScores.push({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      weight,
      earnedPoints: earned,
      availablePoints: available,
      percentage,
      checks: catChecks,
    });

    if (available > 0) {
      weightedSum += percentage * weight;
      totalWeight += weight;
    }
  }

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  const criticalErrors = checks.filter((c) => c.critical && !c.passed);
  const reassessmentQuality = checks.filter((c) => c.category === 'reassessment');
  const missedFindings = detectMissedFindings(state);
  const unnecessaryInterventions = detectUnnecessaryInterventions(state);
  const sequenceDeviations = detectSequenceDeviations(state);
  const timeline = buildTimeline(state.events);
  const marchScores = buildMarchScores(categoryScores);
  const feedback = buildFeedback(checks, sequenceDeviations, missedFindings);

  const missionResult =
    state.status === 'completed' && criticalErrors.length === 0
      ? 'SUCCESS'
      : state.status === 'completed'
        ? 'PARTIAL SUCCESS'
        : 'FAILURE';

  const casualtyOutcome =
    state.status === 'failed'
      ? failedMassiveHemorrhageDeadline(state)
        ? MASSIVE_HEMORRHAGE_FAIL_REASON
        : 'Casualty deteriorated beyond recovery due to untreated critical injuries.'
      : state.physiology.shockState === 'none' || state.physiology.shockState === 'compensated'
        ? 'Casualty stabilized with controlled hemorrhage and adequate perfusion.'
        : 'Casualty partially stabilized — continued monitoring required during evacuation.';

  const tccc = evaluateScenarioTcccRules(state, scenario);
  const guideline = getScenarioTcccGuidelineVersion(scenario);

  return {
    missionResult,
    casualtyOutcome,
    overallScore,
    performanceBand: getPerformanceBand(overallScore),
    timeToCriticalIntervention: state.tourniquetAppliedAt,
    totalElapsedSeconds: Math.max(0, Math.floor(state.elapsedSeconds)),
    marchTimeSeconds: buildMarchTimeSeconds(state),
    categoryScores,
    marchScores,
    criticalErrors,
    missedFindings,
    unnecessaryInterventions,
    sequenceDeviations,
    reassessmentQuality,
    timeline,
    whatWentWell: feedback.well,
    needsImprovement: feedback.improve,
    recommendedTraining: feedback.training,
    tcccGuidelineVersionId: guideline?.id ?? scenario.tcccGuidelineVersionId,
    tcccGuidelineVersionDate: guideline?.versionDate,
    tcccResults: tccc.results,
    unknownTcccRuleIds: tccc.unknownRuleIds,
  };
}
