import type {
  ScenarioDefinition,
  CheckResult,
} from '@/engine/types';
import { locationsMatch } from '@/lib/locations';

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

export const scenario003: ScenarioDefinition = {
  id: 'SCENARIO-003',
  title: 'Gunshot Wound — Urban',
  description:
    'Small-arms fire in an urban alley. You reach one casualty with limited initial information.',
  environment: 'Urban',
  difficulty: 'Intermediate',
  mechanism: 'Penetrating Trauma',
  learningObjectives: [
    'Identify and control extremity gunshot hemorrhage',
    'Manage a penetrating chest wound on the correct side',
    'Complete MARCH circulation after radial-pulse assessment',
  ],
  estimatedMinutes: '10–12 min',
  trainingFocus: ['Hemorrhage Control', 'TCCC'],
  initialPresentation:
    'Casualty found sitting against a wall in an alley after small-arms fire. Blood is visible on clothing. The casualty is moving, talking, and in pain.',
  casualtyDemographics: 'UNKNOWN MALE — Approx. 20–30 years',
  initialState: {
    scenarioId: 'SCENARIO-003',
    elapsedSeconds: 0,
    status: 'active',
    physiology: {
      consciousness: 'verbal',
      airwayPatent: true,
      respiratoryRate: 24,
      respiratoryDistress: true,
      radialPulsePresent: true,
      radialPulseQuality: 'strong',
      bloodLossMl: 250,
      shockState: 'compensated',
      skinSigns: 'Pale, diaphoretic',
      mentalStatusNote: 'Anxious, oriented x2',
    },
    injuries: [
      {
        id: 'inj-right-thigh-gsw',
        location: 'right_thigh',
        type: 'gunshot_wound',
        severity: 'critical',
        bleedingRateMlPerMin: 70,
        controlled: false,
        packable: false,
        requiresTourniquet: true,
        hiddenUntil: ['expose_right_leg', 'blood_sweep', 'assess_massive_hemorrhage'],
        description: 'Gunshot wound right thigh with arterial hemorrhage',
        discoveryDescription:
          'A gunshot wound is present on the right thigh with bright red pulsatile bleeding.',
      },
      {
        id: 'inj-left-chest-gsw',
        location: 'left_chest',
        type: 'penetrating_chest_wound',
        severity: 'moderate',
        bleedingRateMlPerMin: 5,
        controlled: false,
        packable: false,
        requiresTourniquet: false,
        hiddenUntil: ['expose_chest', 'check_penetrating_chest_trauma'],
        description: 'Penetrating gunshot wound left chest',
        discoveryDescription:
          'A penetrating gunshot wound is visible on the left chest wall with a sucking sound on inspiration.',
      },
    ],
    findings: [
      {
        id: 'finding-right-thigh-hemorrhage',
        label: 'Right thigh arterial gunshot hemorrhage',
        category: 'M',
        location: 'right_thigh',
        hidden: true,
        discovered: false,
        discoveryConditions: ['expose_right_leg', 'blood_sweep', 'assess_massive_hemorrhage'],
        observationText: 'Severe pulsatile bleeding from a gunshot wound to the right thigh.',
        marchImpact: 'CONCERN',
      },
      {
        id: 'finding-left-chest-wound',
        label: 'Penetrating chest wound (left)',
        category: 'R',
        location: 'left_chest',
        hidden: true,
        discovered: false,
        discoveryConditions: ['expose_chest', 'check_penetrating_chest_trauma'],
        observationText: 'Penetrating gunshot wound on the left chest with sucking chest wound signs.',
        marchImpact: 'CONCERN',
      },
      {
        id: 'finding-respiratory-distress',
        label: 'Respiratory distress',
        category: 'R',
        hidden: false,
        discovered: false,
        discoveryConditions: ['assess_breathing', 'check_respirations'],
        observationText: 'Respirations are rapid and labored at approximately 24/min.',
        marchImpact: 'CONCERN',
      },
      {
        id: 'finding-environmental-exposure',
        label: 'Environmental exposure',
        category: 'H',
        hidden: false,
        discovered: false,
        discoveryConditions: ['expose_right_leg', 'expose_chest', 'prevent_hypothermia'],
        observationText: 'The casualty is exposed to the environment. Clothing is bloody and the ground is cool.',
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
    txaAdministered: false,
    wholeBloodAdministered: false,
  },
  deteriorationRules: [
    {
      id: 'det-hemorrhage',
      description: 'Untreated arterial hemorrhage causes blood loss and shock progression',
      intervalSeconds: 15,
      condition: (state) =>
        state.injuries.some((i) => i.requiresTourniquet && !i.controlled && i.bleedingRateMlPerMin > 0),
      apply: (state) => {
        const injury = state.injuries.find((i) => i.id === 'inj-right-thigh-gsw');
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
                  : 'Increasingly anxious and confused',
          },
        };
      },
    },
    {
      id: 'det-chest-respiratory',
      description: 'Untreated open chest wound worsens respiratory distress',
      intervalSeconds: 30,
      condition: (state) => {
        const chestInjury = state.injuries.find((i) => i.id === 'inj-left-chest-gsw');
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
      id: 'score-avpu',
      label: 'AVPU assessed',
      category: 'critical',
      maxPoints: 5,
      critical: false,
      detail: 'Initial AVPU check performed.',
      teaching: 'Begin the encounter by assessing AVPU.',
      evaluate: (state) => {
        const done =
          state.performedAssessments.includes('assess_avpu') ||
          state.performedAssessments.includes('check_responsiveness');
        return makeCheck(
          'score-avpu',
          'AVPU assessed',
          'critical',
          5,
          done,
          false,
          done ? 'AVPU was assessed.' : 'AVPU was not assessed.',
          'Use Checking AVPU or Assessing AVPU to record mental status.',
        );
      },
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
          state.discoveredFindingIds.includes('finding-right-thigh-hemorrhage'),
          true,
          state.discoveredFindingIds.includes('finding-right-thigh-hemorrhage')
            ? 'Right thigh arterial gunshot hemorrhage was identified.'
            : 'Failed to identify life-threatening hemorrhage on the right thigh.',
          'Perform blood sweep and expose the right leg to find hidden hemorrhage.',
        ),
    },
    {
      id: 'score-tq-applied',
      label: 'Tourniquet applied correctly',
      category: 'hemorrhage',
      maxPoints: 25,
      critical: true,
      detail: 'Tourniquet applied to the correct extremity.',
      teaching: 'Apply tourniquet high and tight on the correct extremity for arterial hemorrhage.',
      evaluate: (state) => {
        const correctTq = state.interventions.some(
          (i) =>
            i.type === 'apply_tourniquet' &&
            i.effective &&
            i.location &&
            locationsMatch(i.location, 'right_thigh'),
        );
        return makeCheck(
          'score-tq-applied',
          'Tourniquet applied correctly',
          'hemorrhage',
          25,
          correctTq,
          true,
          correctTq
            ? 'Tourniquet effectively applied to the right thigh.'
            : 'Tourniquet not applied correctly to the bleeding extremity.',
          'For a thigh GSW with arterial bleed, apply tourniquet high and tight above the wound.',
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
        const discovered = state.discoveredFindingIds.includes('finding-left-chest-wound');
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
          sealed ? 'Chest seal applied to left chest wound.' : 'Penetrating chest wound not sealed.',
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
      teaching: 'Assess radial pulses before initiating IV access.',
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
          'Assess radial pulses before initiating IV access.',
        ),
    },
    {
      id: 'score-circulation-access',
      label: 'Saline lock initiated',
      category: 'circulation',
      maxPoints: 10,
      critical: false,
      detail: 'Vascular access established with a saline lock.',
      teaching: 'Initiate a saline lock. This is required whether or not whole blood is given.',
      evaluate: (state) =>
        makeCheck(
          'score-circulation-access',
          'Saline lock initiated',
          'circulation',
          10,
          state.salineLockInitiated,
          false,
          state.salineLockInitiated ? 'Saline lock was initiated.' : 'A saline lock was not initiated.',
          'Initiate a saline lock to begin circulation.',
        ),
    },
    {
      id: 'score-circulation-txa',
      label: '2 grams TXA administered',
      category: 'circulation',
      maxPoints: 15,
      critical: false,
      detail: 'TXA given through the saline lock.',
      teaching: 'After the saline lock, administer 2 grams TXA.',
      evaluate: (state) =>
        makeCheck(
          'score-circulation-txa',
          '2 grams TXA administered',
          'circulation',
          15,
          state.txaAdministered,
          false,
          state.txaAdministered
            ? '2 grams of TXA was administered through the saline lock.'
            : '2 grams TXA was not administered.',
          'After the saline lock, administer 2 grams TXA.',
        ),
    },
    {
      id: 'score-circulation-whole-blood',
      label: 'Whole blood when radial pulses absent',
      category: 'circulation',
      maxPoints: 15,
      critical: false,
      detail: '450 mL low titer O whole blood if radial pulses are absent.',
      teaching:
        'If radial pulses are absent, administer 450 mL of low titer O whole blood through the saline lock.',
      evaluate: (state) => {
        if (state.radialPulseFinding === 'present') {
          return makeCheck(
            'score-circulation-whole-blood',
            'Whole blood when radial pulses absent',
            'circulation',
            15,
            true,
            false,
            'Radial pulses were present. Whole blood was not required.',
            'Skip 450 mL low titer O whole blood when radial pulses are present.',
          );
        }
        if (state.radialPulseFinding !== 'absent') {
          return makeCheck(
            'score-circulation-whole-blood',
            'Whole blood when radial pulses absent',
            'circulation',
            15,
            false,
            false,
            'Radial pulses were not assessed, so whole-blood indication is unknown.',
            'Assess radial pulses before deciding on whole blood.',
          );
        }
        return makeCheck(
          'score-circulation-whole-blood',
          'Whole blood when radial pulses absent',
          'circulation',
          15,
          state.wholeBloodAdministered,
          false,
          state.wholeBloodAdministered
            ? '450 mL of low titer O whole blood was administered.'
            : 'Radial pulses were absent, but 450 mL low titer O whole blood was not administered.',
          'After the saline lock, administer 450cc or 450mL of low titer O whole blood.',
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
            (i.location === 'left_leg' || i.location === 'left_thigh' || i.location === 'left_lower_leg'),
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
    assess_avpu: 8,
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
    administer_txa: 15,
    administer_whole_blood: 20,
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
    'TCCC-C-003',
    'TCCC-C-004',
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
      targetLocation: 'right_thigh',
    },
    {
      ruleId: 'TCCC-M-001',
      kind: 'effective_intervention',
      requiredActions: ['apply_tourniquet'],
      requireEffective: true,
      requireLocation: true,
      targetLocation: 'right_thigh',
    },
    {
      ruleId: 'TCCC-M-002',
      kind: 'finding_discovered',
      findingId: 'finding-right-thigh-hemorrhage',
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
      targetLocation: 'left_chest',
      requiresDiscoveredFindingId: 'finding-left-chest-wound',
    },
    {
      ruleId: 'TCCC-C-001',
      kind: 'assessment_performed',
      requiredActions: ['initiate_saline_lock'],
    },
    {
      ruleId: 'TCCC-C-003',
      kind: 'effective_intervention',
      requiredActions: ['administer_txa'],
      requireEffective: true,
    },
    {
      ruleId: 'TCCC-C-004',
      kind: 'effective_intervention',
      requiredActions: ['administer_whole_blood'],
      requireEffective: true,
      requiresAbsentRadialPulse: true,
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
  quickActionGroups: [
    { label: 'Assess', commands: ['Checking AVPU', 'Check for massive hemorrhage', 'Assess airway', 'Assess breathing', 'Check radial pulse'] },
    { label: 'Expose', commands: ['Expose the right leg', 'Expose the chest'] },
    {
      label: 'Intervention',
      commands: [
        'Apply tourniquet high and tight to the right leg',
        'Apply chest seal to left chest',
        'Initiate IV access',
        'Initiate saline lock',
        'Administer 2 grams TXA',
        'Administer 450mL of low titer O whole blood',
        'Prevent hypothermia',
      ],
    },
    { label: 'Reassess', commands: ['Reassess bleeding', 'Reassess breathing', 'Reassess circulation'] },
    { label: 'Complete', commands: ['Request evacuation', 'End scenario'] },
  ],
};

