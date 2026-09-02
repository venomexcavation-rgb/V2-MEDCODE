import type {
  ScenarioDefinition,
  SimulationState,
  CheckResult,
  MarchLetter,
  MarchStatus,
} from '@/engine/types';
import { locationsMatch } from '@/lib/locations';

const INITIAL_MARCH: Record<MarchLetter, MarchStatus> = {
  M: 'UNKNOWN',
  A: 'UNKNOWN',
  R: 'UNKNOWN',
  C: 'UNKNOWN',
  H: 'UNKNOWN',
};

function makeCheck(
  id: string,
  label: string,
  category: string,
  maxPoints: number,
  passed: boolean,
  critical: boolean,
  detail: string,
  teaching: string,
): CheckResult {
  return {
    id,
    label,
    category,
    points: passed ? maxPoints : 0,
    maxPoints,
    passed,
    critical,
    detail,
    teaching,
  };
}

export const scenario001: ScenarioDefinition = {
  id: 'SCENARIO-001',
  title: 'Dismounted Blast Casualty',
  description:
    'A dismounted patrol experiences an explosive blast. You reach one casualty with limited initial information.',
  environment: 'Urban',
  difficulty: 'Intermediate',
  mechanism: 'Blast / Penetrating Trauma',
  learningObjectives: [
    'Identify and control life-threatening hemorrhage',
    'Apply MARCH prioritization under time pressure',
    'Perform systematic assessment and reassessment',
    'Recognize shock progression',
  ],
  estimatedMinutes: '8–12 min',
  trainingFocus: ['Massive Hemorrhage', 'Shock', 'MARCH Sequencing'],
  initialPresentation:
    'Casualty found supine approximately 15 meters from blast site. Dust and debris visible. Casualty is moving but appears distressed.',
  casualtyDemographics: 'UNKNOWN MALE — Approx. 25–30 years',
  initialState: {
    scenarioId: 'SCENARIO-001',
    elapsedSeconds: 0,
    status: 'active',
    physiology: {
      consciousness: 'verbal',
      airwayPatent: true,
      respiratoryRate: 22,
      respiratoryDistress: true,
      radialPulsePresent: true,
      radialPulseQuality: 'strong',
      bloodLossMl: 200,
      shockState: 'compensated',
      skinSigns: 'Pale, diaphoretic',
      mentalStatusNote: 'Agitated, oriented x1',
    },
    injuries: [
      {
        id: 'inj-left-lower-leg-amputation',
        location: 'left_lower_leg',
        type: 'traumatic_partial_amputation',
        severity: 'critical',
        bleedingRateMlPerMin: 80,
        controlled: false,
        packable: false,
        requiresTourniquet: true,
        hiddenUntil: ['expose_left_leg', 'blood_sweep', 'assess_massive_hemorrhage'],
        description: 'Traumatic partial amputation left lower leg with arterial hemorrhage',
        discoveryDescription:
          'There is a traumatic partial amputation approximately 10 cm below the knee with severe pulsatile bleeding.',
      },
      {
        id: 'inj-right-chest-penetrating',
        location: 'right_chest',
        type: 'penetrating_chest_wound',
        severity: 'moderate',
        bleedingRateMlPerMin: 5,
        controlled: false,
        packable: false,
        requiresTourniquet: false,
        hiddenUntil: ['expose_chest', 'check_penetrating_chest_trauma'],
        description: 'Small penetrating chest wound with possible open pneumothorax',
        discoveryDescription:
          'A small penetrating wound is visible on the right chest wall with a sucking sound on inspiration.',
      },
      {
        id: 'inj-shrapnel-left-thigh',
        location: 'left_thigh',
        type: 'shrapnel_laceration',
        severity: 'minor',
        bleedingRateMlPerMin: 10,
        controlled: false,
        packable: true,
        requiresTourniquet: false,
        hiddenUntil: ['expose_left_leg', 'blood_sweep'],
        description: 'Superficial shrapnel laceration left thigh',
        discoveryDescription:
          'Multiple small shrapnel lacerations on the left thigh with oozing bleeding.',
      },
    ],
    findings: [
      {
        id: 'finding-left-leg-hemorrhage',
        label: 'Left lower leg arterial hemorrhage',
        category: 'M',
        location: 'left_lower_leg',
        hidden: true,
        discovered: false,
        discoveryConditions: ['expose_left_leg', 'blood_sweep', 'assess_massive_hemorrhage'],
        observationText:
          'Severe pulsatile bleeding from partial amputation of the left lower leg.',
        marchImpact: 'CONCERN',
      },
      {
        id: 'finding-right-chest-wound',
        label: 'Penetrating chest wound (right)',
        category: 'R',
        location: 'right_chest',
        hidden: true,
        discovered: false,
        discoveryConditions: ['expose_chest', 'check_penetrating_chest_trauma'],
        observationText: 'Penetrating wound on right chest with sucking chest wound signs.',
        marchImpact: 'CONCERN',
      },
      {
        id: 'finding-left-thigh-shrapnel',
        label: 'Left thigh shrapnel wounds',
        category: 'M',
        location: 'left_thigh',
        hidden: true,
        discovered: false,
        discoveryConditions: ['expose_left_leg', 'blood_sweep'],
        observationText: 'Superficial shrapnel wounds on left thigh with oozing.',
        marchImpact: 'CONCERN',
      },
      {
        id: 'finding-respiratory-distress',
        label: 'Respiratory distress',
        category: 'R',
        hidden: false,
        discovered: false,
        discoveryConditions: ['assess_breathing', 'check_respirations'],
        observationText: 'Respirations are rapid and labored at approximately 22/min.',
        marchImpact: 'CONCERN',
      },
      {
        id: 'finding-environmental-exposure',
        label: 'Environmental exposure',
        category: 'H',
        hidden: false,
        discovered: false,
        discoveryConditions: ['expose_left_leg', 'expose_chest', 'expose_left_lower_leg', 'prevent_hypothermia'],
        observationText:
          'The casualty is exposed to the environment. Clothing is displaced and the ground is cool.',
        marchImpact: 'CONCERN',
      },
      {
        id: 'finding-compensated-shock',
        label: 'Compensated shock signs',
        category: 'C',
        hidden: false,
        discovered: false,
        discoveryConditions: ['check_radial_pulse', 'assess_circulation'],
        observationText: 'Radial pulse is present but rapid. Skin is pale and cool.',
        marchImpact: 'CONCERN',
      },
    ],
    tourniquetsApplied: [],
    chestSealed: false,
    woundPacked: [],
    hypothermiaPreventionApplied: false,
    ivAccessInitiated: false,
    salineLockInitiated: false,
  },
  deteriorationRules: [
    {
      id: 'det-hemorrhage',
      description: 'Untreated arterial hemorrhage causes blood loss and shock progression',
      intervalSeconds: 15,
      condition: (state) =>
        state.injuries.some((i) => i.requiresTourniquet && !i.controlled && i.bleedingRateMlPerMin > 0),
      apply: (state) => {
        const injury = state.injuries.find((i) => i.id === 'inj-left-lower-leg-amputation');
        if (!injury || injury.controlled) return {};

        const bloodLoss = state.physiology.bloodLossMl + injury.bleedingRateMlPerMin * 0.25;
        let shockState = state.physiology.shockState;
        let radialQuality = state.physiology.radialPulseQuality;
        let consciousness = state.physiology.consciousness;

        if (bloodLoss > 800) shockState = 'decompensated';
        else if (bloodLoss > 500) shockState = 'compensated';

        if (bloodLoss > 1000) radialQuality = 'absent';
        else if (bloodLoss > 700) radialQuality = 'weak';

        if (bloodLoss > 1200) consciousness = 'pain';
        if (bloodLoss > 1500) consciousness = 'unresponsive';

        return {
          physiology: {
            ...state.physiology,
            bloodLossMl: bloodLoss,
            shockState,
            radialPulsePresent: radialQuality !== 'absent',
            radialPulseQuality: radialQuality,
            consciousness,
            mentalStatusNote:
              consciousness === 'unresponsive'
                ? 'Unresponsive to verbal stimuli'
                : consciousness === 'pain'
                  ? 'Responds only to painful stimuli'
                  : 'Increasingly agitated and confused',
          },
        };
      },
    },
    {
      id: 'det-chest-respiratory',
      description: 'Untreated open chest wound worsens respiratory distress',
      intervalSeconds: 30,
      condition: (state) => {
        const chestInjury = state.injuries.find((i) => i.id === 'inj-right-chest-penetrating');
        return !!chestInjury && !chestInjury.controlled && !state.chestSealed;
      },
      apply: (state) => ({
        physiology: {
          ...state.physiology,
          respiratoryRate: Math.min(state.physiology.respiratoryRate + 2, 40),
          respiratoryDistress: true,
        },
      }),
    },
    {
      id: 'det-failure',
      description: 'Critical blood loss leads to scenario failure',
      intervalSeconds: 5,
      condition: (state) => state.physiology.bloodLossMl >= 2000,
      apply: () => ({
        status: 'failed' as const,
        completionReason: 'Casualty exsanguinated due to uncontrolled hemorrhage.',
      }),
    },
  ],
  scoreRules: [
    {
      id: 'score-responsiveness',
      label: 'Responsiveness assessed',
      category: 'critical',
      maxPoints: 5,
      critical: false,
      detail: 'Initial responsiveness check performed.',
      teaching: 'Always establish responsiveness before detailed assessment.',
      evaluate: (state) =>
        makeCheck(
          'score-responsiveness',
          'Responsiveness assessed',
          'critical',
          5,
          state.performedAssessments.includes('check_responsiveness'),
          false,
          state.performedAssessments.includes('check_responsiveness')
            ? 'Responsiveness was assessed early in the encounter.'
            : 'Responsiveness was not formally assessed.',
          'Begin every encounter by checking responsiveness.',
        ),
    },
    {
      id: 'score-mh-identified',
      label: 'Massive hemorrhage identified',
      category: 'hemorrhage',
      maxPoints: 20,
      critical: true,
      detail: 'Life-threatening hemorrhage recognized.',
      teaching: 'M in MARCH — identify and control massive hemorrhage first.',
      evaluate: (state) =>
        makeCheck(
          'score-mh-identified',
          'Massive hemorrhage identified',
          'hemorrhage',
          20,
          state.discoveredFindingIds.includes('finding-left-leg-hemorrhage'),
          true,
          state.discoveredFindingIds.includes('finding-left-leg-hemorrhage')
            ? 'Left lower leg arterial hemorrhage was identified.'
            : 'Failed to identify life-threatening hemorrhage on left lower leg.',
          'Perform blood sweep and expose extremities to find hidden hemorrhage.',
        ),
    },
    {
      id: 'score-tq-applied',
      label: 'Tourniquet applied correctly',
      category: 'hemorrhage',
      maxPoints: 25,
      critical: true,
      detail: 'Tourniquet applied to correct extremity.',
      teaching: 'Apply tourniquet high and tight on the correct extremity for arterial hemorrhage.',
      evaluate: (state) => {
        const correctTq = state.interventions.some(
          (i) =>
            i.type === 'apply_tourniquet' &&
            i.effective &&
            i.location &&
            locationsMatch(i.location, 'left_lower_leg'),
        );
        return makeCheck(
          'score-tq-applied',
          'Tourniquet applied correctly',
          'hemorrhage',
          25,
          correctTq,
          true,
          correctTq
            ? 'Tourniquet effectively applied to left leg.'
            : 'Tourniquet not applied correctly to the bleeding extremity.',
          'For partial amputation with arterial bleed, apply tourniquet high and tight above the wound.',
        );
      },
    },
    {
      id: 'score-tq-timing',
      label: 'Timely hemorrhage control',
      category: 'prioritization',
      maxPoints: 15,
      critical: true,
      detail: 'Hemorrhage controlled within acceptable time.',
      teaching: 'Life-threatening hemorrhage must be controlled within minutes.',
      evaluate: (state) => {
        const timely =
          state.hemorrhageControlledAt !== undefined && state.hemorrhageControlledAt <= 180;
        return makeCheck(
          'score-tq-timing',
          'Timely hemorrhage control',
          'prioritization',
          15,
          timely,
          true,
          timely
            ? `Hemorrhage controlled at ${state.hemorrhageControlledAt}s.`
            : state.hemorrhageControlledAt
              ? `Hemorrhage control delayed until ${state.hemorrhageControlledAt}s.`
              : 'Hemorrhage was never controlled.',
          'Prioritize hemorrhage control immediately after identification.',
        );
      },
    },
    {
      id: 'score-reassess-hemorrhage',
      label: 'Hemorrhage reassessed after intervention',
      category: 'reassessment',
      maxPoints: 15,
      critical: false,
      detail: 'Bleeding effectiveness verified after tourniquet.',
      teaching: 'Always reassess after critical interventions.',
      evaluate: (state) => {
        const reassessed =
          state.tourniquetAppliedAt !== undefined &&
          state.events.some(
            (e) => e.action === 'reassess_hemorrhage' && e.timestamp > (state.tourniquetAppliedAt ?? 0),
          );
        return makeCheck(
          'score-reassess-hemorrhage',
          'Hemorrhage reassessed',
          'reassessment',
          15,
          reassessed,
          false,
          reassessed
            ? 'Hemorrhage was reassessed after tourniquet application.'
            : 'No hemorrhage reassessment after tourniquet.',
          'After applying a tourniquet, confirm bleeding has stopped.',
        );
      },
    },
    {
      id: 'score-airway',
      label: 'Airway assessed',
      category: 'airway',
      maxPoints: 10,
      critical: false,
      detail: 'Airway patency evaluated.',
      teaching: 'After hemorrhage control, assess and maintain airway.',
      evaluate: (state) =>
        makeCheck(
          'score-airway',
          'Airway assessed',
          'airway',
          10,
          state.performedAssessments.includes('assess_airway'),
          false,
          state.performedAssessments.includes('assess_airway')
            ? 'Airway assessment completed.'
            : 'Airway was not formally assessed.',
          'Assess airway patency after controlling immediate life threats.',
        ),
    },
    {
      id: 'score-breathing',
      label: 'Breathing assessed',
      category: 'respiration',
      maxPoints: 10,
      critical: false,
      detail: 'Respiratory status evaluated.',
      teaching: 'Assess breathing after airway — look for chest trauma.',
      evaluate: (state) =>
        makeCheck(
          'score-breathing',
          'Breathing assessed',
          'respiration',
          10,
          state.performedAssessments.includes('assess_breathing'),
          false,
          state.performedAssessments.includes('assess_breathing')
            ? 'Breathing assessment completed.'
            : 'Breathing was not formally assessed.',
          'Assess respiratory rate, effort, and chest wall integrity.',
        ),
    },
    {
      id: 'score-chest-seal',
      label: 'Chest wound managed',
      category: 'respiration',
      maxPoints: 15,
      critical: false,
      detail: 'Penetrating chest wound treated if discovered.',
      teaching: 'Apply occlusive dressing to open chest wounds on the correct side.',
      evaluate: (state) => {
        const discovered = state.discoveredFindingIds.includes('finding-right-chest-wound');
        if (!discovered) {
          return makeCheck(
            'score-chest-seal',
            'Chest wound managed',
            'respiration',
            15,
            true,
            false,
            'Chest wound not discovered — not scored against.',
            '',
          );
        }
        const sealed = state.chestSealed;
        return makeCheck(
          'score-chest-seal',
          'Chest wound managed',
          'respiration',
          15,
          sealed,
          false,
          sealed ? 'Chest seal applied to right chest wound.' : 'Penetrating chest wound not sealed.',
          'Apply chest seal to all discovered open chest wounds.',
        );
      },
    },
    {
      id: 'score-circulation',
      label: 'Circulation assessed',
      category: 'circulation',
      maxPoints: 10,
      critical: false,
      detail: 'Perfusion status evaluated.',
      teaching: 'Check radial pulse and perfusion after addressing immediate threats.',
      evaluate: (state) =>
        makeCheck(
          'score-circulation',
          'Circulation assessed',
          'circulation',
          10,
          state.performedAssessments.includes('check_radial_pulse') ||
            state.performedAssessments.includes('assess_circulation'),
          false,
          state.performedAssessments.includes('check_radial_pulse')
            ? 'Radial pulse assessed.'
            : 'Circulation not fully assessed.',
          'Assess radial pulse quality and skin signs for shock.',
        ),
    },
    {
      id: 'score-circulation-access',
      label: 'IV access or saline lock initiated',
      category: 'circulation',
      maxPoints: 15,
      critical: false,
      detail: 'Vascular access established with IV or saline lock.',
      teaching: 'Circulation is completed in this scenario by initiating IV access or a saline lock.',
      evaluate: (state) => {
        const done = state.ivAccessInitiated || state.salineLockInitiated;
        return makeCheck(
          'score-circulation-access',
          'IV access or saline lock initiated',
          'circulation',
          15,
          done,
          false,
          state.ivAccessInitiated
            ? 'IV access was initiated.'
            : state.salineLockInitiated
              ? 'Saline lock was initiated.'
              : 'Neither IV access nor a saline lock was initiated.',
          'Initiate IV access or a saline lock to complete circulation.',
        );
      },
    },
    {
      id: 'score-hypothermia-prevention',
      label: 'Hypothermia prevention performed',
      category: 'hypothermia',
      maxPoints: 10,
      critical: false,
      detail: 'Casualty covered / insulated after exposure.',
      teaching: 'After exposure and assessment, protect the casualty from further heat loss.',
      evaluate: (state) =>
        makeCheck(
          'score-hypothermia-prevention',
          'Hypothermia prevention performed',
          'hypothermia',
          10,
          state.hypothermiaPreventionApplied ||
            state.performedAssessments.includes('prevent_hypothermia'),
          false,
          state.hypothermiaPreventionApplied
            ? 'Hypothermia prevention measures were applied.'
            : 'No hypothermia prevention (cover / insulation) was recorded.',
          'Cover the casualty and insulate from the ground after necessary exposure.',
        ),
    },
    {
      id: 'score-wrong-side',
      label: 'No wrong-side intervention',
      category: 'critical',
      maxPoints: 10,
      critical: true,
      detail: 'Interventions applied to correct anatomical side.',
      teaching: 'Verify side and location before all interventions.',
      evaluate: (state) => {
        const wrongSideTq = state.interventions.some(
          (i) =>
            i.type === 'apply_tourniquet' &&
            i.location &&
            (i.location === 'right_leg' || i.location === 'right_thigh' || i.location === 'right_lower_leg'),
        );
        return makeCheck(
          'score-wrong-side',
          'No wrong-side intervention',
          'critical',
          10,
          !wrongSideTq,
          true,
          wrongSideTq
            ? 'Tourniquet applied to wrong extremity.'
            : 'No dangerous wrong-side interventions detected.',
          'Confirm correct side before applying tourniquet or chest interventions.',
        );
      },
    },
  ],
  completionCriteria: [
    {
      type: 'stabilization',
      description: 'Critical hemorrhage controlled and reassessed',
      check: (state) => {
        const hemorrhageControlled = state.injuries
          .filter((i) => i.requiresTourniquet)
          .every((i) => i.controlled);
        const reassessed = state.events.some((e) => e.action === 'reassess_hemorrhage');
        return hemorrhageControlled && reassessed;
      },
    },
    {
      type: 'evacuation',
      description: 'Evacuation requested after stabilization',
      check: (state) =>
        state.performedAssessments.includes('request_evacuation') &&
        state.injuries.filter((i) => i.requiresTourniquet).every((i) => i.controlled),
    },
    {
      type: 'evacuation',
      description: 'Trainee ended the scenario',
      check: (state) => state.performedAssessments.includes('end_scenario'),
    },
  ],
  failureCriteria: [
    {
      type: 'failure',
      description: 'Exsanguination',
      check: (state) => state.physiology.bloodLossMl >= 2000,
    },
    {
      type: 'time_limit',
      description: 'Time limit exceeded without stabilization',
      check: (state) =>
        state.elapsedSeconds >= 720 &&
        state.injuries.some((i) => i.requiresTourniquet && !i.controlled),
    },
  ],
  actionTimeCosts: {
    check_responsiveness: 8,
    assess_massive_hemorrhage: 12,
    blood_sweep: 18,
    expose: 15,
    visual_inspection: 10,
    assess_airway: 12,
    assess_breathing: 15,
    assess_circulation: 12,
    check_radial_pulse: 8,
    check_respirations: 10,
    check_penetrating_chest_trauma: 15,
    apply_tourniquet: 25,
    pack_wound: 30,
    apply_chest_seal: 20,
    needle_decompression: 25,
    reassess_hemorrhage: 10,
    reassess_breathing: 10,
    reassess_circulation: 10,
    prevent_hypothermia: 15,
    initiate_iv_access: 20,
    initiate_saline_lock: 15,
    reassess_airway: 8,
    reassess_general: 15,
    log_roll: 20,
    request_evacuation: 10,
    end_scenario: 5,
  },
  tcccGuidelineVersionId: 'tccc-pending-verification',
  requiredTcccRules: [
    'TCCC-CUF-001',
    'TCCC-M-001',
    'TCCC-M-002',
    'TCCC-A-001',
    'TCCC-R-001',
    'TCCC-R-002',
    'TCCC-C-001',
    'TCCC-H-001',
    'TCCC-TEV-001',
  ],
  tcccEvidenceBindings: [
    {
      ruleId: 'TCCC-CUF-001',
      kind: 'effective_intervention',
      requiredActions: ['apply_tourniquet'],
      requireEffective: true,
      requireLocation: true,
      targetLocation: 'left_lower_leg',
    },
    {
      ruleId: 'TCCC-M-001',
      kind: 'effective_intervention',
      requiredActions: ['apply_tourniquet'],
      requireEffective: true,
      requireLocation: true,
      targetLocation: 'left_lower_leg',
    },
    {
      ruleId: 'TCCC-M-002',
      kind: 'finding_discovered',
      findingId: 'finding-left-leg-hemorrhage',
    },
    {
      ruleId: 'TCCC-A-001',
      kind: 'assessment_performed',
      requiredActions: ['assess_airway'],
    },
    {
      ruleId: 'TCCC-R-001',
      kind: 'assessment_performed',
      requiredActions: ['assess_breathing'],
    },
    {
      ruleId: 'TCCC-R-002',
      kind: 'effective_intervention',
      requiredActions: ['apply_chest_seal'],
      requireEffective: true,
      requireLocation: true,
      targetLocation: 'right_chest',
      requiresDiscoveredFindingId: 'finding-right-chest-wound',
    },
    {
      ruleId: 'TCCC-C-001',
      kind: 'assessment_performed',
      requiredActions: ['initiate_iv_access', 'initiate_saline_lock'],
    },
    {
      ruleId: 'TCCC-H-001',
      kind: 'assessment_performed',
      requiredActions: ['prevent_hypothermia'],
    },
    {
      ruleId: 'TCCC-TEV-001',
      kind: 'assessment_performed',
      requiredActions: ['request_evacuation'],
    },
  ],
};

export function createInitialState(scenario: ScenarioDefinition): SimulationState {
  return {
    ...scenario.initialState,
    events: [],
    discoveredFindingIds: [],
    performedAssessments: [],
    interventions: [],
    dialogueHistory: [
      'Casualty (groaning): "Help… help me…"',
    ],
    marchStatus: { ...INITIAL_MARCH },
  };
}

export const SCENARIOS: ScenarioDefinition[] = [scenario001];

export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return SCENARIOS.find((s) => s.id === id || s.id.replace(/-/g, '') === id.replace(/-/g, ''));
}

export const PLACEHOLDER_SCENARIOS = [
  {
    id: 'SCENARIO-002',
    title: 'Vehicle Roll-Over',
    environment: 'Mounted',
    difficulty: 'Advanced' as const,
    mechanism: 'Mechanism of Injury: Blunt Trauma',
    trainingFocus: ['Spinal Precautions', 'Multi-system Trauma'],
    estimatedMinutes: '12–15 min',
    available: false,
  },
  {
    id: 'SCENARIO-003',
    title: 'Gunshot Wound — Urban',
    environment: 'Urban',
    difficulty: 'Intermediate' as const,
    mechanism: 'Penetrating Trauma',
    trainingFocus: ['Hemorrhage Control', 'TCCC'],
    estimatedMinutes: '10–12 min',
    available: false,
  },
];
