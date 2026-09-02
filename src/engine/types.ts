import type { AnatomicalLocation } from '@/lib/locations';
import type { TcccEvidenceBinding } from '@/data/tccc/types';

export type MarchLetter = 'M' | 'A' | 'R' | 'C' | 'H';
export type MarchStatus = 'UNKNOWN' | 'ASSESSING' | 'CONCERN' | 'TREATED' | 'STABLE';

export type ActionType =
  | 'check_responsiveness'
  | 'assess_massive_hemorrhage'
  | 'blood_sweep'
  | 'expose'
  | 'visual_inspection'
  | 'assess_airway'
  | 'assess_breathing'
  | 'assess_circulation'
  | 'check_radial_pulse'
  | 'check_respirations'
  | 'check_penetrating_chest_trauma'
  | 'apply_tourniquet'
  | 'pack_wound'
  | 'apply_chest_seal'
  | 'needle_decompression'
  | 'reassess_hemorrhage'
  | 'reassess_breathing'
  | 'reassess_circulation'
  | 'reassess_airway'
  | 'reassess_general'
  | 'log_roll'
  | 'position_casualty'
  | 'request_evacuation'
  | 'end_scenario'
  | 'prevent_hypothermia'
  | 'initiate_iv_access'
  | 'initiate_saline_lock'
  | 'unknown';

export interface StructuredAction {
  type: ActionType;
  location?: AnatomicalLocation;
  parameters?: Record<string, string | boolean | number>;
  rawInput: string;
}

export type ScenarioStatus = 'pending' | 'active' | 'completed' | 'failed';

export type ConsciousnessLevel =
  | 'alert'
  | 'confused'
  | 'verbal'
  | 'pain'
  | 'unresponsive';

export type ShockState = 'none' | 'compensated' | 'decompensated' | 'arrest';

export interface Injury {
  id: string;
  location: AnatomicalLocation;
  type: string;
  severity: 'minor' | 'moderate' | 'critical';
  bleedingRateMlPerMin: number;
  controlled: boolean;
  packable: boolean;
  requiresTourniquet: boolean;
  hiddenUntil: string[];
  description: string;
  discoveryDescription: string;
}

export interface Finding {
  id: string;
  label: string;
  category: MarchLetter;
  location?: AnatomicalLocation;
  hidden: boolean;
  discovered: boolean;
  discoveryConditions: string[];
  observationText: string;
  marchImpact: MarchStatus;
}

export interface Intervention {
  id: string;
  type: ActionType;
  location?: AnatomicalLocation;
  timestamp: number;
  effective: boolean;
  parameters?: Record<string, string | boolean | number>;
  notes?: string;
}

export interface SimulationEvent {
  id: string;
  timestamp: number;
  action: ActionType;
  location?: AnatomicalLocation;
  result: 'success' | 'partial' | 'failure' | 'info' | 'discovery';
  message: string;
  findingsDiscovered?: string[];
  stateChanges?: string[];
  interventionEffective?: boolean;
}

export interface CasualtyPhysiology {
  consciousness: ConsciousnessLevel;
  airwayPatent: boolean;
  respiratoryRate: number;
  respiratoryDistress: boolean;
  radialPulsePresent: boolean;
  radialPulseQuality: 'strong' | 'weak' | 'absent';
  bloodLossMl: number;
  shockState: ShockState;
  skinSigns: string;
  mentalStatusNote: string;
  spo2?: number;
}

export interface SimulationState {
  scenarioId: string;
  elapsedSeconds: number;
  status: ScenarioStatus;
  physiology: CasualtyPhysiology;
  injuries: Injury[];
  findings: Finding[];
  discoveredFindingIds: string[];
  performedAssessments: string[];
  interventions: Intervention[];
  events: SimulationEvent[];
  marchStatus: Record<MarchLetter, MarchStatus>;
  tourniquetsApplied: AnatomicalLocation[];
  chestSealed: boolean;
  woundPacked: string[];
  hemorrhageControlledAt?: number;
  massiveHemorrhageIdentifiedAt?: number;
  tourniquetAppliedAt?: number;
  hypothermiaPreventionApplied: boolean;
  ivAccessInitiated: boolean;
  salineLockInitiated: boolean;
  dialogueHistory: string[];
  completionReason?: string;
  aar?: import('@/engine/aar').AARResult;
}

export interface DeteriorationRule {
  id: string;
  condition: (state: SimulationState) => boolean;
  intervalSeconds: number;
  apply: (state: SimulationState) => Partial<SimulationState>;
  description: string;
}

export interface ScoreRule {
  id: string;
  label: string;
  category: string;
  maxPoints: number;
  critical: boolean;
  evaluate: (state: SimulationState) => CheckResult;
  detail: string;
  teaching: string;
  reference?: string;
}

export interface CheckResult {
  id: string;
  label: string;
  category: string;
  points: number;
  maxPoints: number;
  passed: boolean;
  critical: boolean;
  detail: string;
  teaching: string;
  reference?: string;
}

export interface CategoryScore {
  category: string;
  label: string;
  weight: number;
  earnedPoints: number;
  availablePoints: number;
  percentage: number;
  checks: CheckResult[];
}

export type PerformanceBand = 'Excellent' | 'Proficient' | 'Needs Improvement' | 'Unsatisfactory';

export interface CompletionCriteria {
  type: 'stabilization' | 'evacuation' | 'time_limit' | 'failure';
  description: string;
  check: (state: SimulationState) => boolean;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  environment: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  mechanism: string;
  learningObjectives: string[];
  estimatedMinutes: string;
  trainingFocus: string[];
  initialPresentation: string;
  casualtyDemographics: string;
  initialState: Omit<SimulationState, 'events' | 'discoveredFindingIds' | 'performedAssessments' | 'interventions' | 'dialogueHistory' | 'marchStatus'>;
  deteriorationRules: DeteriorationRule[];
  scoreRules: ScoreRule[];
  completionCriteria: CompletionCriteria[];
  failureCriteria: CompletionCriteria[];
  actionTimeCosts: Partial<Record<ActionType, number>>;
  /** Pins this scenario to a TCCC guideline version slot. */
  tcccGuidelineVersionId?: string;
  /** Stable TCCC rule IDs this scenario evaluates. Unknown IDs are reported, not thrown. */
  requiredTcccRules?: string[];
  /** Scenario-local event-log evidence for those rule IDs. Does not quote TCCC text. */
  tcccEvidenceBindings?: TcccEvidenceBinding[];
}

export interface TrainingRecord {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  completedAt: string;
  overallScore: number;
  performanceBand: PerformanceBand;
  marchScores: Record<MarchLetter, number>;
  timeToCriticalIntervention?: number;
  durationSeconds: number;
  casualtyOutcome: string;
  weakAreas: string[];
}

export interface PerformanceStats {
  totalScenarios: number;
  averageScore: number;
  averageCriticalInterventionTime?: number;
  marchAverages: Record<MarchLetter, number>;
  recentRecords: TrainingRecord[];
  weakAreas: string[];
}
