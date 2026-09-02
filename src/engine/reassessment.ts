import { locationsMatch, type AnatomicalLocation } from '@/lib/locations';
import type { SimulationState } from './types';

export const PRE_EVAC_REASSESS_PROMPT =
  'Reassess all interventions before initiating tactical evacuation.';

function siteLabel(location: AnatomicalLocation | undefined): string {
  return (location ?? 'wound').replace(/_/g, ' ');
}

export function buildInterventionReassessment(state: SimulationState): string[] {
  const lines: string[] = [];

  for (const injury of state.injuries.filter((item) => item.requiresTourniquet)) {
    const site = siteLabel(injury.location);
    const tourniquetOn = state.tourniquetsApplied.some((location) => locationsMatch(location, injury.location));
    if (!injury.controlled) {
      lines.push(`Bleeding has continued from the ${site}.`);
      lines.push(
        tourniquetOn
          ? `Tourniquet on the ${site} is not controlling hemorrhage.`
          : `No effective tourniquet is in place for the ${site}.`,
      );
    } else {
      lines.push(`Bleeding has stopped at the ${site}. Tourniquet remains effective.`);
    }
  }

  for (const injury of state.injuries.filter((item) => item.type === 'penetrating_chest_wound')) {
    const relatedFinding = state.findings.find(
      (finding) => finding.location && locationsMatch(finding.location, injury.location),
    );
    if (relatedFinding && !state.discoveredFindingIds.includes(relatedFinding.id)) continue;
    if (!relatedFinding) continue;

    const site = siteLabel(injury.location);
    if (!state.chestSealed || !injury.controlled) {
      lines.push(`The chest wound on the ${site} is still open. Air leak has continued.`);
    } else {
      lines.push(`Chest seal remains in place on the ${site}. No sucking sound.`);
    }
  }

  for (const packedId of state.woundPacked) {
    const injury = state.injuries.find((item) => item.id === packedId);
    const site = siteLabel(injury?.location);
    lines.push(
      injury?.controlled
        ? `Wound packing at the ${site} remains in place.`
        : `Packed wound at the ${site} is still bleeding. Bleeding has continued.`,
    );
  }

  if (state.salineLockInitiated) lines.push('Saline lock remains in place.');
  if (state.ivAccessInitiated) lines.push('IV access remains in place.');
  if (state.txaAdministered) lines.push('TXA has been given. No change on reassessment.');
  if (state.wholeBloodAdministered) lines.push('Whole blood infusion is in place.');
  if (state.hypothermiaPreventionApplied) lines.push('Hypothermia prevention remains in place.');

  if (state.performedAssessments.includes('assess_airway')) {
    lines.push(
      state.physiology.airwayPatent ? 'Airway remains patent.' : 'Airway compromise has continued.',
    );
  }

  if (
    state.performedAssessments.includes('assess_breathing') ||
    state.performedAssessments.includes('check_respirations')
  ) {
    lines.push(
      state.physiology.respiratoryDistress
        ? `Labored breathing has continued at ${state.physiology.respiratoryRate}/min.`
        : `Breathing remains adequate at ${state.physiology.respiratoryRate}/min.`,
    );
  }

  if (state.radialPulseFinding) {
    lines.push(
      state.physiology.radialPulsePresent
        ? `Radial pulse remains ${state.physiology.radialPulseQuality}.`
        : 'Radial pulse remains absent. Shock signs have continued.',
    );
  }

  if (lines.length === 0) {
    lines.push('No interventions are in place to reassess. Bleeding has continued from untreated wounds.');
  }

  return lines;
}

export function hasCompletedPreEvacReassessment(state: SimulationState): boolean {
  if (state.preEvacReassessmentAt === undefined) return false;
  const latestEffectiveIntervention = state.interventions
    .filter((intervention) => intervention.effective)
    .reduce((latest, intervention) => Math.max(latest, intervention.timestamp), -1);
  return state.preEvacReassessmentAt >= latestEffectiveIntervention;
}
