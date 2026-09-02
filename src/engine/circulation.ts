import type { SimulationState } from './types';

export function hasAssessedRadialPulse(state: SimulationState): boolean {
  return state.radialPulseFinding === 'present' || state.radialPulseFinding === 'absent';
}

export function isWholeBloodRequired(state: SimulationState): boolean {
  return state.radialPulseFinding === 'absent';
}

export function isCirculationComplete(state: SimulationState): boolean {
  if (!hasAssessedRadialPulse(state) || !state.salineLockInitiated || !state.txaAdministered) {
    return false;
  }
  if (isWholeBloodRequired(state) && !state.wholeBloodAdministered) {
    return false;
  }
  return true;
}
