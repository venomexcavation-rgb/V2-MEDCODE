import type { ConsciousnessLevel, SimulationState } from './types';

export type AvpuLetter = 'A' | 'V' | 'P' | 'U';

export interface AvpuResult {
  letter: AvpuLetter;
  label: 'Alert' | 'Verbal' | 'Pain' | 'Unresponsive';
  summary: string;
  observation: string;
}

export function hasAssessedAvpu(state: SimulationState): boolean {
  return (
    state.performedAssessments.includes('assess_avpu') ||
    state.performedAssessments.includes('check_responsiveness')
  );
}

/**
 * Maps simulation consciousness to AVPU. This is scenario physiology, not a TCCC citation.
 */
export function getAvpuResult(consciousness: ConsciousnessLevel): AvpuResult {
  switch (consciousness) {
    case 'alert':
      return {
        letter: 'A',
        label: 'Alert',
        summary: 'A — Alert',
        observation: 'The casualty is spontaneously aware and interactive.',
      };
    case 'confused':
      return {
        letter: 'A',
        label: 'Alert',
        summary: 'A — Alert',
        observation: 'The casualty is spontaneously aware but appears confused.',
      };
    case 'verbal':
      return {
        letter: 'V',
        label: 'Verbal',
        summary: 'V — Verbal',
        observation: 'The casualty is not alert. He responds to verbal stimuli with groaning and confused speech.',
      };
    case 'pain':
      return {
        letter: 'P',
        label: 'Pain',
        summary: 'P — Pain',
        observation: 'The casualty does not respond to verbal stimuli. He responds only to painful stimuli.',
      };
    case 'unresponsive':
      return {
        letter: 'U',
        label: 'Unresponsive',
        summary: 'U — Unresponsive',
        observation: 'The casualty does not respond to verbal or painful stimuli.',
      };
  }
}
