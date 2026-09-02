import { ACTIVE_TCCC_GUIDELINE_VERSION_ID, UNVERIFIED_TCCC_SOURCE } from './metadata';
import type { TcccRule } from './types';

function pendingCuf(id: string, title: string, march?: TcccRule['march']): TcccRule {
  return {
    id,
    title,
    phase: 'CARE_UNDER_FIRE',
    march,
    expectedBehavior: 'TODO_TCCC_VERIFICATION_REQUIRED',
    scoringRelevance: 'critical',
    source: UNVERIFIED_TCCC_SOURCE,
    guidelineVersionId: ACTIVE_TCCC_GUIDELINE_VERSION_ID,
    verified: false,
    verificationStatus: 'TODO_TCCC_VERIFICATION_REQUIRED',
  };
}

/**
 * Care Under Fire rule slots. Clinical expected behavior is not encoded
 * until a verified CoTCCC / JTS excerpt is supplied.
 */
export const CARE_UNDER_FIRE_RULES: TcccRule[] = [
  pendingCuf('TCCC-CUF-001', 'Care Under Fire — life-threatening hemorrhage control (pending verification)', 'M'),
];
