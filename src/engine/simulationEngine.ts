import type {
  StructuredAction,
  SimulationState,
  SimulationEvent,
  ScenarioDefinition,
  MarchLetter,
  MarchStatus,
} from './types';
import { locationsMatch, type AnatomicalLocation } from '@/lib/locations';
import { generateAAR } from './aar';

let eventCounter = 0;

function nextEventId(): string {
  eventCounter += 1;
  return `evt-${eventCounter}-${Date.now()}`;
}

function createEvent(
  state: SimulationState,
  action: StructuredAction['type'],
  result: SimulationEvent['result'],
  message: string,
  extras?: Partial<SimulationEvent>,
): SimulationEvent {
  return {
    id: nextEventId(),
    timestamp: state.elapsedSeconds,
    action,
    location: extras?.location,
    result,
    message,
    ...extras,
  };
}

function assessmentKey(type: StructuredAction['type'], location?: AnatomicalLocation): string {
  if (type === 'expose' && location) return `expose_${location}`;
  if (type === 'check_penetrating_chest_trauma') return 'check_penetrating_chest_trauma';
  return type;
}

function discoverFindings(
  state: SimulationState,
  assessmentKey: string,
): { state: SimulationState; messages: string[]; discovered: string[] } {
  const messages: string[] = [];
  const discovered: string[] = [];
  let discoveredIds = [...state.discoveredFindingIds];
  let findings = state.findings.map((f) => ({ ...f }));

  for (const finding of findings) {
    if (finding.discovered) continue;
    if (!finding.discoveryConditions.includes(assessmentKey)) continue;

    finding.discovered = true;
    finding.hidden = false;
    discoveredIds.push(finding.id);
    discovered.push(finding.id);
    messages.push(finding.observationText);
  }

  return {
    state: { ...state, findings, discoveredFindingIds: discoveredIds },
    messages,
    discovered,
  };
}

function updateMarchStatus(state: SimulationState): Record<MarchLetter, MarchStatus> {
  const march = { ...state.marchStatus };

  const updateLetter = (letter: MarchLetter, treatedCheck: boolean) => {
    const relatedFindings = state.findings.filter((f) => f.category === letter);
    const anyDiscovered = relatedFindings.some((f) => state.discoveredFindingIds.includes(f.id));
    const anyAssessed = relatedFindings.some((f) =>
      f.discoveryConditions.some((c) => state.performedAssessments.includes(c)),
    );

    if (treatedCheck) {
      march[letter] = 'TREATED';
    } else if (anyDiscovered) {
      march[letter] = 'CONCERN';
    } else if (anyAssessed) {
      march[letter] = 'ASSESSING';
    }
  };

  const hemorrhageControlled = state.injuries
    .filter((i) => i.severity === 'critical' || i.requiresTourniquet)
    .every((i) => i.controlled);

  updateLetter('M', hemorrhageControlled);
  updateLetter(
    'A',
    state.performedAssessments.includes('assess_airway') && state.physiology.airwayPatent,
  );
  updateLetter(
    'R',
    state.chestSealed || !state.discoveredFindingIds.includes('finding-right-chest-wound'),
  );

  const circulationComplete = state.salineLockInitiated && state.txaAdministered;
  updateLetter('C', circulationComplete);
  if (march.C === 'CONCERN' && circulationComplete) {
    march.C = 'STABLE';
  }

  const hypothermiaPrevented =
    state.hypothermiaPreventionApplied ||
    state.performedAssessments.includes('prevent_hypothermia');
  updateLetter('H', hypothermiaPrevented);
  if (march.H === 'CONCERN' && hypothermiaPrevented) {
    march.H = 'STABLE';
  }

  if (march.M === 'CONCERN' && hemorrhageControlled) march.M = 'STABLE';

  return march;
}

function getCasualtyDialogue(state: SimulationState): string | undefined {
  const { consciousness, respiratoryDistress, bloodLossMl } = state.physiology;

  if (consciousness === 'unresponsive') return undefined;

  if (bloodLossMl > 1200) {
    return 'Casualty (weakly): "Cold… so cold…"';
  }
  if (respiratoryDistress) {
    return 'Casualty (gasping): "Can\'t… breathe…"';
  }
  if (state.discoveredFindingIds.includes('finding-left-leg-hemorrhage') && !state.hemorrhageControlledAt) {
    return 'Casualty (screaming): "Fuck—that hurts! My leg!"';
  }
  if (consciousness === 'confused' || consciousness === 'verbal') {
    return 'Casualty: "Where… where are we?"';
  }

  return undefined;
}

function applyDeterioration(state: SimulationState, scenario: ScenarioDefinition, deltaSeconds: number): SimulationState {
  let current = { ...state };

  for (const rule of scenario.deteriorationRules) {
    if (!rule.condition(current)) continue;

    const ticks = Math.floor(deltaSeconds / rule.intervalSeconds);
    for (let i = 0; i < ticks; i++) {
      if (!rule.condition(current)) break;
      const changes = rule.apply(current);
      current = {
        ...current,
        ...changes,
        physiology: changes.physiology ?? current.physiology,
        injuries: changes.injuries ?? current.injuries,
      };
    }
  }

  return current;
}

function checkCompletion(
  state: SimulationState,
  scenario: ScenarioDefinition,
): SimulationState {
  for (const criteria of scenario.failureCriteria) {
    if (criteria.check(state)) {
      const aar = generateAAR({ ...state, status: 'failed' }, scenario);
      return {
        ...state,
        status: 'failed',
        completionReason: criteria.description,
        aar,
      };
    }
  }

  for (const criteria of scenario.completionCriteria) {
    if (criteria.check(state)) {
      const aar = generateAAR({ ...state, status: 'completed' }, scenario);
      return {
        ...state,
        status: 'completed',
        completionReason: criteria.description,
        aar,
      };
    }
  }

  return state;
}

export interface ActionResult {
  state: SimulationState;
  messages: string[];
  clarification?: string;
}

export function executeAction(
  state: SimulationState,
  action: StructuredAction,
  scenario: ScenarioDefinition,
): ActionResult {
  if (state.status !== 'active') {
    return { state, messages: ['Scenario has ended. Review your After Action Report.'] };
  }

  const timeCost = scenario.actionTimeCosts[action.type] ?? 10;
  let newState: SimulationState = {
    ...state,
    elapsedSeconds: state.elapsedSeconds + timeCost,
  };

  // Apply deterioration for elapsed time
  newState = applyDeterioration(newState, scenario, timeCost);

  const messages: string[] = [];
  const key = assessmentKey(action.type, action.location);
  let performed = [...newState.performedAssessments];
  if (!performed.includes(key)) performed.push(key);
  if (!performed.includes(action.type)) performed.push(action.type);
  newState = { ...newState, performedAssessments: performed };

  switch (action.type) {
    case 'check_responsiveness': {
      messages.push(
        `You attempt to get the casualty's attention. The casualty groans and moves slightly — responsive to verbal stimuli but appears confused and in distress.`,
      );
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'info', 'Responsiveness assessed — casualty responds to verbal stimuli.'),
      ];
      break;
    }

    case 'assess_massive_hemorrhage': {
      messages.push(
        `You perform a rapid assessment for massive hemorrhage. Visible blood is present on the casualty's clothing, particularly around the lower body.`,
      );
      const discovery = discoverFindings(newState, 'assess_massive_hemorrhage');
      newState = discovery.state;
      messages.push(...discovery.messages);
      if (discovery.discovered.length > 0 && !newState.massiveHemorrhageIdentifiedAt) {
        newState.massiveHemorrhageIdentifiedAt = newState.elapsedSeconds;
      }
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, discovery.discovered.length ? 'discovery' : 'info', 'Massive hemorrhage assessment performed.', {
          findingsDiscovered: discovery.discovered,
        }),
      ];
      break;
    }

    case 'blood_sweep': {
      messages.push(`You perform a blood sweep across the casualty's body.`);
      const discovery = discoverFindings(newState, 'blood_sweep');
      newState = discovery.state;
      messages.push(...discovery.messages);
      if (discovery.discovered.includes('finding-left-leg-hemorrhage') && !newState.massiveHemorrhageIdentifiedAt) {
        newState.massiveHemorrhageIdentifiedAt = newState.elapsedSeconds;
      }
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, discovery.discovered.length ? 'discovery' : 'info', 'Blood sweep completed.', {
          findingsDiscovered: discovery.discovered,
        }),
      ];
      break;
    }

    case 'expose': {
      const loc = action.location!;
      messages.push(`You expose the casualty's ${loc.replace(/_/g, ' ')}.`);
      const exposeKey = `expose_${loc}`;
      if (!newState.performedAssessments.includes(exposeKey)) {
        newState.performedAssessments = [...newState.performedAssessments, exposeKey];
      }
      // Also trigger parent region discoveries
      const discovery = discoverFindings(newState, exposeKey);
      newState = discovery.state;
      // Generic expose for leg
      if (loc.includes('leg')) {
        const legDiscovery = discoverFindings(newState, 'expose_left_leg');
        newState = legDiscovery.state;
        messages.push(...legDiscovery.messages);
      }
      if (loc.includes('chest') || loc === 'chest') {
        const chestDiscovery = discoverFindings(newState, 'expose_chest');
        newState = chestDiscovery.state;
        messages.push(...chestDiscovery.messages);
      }
      messages.push(...discovery.messages);
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'info', `Exposed ${loc.replace(/_/g, ' ')}.`, { location: loc }),
      ];
      break;
    }

    case 'apply_tourniquet': {
      const loc = action.location!;
      const targetInjury = newState.injuries.find(
        (i) => i.requiresTourniquet && locationsMatch(loc, i.location),
      );
      const wrongSideInjury = newState.injuries.find(
        (i) => i.requiresTourniquet && !locationsMatch(loc, i.location),
      );

      if (!targetInjury && wrongSideInjury) {
        messages.push(
          `You apply a tourniquet to the ${loc.replace(/_/g, ' ')}. Bleeding continues elsewhere — this is not the source of major hemorrhage.`,
        );
        newState.interventions = [
          ...newState.interventions,
          {
            id: nextEventId(),
            type: action.type,
            location: loc,
            timestamp: newState.elapsedSeconds,
            effective: false,
            parameters: action.parameters,
          },
        ];
        newState.events = [
          ...newState.events,
          createEvent(newState, action.type, 'failure', 'Tourniquet applied to wrong extremity — ineffective.', {
            location: loc,
            interventionEffective: false,
          }),
        ];
        break;
      }

      if (!targetInjury) {
        messages.push(
          `You apply a tourniquet to the ${loc.replace(/_/g, ' ')}. No significant hemorrhage is controlled at this location.`,
        );
        newState.interventions = [
          ...newState.interventions,
          {
            id: nextEventId(),
            type: action.type,
            location: loc,
            timestamp: newState.elapsedSeconds,
            effective: false,
          },
        ];
        break;
      }

      if (!newState.discoveredFindingIds.includes('finding-left-leg-hemorrhage')) {
        messages.push(
          `You apply a tourniquet to the ${loc.replace(/_/g, ' ')}. Without proper exposure, placement may be suboptimal.`,
        );
      }

      const highAndTight = action.parameters?.placement === 'high_and_tight' || /high/i.test(action.rawInput);
      newState.injuries = newState.injuries.map((i) =>
        i.id === targetInjury.id ? { ...i, controlled: true, bleedingRateMlPerMin: 0 } : i,
      );
      newState.tourniquetsApplied = [...newState.tourniquetsApplied, loc];
      newState.tourniquetAppliedAt = newState.elapsedSeconds;
      newState.hemorrhageControlledAt = newState.elapsedSeconds;
      newState.interventions = [
        ...newState.interventions,
        {
          id: nextEventId(),
          type: action.type,
          location: loc,
          timestamp: newState.elapsedSeconds,
          effective: true,
          parameters: action.parameters,
          notes: highAndTight ? 'High and tight placement' : 'Standard placement',
        },
      ];

      messages.push(
        `You apply a tourniquet ${highAndTight ? 'high and tight' : ''} to the ${loc.replace(/_/g, ' ')}. The pulsatile bleeding slows and stops.`,
      );
      messages.push(`The casualty screams in pain, then becomes slightly less agitated as bleeding slows.`);

      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'success', 'Tourniquet applied — hemorrhage controlled.', {
          location: loc,
          interventionEffective: true,
          stateChanges: ['hemorrhage_controlled'],
        }),
      ];
      break;
    }

    case 'pack_wound': {
      const loc = action.location!;
      const injury = newState.injuries.find((i) => i.packable && locationsMatch(loc, i.location));
      if (!injury) {
        messages.push(`No packable wound identified at ${loc.replace(/_/g, ' ')}.`);
        break;
      }
      newState.injuries = newState.injuries.map((i) =>
        i.id === injury.id ? { ...i, controlled: true, bleedingRateMlPerMin: 0 } : i,
      );
      newState.woundPacked = [...newState.woundPacked, injury.id];
      newState.interventions = [
        ...newState.interventions,
        {
          id: nextEventId(),
          type: action.type,
          location: loc,
          timestamp: newState.elapsedSeconds,
          effective: true,
        },
      ];
      messages.push(`You pack the wound at the ${loc.replace(/_/g, ' ')}. Oozing slows significantly.`);
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'success', 'Wound packed successfully.', { location: loc }),
      ];
      break;
    }

    case 'apply_chest_seal': {
      const loc = action.location!;
      const chestInjury = newState.injuries.find(
        (i) => i.type === 'penetrating_chest_wound' && locationsMatch(loc, i.location),
      );
      if (!chestInjury) {
        messages.push(`No open chest wound found on the ${loc.replace(/_/g, ' ')}.`);
        newState.interventions = [
          ...newState.interventions,
          {
            id: nextEventId(),
            type: action.type,
            location: loc,
            timestamp: newState.elapsedSeconds,
            effective: false,
          },
        ];
        break;
      }
      if (!newState.discoveredFindingIds.includes('finding-right-chest-wound')) {
        messages.push(`You attempt to seal the chest, but the wound has not been adequately exposed or identified.`);
        break;
      }
      newState.chestSealed = true;
      newState.injuries = newState.injuries.map((i) =>
        i.id === chestInjury.id ? { ...i, controlled: true, bleedingRateMlPerMin: 0 } : i,
      );
      newState.physiology = {
        ...newState.physiology,
        respiratoryDistress: false,
        respiratoryRate: Math.max(newState.physiology.respiratoryRate - 4, 16),
      };
      messages.push(
        `You apply an occlusive chest seal to the ${loc.replace(/_/g, ' ')}. The sucking sound stops. Respirations appear less labored.`,
      );
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'success', 'Chest seal applied.', { location: loc }),
      ];
      break;
    }

    case 'assess_airway':
    case 'reassess_airway': {
      messages.push(
        newState.physiology.airwayPatent
          ? `Airway appears patent. Casualty is able to speak in short phrases, though voice is strained.`
          : `Airway compromise noted — casualty unable to maintain clear airway.`,
      );
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'info', 'Airway assessed.'),
      ];
      break;
    }

    case 'assess_breathing':
    case 'check_respirations':
    case 'reassess_breathing': {
      const discovery = discoverFindings(newState, 'assess_breathing');
      newState = discovery.state;
      messages.push(
        `Respirations are ${newState.physiology.respiratoryRate}/min. ${newState.physiology.respiratoryDistress ? 'Breathing is labored.' : 'Breathing appears adequate.'}`,
      );
      messages.push(...discovery.messages);
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'info', 'Breathing assessed.', {
          findingsDiscovered: discovery.discovered,
        }),
      ];
      break;
    }

    case 'check_penetrating_chest_trauma': {
      const discovery = discoverFindings(newState, 'check_penetrating_chest_trauma');
      newState = discovery.state;
      messages.push(`You assess the chest for penetrating trauma.`);
      messages.push(...discovery.messages);
      if (discovery.messages.length === 0) {
        messages.push(`No penetrating chest trauma identified on initial inspection of exposed areas.`);
      }
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, discovery.discovered.length ? 'discovery' : 'info', 'Chest trauma assessment.', {
          location: action.location,
          findingsDiscovered: discovery.discovered,
        }),
      ];
      break;
    }

    case 'assess_circulation':
    case 'check_radial_pulse':
    case 'reassess_circulation': {
      const discovery = discoverFindings(newState, 'check_radial_pulse');
      newState = discovery.state;
      const pulse = newState.physiology.radialPulsePresent
        ? `Radial pulse is ${newState.physiology.radialPulseQuality}.`
        : 'Radial pulse is absent.';
      messages.push(pulse);
      messages.push(`Skin is ${newState.physiology.skinSigns.toLowerCase()}.`);
      messages.push(...discovery.messages);
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'info', 'Circulation assessed.', {
          findingsDiscovered: discovery.discovered,
        }),
      ];
      break;
    }

    case 'reassess_hemorrhage': {
      const criticalInjury = newState.injuries.find((i) => i.requiresTourniquet);
      if (criticalInjury?.controlled) {
        messages.push(`Reassessment: No active bleeding from the left lower leg. Tourniquet appears effective.`);
      } else if (criticalInjury) {
        messages.push(`Reassessment: Severe bleeding continues from the left lower leg. Hemorrhage is NOT controlled.`);
      } else {
        messages.push(`Reassessment: No uncontrolled massive hemorrhage identified.`);
      }
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, criticalInjury?.controlled ? 'success' : 'info', 'Hemorrhage reassessed.'),
      ];
      break;
    }

    case 'reassess_general': {
      messages.push(`You perform a general reassessment of the casualty's condition.`);
      messages.push(
        `Mental status: ${newState.physiology.mentalStatusNote}. Pulse: ${newState.physiology.radialPulsePresent ? newState.physiology.radialPulseQuality : 'absent'}.`,
      );
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'info', 'General reassessment completed.'),
      ];
      break;
    }

    case 'request_evacuation': {
      messages.push(`You request evacuation. MEDEVAC coordination initiated.`);
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'success', 'Evacuation requested.'),
      ];
      break;
    }

    case 'end_scenario': {
      messages.push(`You end the scenario and prepare the casualty for handoff.`);
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'success', 'Scenario ended by trainee.'),
      ];
      break;
    }

    case 'initiate_iv_access': {
      if (newState.ivAccessInitiated || newState.salineLockInitiated) {
        messages.push(
          newState.ivAccessInitiated
            ? 'IV access is already initiated.'
            : 'Vascular access is already in place via saline lock.',
        );
      } else {
        newState.ivAccessInitiated = true;
        newState.interventions = [
          ...newState.interventions,
          {
            id: nextEventId(),
            type: action.type,
            timestamp: newState.elapsedSeconds,
            effective: true,
          },
        ];
        messages.push('You initiate IV access.');
      }
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'success', 'IV access initiated.', {
          interventionEffective: true,
          stateChanges: ['iv_access'],
        }),
      ];
      break;
    }

    case 'initiate_saline_lock': {
      if (newState.salineLockInitiated) {
        messages.push('A saline lock is already in place.');
      } else {
        newState.salineLockInitiated = true;
        newState.interventions = [
          ...newState.interventions,
          {
            id: nextEventId(),
            type: action.type,
            timestamp: newState.elapsedSeconds,
            effective: true,
          },
        ];
        messages.push('You initiate a saline lock.');
      }
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'success', 'Saline lock initiated.', {
          interventionEffective: true,
          stateChanges: ['saline_lock'],
        }),
      ];
      break;
    }

    case 'administer_txa': {
      const doseGrams = typeof action.parameters?.doseGrams === 'number' ? action.parameters.doseGrams : undefined;
      if (!newState.salineLockInitiated) {
        messages.push('Initiate a saline lock before administering TXA.');
        newState.events = [
          ...newState.events,
          createEvent(newState, action.type, 'failure', 'TXA withheld — saline lock not initiated.'),
        ];
        break;
      }
      if (doseGrams !== 2) {
        messages.push('Specify the TXA dose. Use: administer 2 grams TXA.');
        newState.events = [
          ...newState.events,
          createEvent(newState, action.type, 'failure', 'TXA withheld — 2 gram dose not specified.'),
        ];
        break;
      }
      if (newState.txaAdministered) {
        messages.push('2 grams of TXA has already been administered.');
        newState.events = [
          ...newState.events,
          createEvent(newState, action.type, 'info', 'TXA already administered.', {
            interventionEffective: true,
            stateChanges: ['txa'],
          }),
        ];
        break;
      }
      newState.txaAdministered = true;
      newState.interventions = [
        ...newState.interventions,
        {
          id: nextEventId(),
          type: action.type,
          timestamp: newState.elapsedSeconds,
          effective: true,
          parameters: { doseGrams: 2 },
        },
      ];
      messages.push('You administer 2 grams of TXA through the saline lock.');
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'success', '2 grams TXA administered through saline lock.', {
          interventionEffective: true,
          stateChanges: ['txa'],
        }),
      ];
      break;
    }

    case 'prevent_hypothermia': {
      if (newState.hypothermiaPreventionApplied) {
        messages.push(`Hypothermia prevention measures are already in place.`);
      } else {
        newState.hypothermiaPreventionApplied = true;
        newState.interventions = [
          ...newState.interventions,
          {
            id: nextEventId(),
            type: action.type,
            timestamp: newState.elapsedSeconds,
            effective: true,
            notes: 'Cover / insulation applied',
          },
        ];
        messages.push(
          `You cover the casualty and place insulation between the casualty and the ground. Exposed skin is protected.`,
        );
      }
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'success', 'Hypothermia prevention applied.', {
          interventionEffective: true,
          stateChanges: ['hypothermia_prevention'],
        }),
      ];
      break;
    }

    default: {
      messages.push(`Action noted: ${action.type.replace(/_/g, ' ')}.`);
      newState.events = [
        ...newState.events,
        createEvent(newState, action.type, 'info', `Performed ${action.type.replace(/_/g, ' ')}.`),
      ];
    }
  }

  newState.marchStatus = updateMarchStatus(newState);

  const dialogue = getCasualtyDialogue(newState);
  if (dialogue) {
    newState.dialogueHistory = [...newState.dialogueHistory, dialogue];
  }

  newState = checkCompletion(newState, scenario);

  return { state: newState, messages };
}

export function tickSimulation(
  state: SimulationState,
  scenario: ScenarioDefinition,
  seconds: number,
): SimulationState {
  if (state.status !== 'active') return state;

  let newState = { ...state, elapsedSeconds: state.elapsedSeconds + seconds };
  newState = applyDeterioration(newState, scenario, seconds);
  newState.marchStatus = updateMarchStatus(newState);
  newState = checkCompletion(newState, scenario);
  return newState;
}

export function resetEventCounter(): void {
  eventCounter = 0;
}
