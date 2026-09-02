import type { ActionType, MarchLetter, SimulationState } from '@/engine/types';
import type { AnatomicalLocation } from '@/lib/locations';

export type TcccPhase =
  | 'CARE_UNDER_FIRE'
  | 'TACTICAL_FIELD_CARE'
  | 'TACTICAL_EVACUATION_CARE';

export type TcccVerificationStatus = 'verified' | 'TODO_TCCC_VERIFICATION_REQUIRED';

export type TcccScoringRelevance = 'critical' | 'standard' | 'informational';

export interface TcccSource {
  authority: string;
  document: string;
  versionDate: string;
  section?: string;
}

export interface TcccGuidelineVersion {
  id: string;
  authority: string;
  documentTitle: string;
  versionDate: string;
  source: string;
  trainingUseOnly: true;
  verificationStatus: TcccVerificationStatus;
  notes: string;
}

export interface TcccRule {
  id: string;
  title: string;
  phase: TcccPhase;
  march?: MarchLetter;
  expectedBehavior: string;
  scoringRelevance: TcccScoringRelevance;
  source: TcccSource;
  guidelineVersionId: string;
  verified: boolean;
  verificationStatus: TcccVerificationStatus;
}

export type TcccEvidenceKind =
  | 'assessment_performed'
  | 'finding_discovered'
  | 'effective_intervention'
  | 'reassessment_after_intervention'
  | 'no_wrong_location_intervention';

/**
 * Scenario-local evidence mapping. This does not quote TCCC text.
 * It only describes how THIS scenario's event log can demonstrate a rule ID.
 */
export interface TcccEvidenceBinding {
  ruleId: string;
  kind: TcccEvidenceKind;
  requiredActions?: ActionType[];
  requireEffective?: boolean;
  requireLocation?: boolean;
  targetLocation?: AnatomicalLocation;
  findingId?: string;
  afterAction?: ActionType;
  /** If set, the check is not applicable until this finding is discovered. */
  requiresDiscoveredFindingId?: string;
  /** If set, this check is not applicable unless radial pulses were found absent. */
  requiresAbsentRadialPulse?: boolean;
}

export type TcccRuleOutcome =
  | 'completed'
  | 'missed'
  | 'incorrect'
  | 'not_applicable'
  | 'unresolved_rule';

export interface TcccRuleResult {
  ruleId: string;
  title: string;
  phase?: TcccPhase;
  march?: MarchLetter;
  outcome: TcccRuleOutcome;
  verified: boolean;
  verificationStatus: TcccVerificationStatus;
  expectedBehavior: string;
  evidenceDetail: string;
  guidelineVersionId: string;
  source?: TcccSource;
  locationCorrect?: boolean;
  timestamp?: number;
}

export type TcccEvidenceEvaluator = (state: SimulationState) => {
  passed: boolean;
  incorrect?: boolean;
  notApplicable?: boolean;
  detail: string;
  locationCorrect?: boolean;
  timestamp?: number;
};
