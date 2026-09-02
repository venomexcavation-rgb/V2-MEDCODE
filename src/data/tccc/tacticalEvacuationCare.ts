import { ACTIVE_TCCC_GUIDELINE_VERSION_ID, UNVERIFIED_TCCC_SOURCE } from './metadata';
import type { TcccRule } from './types';

/**
 * Tactical Evacuation Care rule slots. No clinical recommendation is encoded.
 */
export const TACTICAL_EVACUATION_CARE_RULES: TcccRule[] = [
  {
    id: 'TCCC-TEV-001',
    title: 'Tactical Evacuation Care — casualty monitoring / handoff (pending verification)',
    phase: 'TACTICAL_EVACUATION_CARE',
    expectedBehavior: 'TODO_TCCC_VERIFICATION_REQUIRED',
    scoringRelevance: 'informational',
    source: UNVERIFIED_TCCC_SOURCE,
    guidelineVersionId: ACTIVE_TCCC_GUIDELINE_VERSION_ID,
    verified: false,
    verificationStatus: 'TODO_TCCC_VERIFICATION_REQUIRED',
  },
];
