import { locationsMatch } from '@/lib/locations';
import type { ScenarioDefinition, SimulationState } from '@/engine/types';
import { CARE_UNDER_FIRE_RULES } from './careUnderFire';
import { TACTICAL_FIELD_CARE_RULES } from './tacticalFieldCare';
import { TACTICAL_EVACUATION_CARE_RULES } from './tacticalEvacuationCare';
import { getTcccGuidelineVersion } from './metadata';
import type {
  TcccEvidenceBinding,
  TcccRule,
  TcccRuleResult,
} from './types';

export const ALL_TCCC_RULES: readonly TcccRule[] = Object.freeze(
  [...CARE_UNDER_FIRE_RULES, ...TACTICAL_FIELD_CARE_RULES, ...TACTICAL_EVACUATION_CARE_RULES].map(
    (rule) => Object.freeze(rule),
  ),
);

const TCCC_RULES_BY_ID: ReadonlyMap<string, TcccRule> = new Map(
  ALL_TCCC_RULES.map((rule) => [rule.id, rule]),
);

export function getTcccRuleById(id: string): TcccRule | undefined {
  return TCCC_RULES_BY_ID.get(id);
}

export function resolveTcccRuleIds(ids: string[]): { found: TcccRule[]; unknown: string[] } {
  const found: TcccRule[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const rule = getTcccRuleById(id);
    if (rule) found.push(rule);
    else unknown.push(id);
  }

  return { found, unknown };
}

/**
 * Read-only evidence evaluation. Never mutates SimulationState.
 * TCCC rules themselves are data; they do not apply physiology changes.
 */
export function evaluateTcccEvidenceBinding(
  state: SimulationState,
  binding: TcccEvidenceBinding,
): Pick<TcccRuleResult, 'outcome' | 'evidenceDetail' | 'locationCorrect' | 'timestamp'> {
  if (
    binding.requiresDiscoveredFindingId &&
    !state.discoveredFindingIds.includes(binding.requiresDiscoveredFindingId)
  ) {
    return {
      outcome: 'not_applicable',
      evidenceDetail: `Finding ${binding.requiresDiscoveredFindingId} was not discovered; this check does not apply.`,
    };
  }

  if (binding.requiresAbsentRadialPulse) {
    if (state.radialPulseFinding === 'present') {
      return {
        outcome: 'not_applicable',
        evidenceDetail: 'Radial pulses were present; whole blood was not required.',
      };
    }
    if (state.radialPulseFinding !== 'absent') {
      return {
        outcome: 'missed',
        evidenceDetail: 'Radial pulses were not assessed; whole-blood indication is unknown.',
      };
    }
  }

  switch (binding.kind) {
    case 'assessment_performed': {
      const actions = binding.requiredActions ?? [];
      const timestamp = state.events.find((e) => actions.includes(e.action))?.timestamp;
      const passed = actions.some((action) => state.performedAssessments.includes(action));
      return {
        outcome: passed ? 'completed' : 'missed',
        evidenceDetail: passed
          ? `Assessment action recorded: ${actions.join(', ')}.`
          : `Required assessment not recorded: ${actions.join(', ')}.`,
        timestamp,
      };
    }

    case 'finding_discovered': {
      const findingId = binding.findingId;
      if (!findingId) {
        return {
          outcome: 'not_applicable',
          evidenceDetail: 'No findingId configured on this scenario binding.',
        };
      }
      const finding = state.findings.find((f) => f.id === findingId);
      const discovered = state.discoveredFindingIds.includes(findingId);
      const event = state.events.find((e) => e.findingsDiscovered?.includes(findingId));
      if (finding?.hidden && !discovered) {
        return {
          outcome: 'missed',
          evidenceDetail: `Hidden finding ${findingId} remains undiscovered.`,
        };
      }
      return {
        outcome: discovered ? 'completed' : 'missed',
        evidenceDetail: discovered
          ? `Finding ${findingId} discovered through assessment.`
          : `Finding ${findingId} was not discovered.`,
        timestamp: event?.timestamp,
      };
    }

    case 'effective_intervention': {
      const actions = binding.requiredActions ?? [];
      const matches = state.interventions.filter((i) => actions.includes(i.type));
      const locationOk = (location: typeof matches[number]['location']) => {
        if (!binding.requireLocation || !binding.targetLocation) return true;
        return locationsMatch(location, binding.targetLocation);
      };

      const correct = matches.find(
        (i) => (!binding.requireEffective || i.effective) && locationOk(i.location),
      );
      const wrongLocation = matches.find(
        (i) => binding.requireLocation && binding.targetLocation && !locationOk(i.location),
      );

      if (correct) {
        return {
          outcome: 'completed',
          evidenceDetail: `Effective ${correct.type} recorded${correct.location ? ` at ${correct.location}` : ''}.`,
          locationCorrect: true,
          timestamp: correct.timestamp,
        };
      }

      if (wrongLocation) {
        return {
          outcome: 'incorrect',
          evidenceDetail: `${wrongLocation.type} applied at ${wrongLocation.location ?? 'unknown'} — does not match required location ${binding.targetLocation}.`,
          locationCorrect: false,
          timestamp: wrongLocation.timestamp,
        };
      }

      const ineffective = matches.find((i) => binding.requireEffective && !i.effective);
      if (ineffective) {
        return {
          outcome: 'incorrect',
          evidenceDetail: `${ineffective.type} was recorded but was not effective.`,
          locationCorrect: locationOk(ineffective.location),
          timestamp: ineffective.timestamp,
        };
      }

      return {
        outcome: 'missed',
        evidenceDetail: `Required intervention not recorded: ${actions.join(', ')}.`,
        locationCorrect: undefined,
      };
    }

    case 'reassessment_after_intervention': {
      const after = binding.afterAction;
      const reassess = binding.requiredActions?.[0];
      if (!after || !reassess) {
        return {
          outcome: 'not_applicable',
          evidenceDetail: 'Reassessment binding is incomplete.',
        };
      }
      const interventionAt = state.events.find((e) => e.action === after)?.timestamp;
      if (interventionAt === undefined) {
        return {
          outcome: 'missed',
          evidenceDetail: `No ${after} event found to reassess.`,
        };
      }
      const reassessEvent = state.events.find(
        (e) => e.action === reassess && e.timestamp >= interventionAt,
      );
      return {
        outcome: reassessEvent ? 'completed' : 'missed',
        evidenceDetail: reassessEvent
          ? `${reassess} recorded after ${after}.`
          : `${reassess} was not recorded after ${after}.`,
        timestamp: reassessEvent?.timestamp,
      };
    }

    case 'no_wrong_location_intervention': {
      const actions = binding.requiredActions ?? [];
      const wrong = state.interventions.find((i) => {
        if (!actions.includes(i.type)) return false;
        if (!binding.requireLocation || !binding.targetLocation) return false;
        return !locationsMatch(i.location, binding.targetLocation);
      });
      return {
        outcome: wrong ? 'incorrect' : 'completed',
        evidenceDetail: wrong
          ? `${wrong.type} at ${wrong.location ?? 'unknown'} is not the required location ${binding.targetLocation}.`
          : 'No wrong-location intervention recorded for this binding.',
        locationCorrect: !wrong,
        timestamp: wrong?.timestamp,
      };
    }
  }
}

export function evaluateScenarioTcccRules(
  state: SimulationState,
  scenario: ScenarioDefinition,
): { results: TcccRuleResult[]; unknownRuleIds: string[] } {
  const ids = scenario.requiredTcccRules ?? [];
  const { found, unknown } = resolveTcccRuleIds(ids);
  const bindings = scenario.tcccEvidenceBindings ?? [];
  const bindingsByRule = new Map<string, TcccEvidenceBinding[]>();
  for (const binding of bindings) {
    const list = bindingsByRule.get(binding.ruleId) ?? [];
    list.push(binding);
    bindingsByRule.set(binding.ruleId, list);
  }

  const results: TcccRuleResult[] = found.map((rule) => {
    const ruleBindings = bindingsByRule.get(rule.id) ?? [];
    if (ruleBindings.length === 0) {
      return {
        ruleId: rule.id,
        title: rule.title,
        phase: rule.phase,
        march: rule.march,
        outcome: 'not_applicable',
        verified: rule.verified,
        verificationStatus: rule.verificationStatus,
        expectedBehavior: rule.expectedBehavior,
        evidenceDetail: 'No scenario evidence binding is configured for this rule.',
        guidelineVersionId: rule.guidelineVersionId,
        source: rule.source,
      };
    }

    const evaluations = ruleBindings.map((binding) => evaluateTcccEvidenceBinding(state, binding));
    const incorrect = evaluations.find((e) => e.outcome === 'incorrect');
    const missed = evaluations.find((e) => e.outcome === 'missed');
    const completed = evaluations.every((e) => e.outcome === 'completed' || e.outcome === 'not_applicable');
    const picked = incorrect ?? missed ?? evaluations[0];

    let outcome: TcccRuleResult['outcome'] = 'missed';
    if (incorrect) outcome = 'incorrect';
    else if (evaluations.every((e) => e.outcome === 'not_applicable')) outcome = 'not_applicable';
    else if (completed) outcome = 'completed';

    return {
      ruleId: rule.id,
      title: rule.title,
      phase: rule.phase,
      march: rule.march,
      outcome,
      verified: rule.verified,
      verificationStatus: rule.verificationStatus,
      expectedBehavior: rule.expectedBehavior,
      evidenceDetail: picked?.evidenceDetail ?? 'No evidence.',
      guidelineVersionId: rule.guidelineVersionId,
      source: rule.source,
      locationCorrect: picked?.locationCorrect,
      timestamp: picked?.timestamp,
    };
  });

  for (const id of unknown) {
    results.push({
      ruleId: id,
      title: 'Unknown TCCC rule ID',
      outcome: 'unresolved_rule',
      verified: false,
      verificationStatus: 'TODO_TCCC_VERIFICATION_REQUIRED',
      expectedBehavior: 'TODO_TCCC_VERIFICATION_REQUIRED',
      evidenceDetail: `Scenario referenced unknown rule ID ${id}. Ignored for scoring.`,
      guidelineVersionId: scenario.tcccGuidelineVersionId ?? 'unknown',
    });
  }

  return { results, unknownRuleIds: unknown };
}

export function getScenarioTcccGuidelineVersion(scenario: ScenarioDefinition) {
  const id = scenario.tcccGuidelineVersionId;
  return id ? getTcccGuidelineVersion(id) : undefined;
}

/**
 * Intentionally no function that accepts a TcccRule and returns SimulationState.
 * Guideline data is read-only. Physiology changes belong in the simulation engine.
 */
export function tcccRulesMustNotMutateState(): void {
  return;
}
