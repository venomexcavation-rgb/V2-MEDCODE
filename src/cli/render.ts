import { getAvpuResult, hasAssessedAvpu } from '@/engine/avpu';
import type { AARResult } from '@/engine/aar';
import type { ScenarioDefinition, SimulationState } from '@/engine/types';
import { formatDuration } from '@/lib/formatDuration';
import { getPerformanceStats } from '@/lib/persistence';
import { PLACEHOLDER_SCENARIOS, SCENARIOS } from '@/scenarios/scenario001';

const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function na(): string {
  return `${DIM}NOT ASSESSED${RESET}`;
}

export function banner(): string {
  return [
    '',
    `${BOLD}AIDBAG${RESET}  ·  field casualty desk`,
    `${DIM}Training use only. Not for real-patient care.${RESET}`,
    `${DIM}Type in this Cursor terminal. No browser. No localhost.${RESET}`,
    '',
  ].join('\n');
}

export function menuScreen(): string {
  const stats = getPerformanceStats();
  const lines = [
    banner(),
    '  What do you want to do?',
    '',
  ];

  SCENARIOS.forEach((scenario, index) => {
    lines.push(
      `  ${BOLD}${index + 1}${RESET}  ${scenario.id}  ${scenario.title}  ${DIM}${scenario.estimatedMinutes}${RESET}`,
    );
  });

  PLACEHOLDER_SCENARIOS.forEach((scenario) => {
    lines.push(`     ${DIM}${scenario.id}  ${scenario.title}  — coming soon${RESET}`);
  });

  lines.push('');
  lines.push(`  ${BOLD}P${RESET}  Performance${stats.totalScenarios ? `  (${stats.totalScenarios} sessions)` : ''}`);
  lines.push(`  ${BOLD}Q${RESET}  Quit`);
  lines.push('');
  return lines.join('\n');
}

export function trainingHelp(): string {
  return [
    '',
    `${BOLD}How to treat${RESET} — type what a medic would say, then press Return.`,
    '',
    '  Checking AVPU',
    '  Check for massive hemorrhage',
    '  Expose the right thigh',
    '  Hasty tourniquet applied to leg',
    '  Assess airway',
    '  Assess breathing',
    '  Apply chest seal to left chest',
    '  Check radial pulse',
    '  Initiate saline lock',
    '  Administer 2 grams TXA',
    '  Reassess all interventions',
    '  Initiate tactical evacuation',
    '',
    '  status     show casualty again',
    '  help       this list',
    '  end        end scenario',
    '  menu       leave scenario (not scored as complete)',
    '',
  ].join('\n');
}

export function casualtyBlock(state: SimulationState, scenario: ScenarioDefinition): string {
  const hasPulse =
    state.performedAssessments.includes('check_radial_pulse') ||
    state.performedAssessments.includes('assess_circulation');
  const hasBreathing =
    state.performedAssessments.includes('assess_breathing') ||
    state.performedAssessments.includes('check_respirations');
  const hasAirway = state.performedAssessments.includes('assess_airway');

  const avpu = hasAssessedAvpu(state)
    ? getAvpuResult(state.physiology.consciousness).summary.toUpperCase()
    : na();
  const airway = hasAirway
    ? state.physiology.airwayPatent
      ? 'PATENT'
      : 'COMPROMISED'
    : na();
  const respirations = hasBreathing
    ? `${state.physiology.respiratoryRate}/min${state.physiology.respiratoryDistress ? ' — LABORED' : ''}`
    : na();
  const pulse = hasPulse
    ? state.physiology.radialPulsePresent
      ? state.physiology.radialPulseQuality.toUpperCase()
      : 'ABSENT'
    : na();
  const skin = hasPulse ? state.physiology.skinSigns : na();
  const access = state.ivAccessInitiated
    ? 'IV INITIATED'
    : state.salineLockInitiated
      ? 'SALINE LOCK INITIATED'
      : na();
  const txa = state.txaAdministered ? '2 GRAMS ADMINISTERED' : na();
  const blood = state.wholeBloodAdministered
    ? '450 ML LTOWB'
    : state.radialPulseFinding === 'present'
      ? 'NOT INDICATED'
      : na();
  const hypo = state.hypothermiaPreventionApplied ? 'COVERED / INSULATED' : na();

  const march = (['M', 'A', 'R', 'C', 'H'] as const)
    .map((letter) => `${letter}:${state.marchStatus[letter]}`)
    .join('  ');

  const findings = state.findings.filter((finding) => state.discoveredFindingIds.includes(finding.id));
  const findingLines =
    findings.length === 0
      ? [`  Findings     ${DIM}none discovered yet${RESET}`]
      : findings.map((finding) => `  ${finding.category}            ${finding.label}`);

  return [
    '',
    `${BOLD}── ${scenario.id}  ${formatDuration(state.elapsedSeconds)}  ${state.status.toUpperCase()} ──${RESET}`,
    `  ${march}`,
    `  ${scenario.casualtyDemographics}`,
    `  AVPU         ${avpu}`,
    `  Airway       ${airway}`,
    `  Respirations ${respirations}`,
    `  Radial pulse ${pulse}`,
    `  Skin         ${skin}`,
    `  Access       ${access}`,
    `  TXA          ${txa}`,
    `  Whole blood  ${blood}`,
    `  Hypothermia  ${hypo}`,
    ...findingLines,
    '',
  ].join('\n');
}

export function aarBlock(aar: AARResult, scenarioTitle: string): string {
  const bandColor =
    aar.performanceBand === 'Excellent' || aar.performanceBand === 'Proficient' ? GREEN : YELLOW;
  const resultColor = aar.missionResult === 'FAILURE' ? RED : GREEN;

  return [
    '',
    `${BOLD}AFTER ACTION REVIEW${RESET}  ·  ${scenarioTitle}`,
    `  Result   ${resultColor}${aar.missionResult}${RESET}`,
    `  Outcome  ${aar.casualtyOutcome}`,
    `  Score    ${bandColor}${aar.overallScore}  ${aar.performanceBand}${RESET}`,
    '',
    ...aar.categoryScores.map(
      (category) => `  ${category.label.padEnd(28)} ${category.percentage}%`,
    ),
    '',
    aar.whatWentWell.length ? `${BOLD}Went well${RESET}` : '',
    ...aar.whatWentWell.map((line) => `  • ${line}`),
    aar.needsImprovement.length ? `${BOLD}Needs work${RESET}` : '',
    ...aar.needsImprovement.map((line) => `  • ${line}`),
    '',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

export function performanceBlock(): string {
  const stats = getPerformanceStats();
  if (stats.totalScenarios === 0) {
    return `\n  No sessions yet. Run a scenario first.\n`;
  }
  return [
    '',
    `${BOLD}PERFORMANCE${RESET}`,
    `  Sessions     ${stats.totalScenarios}`,
    `  Average      ${stats.averageScore}%`,
    `  MARCH        M ${stats.marchAverages.M}  A ${stats.marchAverages.A}  R ${stats.marchAverages.R}  C ${stats.marchAverages.C}  H ${stats.marchAverages.H}`,
    stats.weakAreas.length ? `  Weak areas   ${stats.weakAreas.join(', ')}` : '',
    '',
    ...stats.recentRecords.map(
      (record) =>
        `  ${record.completedAt.slice(0, 10)}  ${record.scenarioTitle}  ${record.overallScore}%  ${record.performanceBand}`,
    ),
    '',
  ].join('\n');
}
