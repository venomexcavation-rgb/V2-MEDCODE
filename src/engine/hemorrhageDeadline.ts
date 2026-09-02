import type { SimulationState } from './types';

/** Uncontrolled extremity hemorrhage is lethal if not controlled within this window. */
export const MASSIVE_HEMORRHAGE_FAIL_SECONDS = 300;

export const MASSIVE_HEMORRHAGE_FAIL_REASON =
  'Massive hemorrhage was not controlled within 5 minutes. The casualty died.';

export function hasUncontrolledMassiveHemorrhage(state: SimulationState): boolean {
  return state.injuries.some((injury) => injury.requiresTourniquet && !injury.controlled);
}

export function failedMassiveHemorrhageDeadline(state: SimulationState): boolean {
  if (!state.injuries.some((injury) => injury.requiresTourniquet)) return false;
  if (state.elapsedSeconds < MASSIVE_HEMORRHAGE_FAIL_SECONDS) return false;

  const controlledInTime =
    state.hemorrhageControlledAt !== undefined &&
    state.hemorrhageControlledAt <= MASSIVE_HEMORRHAGE_FAIL_SECONDS &&
    !hasUncontrolledMassiveHemorrhage(state);

  return !controlledInTime;
}
