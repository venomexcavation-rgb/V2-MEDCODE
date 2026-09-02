import type { TcccGuidelineVersion, TcccSource } from './types';

/**
 * Central TCCC version registry.
 * Do not scatter version strings. Future revisions get a new id; scenarios pin an id.
 *
 * No CoTCCC / Joint Trauma System excerpt was supplied with this implementation,
 * so this record is a version SLOT, not a verified citation.
 */
export const TCCC_GUIDELINE_PENDING: TcccGuidelineVersion = {
  id: 'tccc-pending-verification',
  authority: 'CoTCCC / Joint Trauma System',
  documentTitle: 'Tactical Combat Casualty Care Guidelines',
  versionDate: 'PENDING_VERIFICATION',
  source: 'TODO_TCCC_VERIFICATION_REQUIRED — attach the official CoTCCC/JTS document used for this build.',
  trainingUseOnly: true,
  verificationStatus: 'TODO_TCCC_VERIFICATION_REQUIRED',
  notes:
    'Training-use version slot only. Clinical expected-behavior text must remain TODO until an official source excerpt is attached.',
};

export const TCCC_GUIDELINE_VERSIONS: Record<string, TcccGuidelineVersion> = {
  [TCCC_GUIDELINE_PENDING.id]: TCCC_GUIDELINE_PENDING,
};

export const ACTIVE_TCCC_GUIDELINE_VERSION_ID = TCCC_GUIDELINE_PENDING.id;

export function getTcccGuidelineVersion(id: string): TcccGuidelineVersion | undefined {
  return TCCC_GUIDELINE_VERSIONS[id];
}

export const UNVERIFIED_TCCC_SOURCE: TcccSource = {
  authority: 'CoTCCC / Joint Trauma System',
  document: 'Tactical Combat Casualty Care Guidelines',
  versionDate: 'PENDING_VERIFICATION',
  section: 'TODO_TCCC_VERIFICATION_REQUIRED',
};
