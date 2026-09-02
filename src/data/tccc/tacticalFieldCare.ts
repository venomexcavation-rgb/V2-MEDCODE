import { ACTIVE_TCCC_GUIDELINE_VERSION_ID, UNVERIFIED_TCCC_SOURCE } from './metadata';
import type { TcccRule } from './types';

function pendingTfc(
  id: string,
  title: string,
  march: TcccRule['march'],
  scoringRelevance: TcccRule['scoringRelevance'] = 'standard',
): TcccRule {
  return {
    id,
    title,
    phase: 'TACTICAL_FIELD_CARE',
    march,
    expectedBehavior: 'TODO_TCCC_VERIFICATION_REQUIRED',
    scoringRelevance,
    source: UNVERIFIED_TCCC_SOURCE,
    guidelineVersionId: ACTIVE_TCCC_GUIDELINE_VERSION_ID,
    verified: false,
    verificationStatus: 'TODO_TCCC_VERIFICATION_REQUIRED',
  };
}

/**
 * Tactical Field Care rule slots. Titles are category placeholders only.
 * Do not treat expectedBehavior as official TCCC text.
 */
export const TACTICAL_FIELD_CARE_RULES: TcccRule[] = [
  pendingTfc('TCCC-M-001', 'Tactical Field Care — massive hemorrhage control (pending verification)', 'M', 'critical'),
  pendingTfc('TCCC-M-002', 'Tactical Field Care — massive hemorrhage identification (pending verification)', 'M', 'critical'),
  pendingTfc('TCCC-A-001', 'Tactical Field Care — airway (pending verification)', 'A'),
  pendingTfc('TCCC-R-001', 'Tactical Field Care — respiration assessment (pending verification)', 'R'),
  pendingTfc('TCCC-R-002', 'Tactical Field Care — open chest wound management (pending verification)', 'R'),
  pendingTfc('TCCC-C-001', 'Tactical Field Care — saline lock (pending verification)', 'C'),
  pendingTfc('TCCC-C-002', 'Tactical Field Care — circulation reassessment after hemorrhage control (pending verification)', 'C'),
  pendingTfc('TCCC-C-003', 'Tactical Field Care — TXA after saline lock (pending verification)', 'C'),
  pendingTfc('TCCC-C-004', 'Tactical Field Care — whole blood for absent radial pulses (pending verification)', 'C'),
  pendingTfc('TCCC-H-001', 'Tactical Field Care — hypothermia prevention (pending verification)', 'H'),
];
