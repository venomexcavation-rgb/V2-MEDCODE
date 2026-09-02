import { describe, it, expect, beforeEach } from 'vitest';
import { locationsMatch, parseLocationFromText } from '@/lib/locations';
import { parseActionInput } from '@/engine/actionParser';
import { createInitialState, scenario001 } from '@/scenarios/scenario001';
import { scenario003 } from '@/scenarios/scenario003';
import { executeAction, resetEventCounter, tickSimulation } from '@/engine/simulationEngine';
import { MASSIVE_HEMORRHAGE_FAIL_REASON } from '@/engine/hemorrhageDeadline';
import { generateAAR } from '@/engine/aar';
import { getAvpuResult } from '@/engine/avpu';

describe('locationsMatch', () => {
  it('matches exact locations', () => {
    expect(locationsMatch('left_leg', 'left_leg')).toBe(true);
  });

  it('matches parent to child', () => {
    expect(locationsMatch('left_leg', 'left_lower_leg')).toBe(true);
    expect(locationsMatch('left_leg', 'left_thigh')).toBe(true);
  });

  it('does not match opposite sides', () => {
    expect(locationsMatch('right_chest', 'left_chest')).toBe(false);
    expect(locationsMatch('right_leg', 'left_leg')).toBe(false);
  });

  it('matches chest to hemithorax', () => {
    expect(locationsMatch('chest', 'right_chest')).toBe(true);
  });
});

describe('parseLocationFromText', () => {
  it('parses left leg from natural language', () => {
    expect(parseLocationFromText('left leg')).toBe('left_leg');
    expect(parseLocationFromText('high and tight on his left lower leg')).toBe('left_lower_leg');
  });
});

describe('parseActionInput', () => {
  it('parses tourniquet with location', () => {
    const result = parseActionInput('Apply a tourniquet high and tight to the left leg');
    expect(result.success).toBe(true);
    expect(result.action?.type).toBe('apply_tourniquet');
    expect(result.action?.location).toBe('left_leg');
  });

  it('accepts hasty tourniquet as a high-and-tight passkey', () => {
    const result = parseActionInput('Apply a hasty tourniquet to the right leg');
    expect(result.success).toBe(true);
    expect(result.action?.type).toBe('apply_tourniquet');
    expect(result.action?.location).toBe('right_leg');
    expect(result.action?.parameters?.placement).toBe('high_and_tight');
  });

  it('accepts hasty tourniquet applied to leg without laterality', () => {
    const result = parseActionInput('hasty tourniquet applied to leg');
    expect(result.success).toBe(true);
    expect(result.action?.type).toBe('apply_tourniquet');
    expect(result.action?.location).toBeUndefined();
    expect(result.action?.parameters?.placement).toBe('high_and_tight');
    expect(result.action?.parameters?.target).toBe('affected_limb');
  });

  it('parses administer 2 grams TXA and asks for the dose otherwise', () => {
    const parsed = parseActionInput('administer 2 grams TXA');
    expect(parsed.success).toBe(true);
    expect(parsed.action?.type).toBe('administer_txa');
    expect(parsed.action?.parameters?.doseGrams).toBe(2);

    const missingDose = parseActionInput('give TXA');
    expect(missingDose.success).toBe(false);
    expect(missingDose.clarification).toContain('administer 2 grams TXA');
  });

  it('parses 450 cc and 450 mL low titer O whole blood pass keys', () => {
    const cc = parseActionInput('Administer 450cc of low titer O whole blood');
    expect(cc.success).toBe(true);
    expect(cc.action?.type).toBe('administer_whole_blood');
    expect(cc.action?.parameters?.volumeMl).toBe(450);

    const ml = parseActionInput('Administer 450mL of low titer O whole blood');
    expect(ml.success).toBe(true);
    expect(ml.action?.type).toBe('administer_whole_blood');
  });

  it('asks for clarification when location missing', () => {
    const result = parseActionInput('Put a tourniquet on him');
    expect(result.success).toBe(false);
    expect(result.clarification).toContain('Where');
  });

  it('parses Assessing AVPU and Checking AVPU', () => {
    expect(parseActionInput('Assessing AVPU').action?.type).toBe('assess_avpu');
    expect(parseActionInput('Checking AVPU').action?.type).toBe('assess_avpu');
    expect(parseActionInput('assess AVPU').action?.type).toBe('assess_avpu');
  });
});

describe('simulation engine', () => {
  beforeEach(() => {
    resetEventCounter();
  });

  it('discovers hidden findings on blood sweep', () => {
    let state = createInitialState(scenario001);
    const result = executeAction(
      state,
      { type: 'blood_sweep', rawInput: 'blood sweep' },
      scenario001,
    );
    expect(result.state.discoveredFindingIds).toContain('finding-left-leg-hemorrhage');
    expect(result.messages.some((m) => m.includes('amputation'))).toBe(true);
  });

  it('runs scenario 003 gunshot hemorrhage discovery on the right thigh', () => {
    let state = createInitialState(scenario003);
    expect(state.scenarioId).toBe('SCENARIO-003');
    const result = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario003);
    expect(result.state.discoveredFindingIds).toContain('finding-right-thigh-hemorrhage');
    expect(result.messages.some((m) => m.toLowerCase().includes('right thigh'))).toBe(true);

    state = executeAction(
      result.state,
      {
        type: 'apply_tourniquet',
        location: 'right_leg',
        parameters: { placement: 'high_and_tight' },
        rawInput: 'tq right leg high and tight',
      },
      scenario003,
    ).state;
    expect(state.injuries.find((i) => i.id === 'inj-right-thigh-gsw')?.controlled).toBe(true);
  });

  it('rejects a left-leg tourniquet on scenario 003 right-thigh hemorrhage', () => {
    let state = createInitialState(scenario003);
    state = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario003).state;
    const result = executeAction(
      state,
      { type: 'apply_tourniquet', location: 'left_leg', rawInput: 'tq left leg' },
      scenario003,
    );
    expect(result.state.injuries.find((i) => i.id === 'inj-right-thigh-gsw')?.controlled).toBe(false);
    expect(result.messages.some((m) => m.includes('continues elsewhere'))).toBe(true);
  });

  it('controls scenario 003 hemorrhage with a hasty tourniquet on the affected limb', () => {
    let state = createInitialState(scenario003);
    state = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario003).state;
    const parsed = parseActionInput('Apply a hasty tourniquet to the right leg');
    expect(parsed.success).toBe(true);

    const result = executeAction(state, parsed.action!, scenario003);
    expect(result.state.injuries.find((i) => i.id === 'inj-right-thigh-gsw')?.controlled).toBe(true);
    expect(result.state.interventions.at(-1)?.parameters?.placement).toBe('high_and_tight');
  });

  it('applies hasty tourniquet applied to leg to the massive-hemorrhage limb', () => {
    let state = createInitialState(scenario003);
    state = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario003).state;
    const parsed = parseActionInput('hasty tourniquet applied to leg');
    expect(parsed.success).toBe(true);

    const result = executeAction(state, parsed.action!, scenario003);
    expect(result.state.injuries.find((i) => i.id === 'inj-right-thigh-gsw')?.controlled).toBe(true);
    expect(result.messages.some((m) => /pulsatile bleeding slows and stops/i.test(m))).toBe(true);

    state = createInitialState(scenario001);
    state = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario001).state;
    const blast = executeAction(state, parsed.action!, scenario001);
    expect(blast.state.injuries.find((i) => i.id === 'inj-left-lower-leg-amputation')?.controlled).toBe(true);
  });

  it('rejects wrong-side tourniquet', () => {
    let state = createInitialState(scenario001);
    state = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario001).state;
    const result = executeAction(
      state,
      { type: 'apply_tourniquet', location: 'right_leg', rawInput: 'tq right leg' },
      scenario001,
    );
    expect(result.state.injuries.find((i) => i.requiresTourniquet)?.controlled).toBe(false);
    expect(result.messages.some((m) => m.includes('continues elsewhere'))).toBe(true);
  });

  it('controls hemorrhage with correct tourniquet', () => {
    let state = createInitialState(scenario001);
    state = executeAction(state, { type: 'expose', location: 'left_leg', rawInput: 'expose left leg' }, scenario001).state;
    const result = executeAction(
      state,
      {
        type: 'apply_tourniquet',
        location: 'left_leg',
        parameters: { placement: 'high_and_tight' },
        rawInput: 'tq left leg high and tight',
      },
      scenario001,
    );
    const injury = result.state.injuries.find((i) => i.id === 'inj-left-lower-leg-amputation');
    expect(injury?.controlled).toBe(true);
    expect(result.state.hemorrhageControlledAt).toBeDefined();
  });

  it('deteriorates without treatment over time', () => {
    let state = createInitialState(scenario001);
    state = tickSimulation(state, scenario001, 120);
    expect(state.physiology.bloodLossMl).toBeGreaterThan(200);
  });

  it('fails the scenario if massive hemorrhage is not controlled within 5 minutes', () => {
    let state = createInitialState(scenario001);
    state = tickSimulation(state, scenario001, 299);
    expect(state.status).toBe('active');

    state = tickSimulation(state, scenario001, 1);
    expect(state.status).toBe('failed');
    expect(state.completionReason).toBe(MASSIVE_HEMORRHAGE_FAIL_REASON);
    expect(state.aar?.missionResult).toBe('FAILURE');
    expect(state.aar?.casualtyOutcome).toBe(MASSIVE_HEMORRHAGE_FAIL_REASON);
  });

  it('fails scenario 003 at 5 minutes without hemorrhage control', () => {
    let state = createInitialState(scenario003);
    state = tickSimulation(state, scenario003, 300);
    expect(state.status).toBe('failed');
    expect(state.completionReason).toBe(MASSIVE_HEMORRHAGE_FAIL_REASON);
  });

  it('does not fail at 5 minutes when hemorrhage was already controlled', () => {
    let state = createInitialState(scenario001);
    state = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario001).state;
    state = executeAction(
      state,
      {
        type: 'apply_tourniquet',
        location: 'left_leg',
        parameters: { placement: 'high_and_tight' },
        rawInput: 'tq left leg high and tight',
      },
      scenario001,
    ).state;
    expect(state.hemorrhageControlledAt).toBeLessThanOrEqual(300);
    expect(state.status).toBe('active');

    state = tickSimulation(state, scenario001, 300);
    expect(state.status).not.toBe('failed');
  });

  it('fails if the tourniquet lands after the 5-minute mark', () => {
    let state = createInitialState(scenario003);
    state = tickSimulation(state, scenario003, 290);
    expect(state.status).toBe('active');

    const result = executeAction(
      state,
      {
        type: 'apply_tourniquet',
        location: 'right_leg',
        parameters: { placement: 'high_and_tight' },
        rawInput: 'hasty tourniquet applied to leg',
      },
      scenario003,
    );
    expect(result.state.elapsedSeconds).toBeGreaterThan(300);
    expect(result.state.status).toBe('failed');
    expect(result.messages).toContain(MASSIVE_HEMORRHAGE_FAIL_REASON);
  });

  it('generates AAR from event history', () => {
    let state = createInitialState(scenario001);
    state = executeAction(state, { type: 'check_responsiveness', rawInput: 'check responsiveness' }, scenario001).state;
    state = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario001).state;
    state = executeAction(
      state,
      { type: 'apply_tourniquet', location: 'left_leg', parameters: { placement: 'high_and_tight' }, rawInput: 'tq' },
      scenario001,
    ).state;
    state = executeAction(state, { type: 'reassess_hemorrhage', rawInput: 'reassess bleeding' }, scenario001).state;

    const aar = generateAAR(state, scenario001);
    expect(aar.overallScore).toBeGreaterThan(0);
    expect(aar.categoryScores.length).toBeGreaterThan(0);
    expect(aar.timeline.length).toBeGreaterThan(0);
    expect(aar.totalElapsedSeconds).toBe(state.elapsedSeconds);
    const marchTimeTotal = Object.values(aar.marchTimeSeconds ?? {}).reduce((sum, n) => sum + n, 0);
    expect(marchTimeTotal).toBe(aar.totalElapsedSeconds);
    expect(aar.marchTimeSeconds?.M).toBe(aar.totalElapsedSeconds);
  });

  it('attributes AAR MARCH time to later letters after hemorrhage control', () => {
    let state = createInitialState(scenario001);
    state = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario001).state;
    state = executeAction(
      state,
      {
        type: 'apply_tourniquet',
        location: 'left_leg',
        parameters: { placement: 'high_and_tight' },
        rawInput: 'tq left leg high and tight',
      },
      scenario001,
    ).state;
    state = executeAction(state, { type: 'assess_airway', rawInput: 'assess airway' }, scenario001).state;
    state = executeAction(state, { type: 'assess_breathing', rawInput: 'assess breathing' }, scenario001).state;

    const aar = generateAAR(state, scenario001);
    const times = aar.marchTimeSeconds!;
    expect(times.M + times.A + times.R + times.C + times.H).toBe(aar.totalElapsedSeconds);
    expect(times.M).toBeGreaterThan(0);
    expect(times.A).toBeGreaterThan(0);
    expect(times.R).toBeGreaterThan(0);
    expect(times.M).toBeGreaterThan(times.A);
  });

  it('withholds TXA until a saline lock is in place, then completes circulation', () => {
    let state = createInitialState(scenario001);
    const blocked = executeAction(
      state,
      { type: 'administer_txa', parameters: { doseGrams: 2 }, rawInput: 'administer 2 grams TXA' },
      scenario001,
    );
    expect(blocked.state.txaAdministered).toBe(false);
    expect(blocked.state.interventions.some((i) => i.type === 'administer_txa')).toBe(false);
    expect(blocked.messages).toContain('Initiate a saline lock before administering TXA.');

    state = executeAction(blocked.state, { type: 'initiate_saline_lock', rawInput: 'initiate saline lock' }, scenario001).state;
    expect(state.salineLockInitiated).toBe(true);
    expect(state.txaAdministered).toBe(false);
    expect(state.marchStatus.C).not.toBe('TREATED');

    const given = executeAction(
      state,
      { type: 'administer_txa', parameters: { doseGrams: 2 }, rawInput: 'administer 2 grams TXA' },
      scenario001,
    );
    expect(given.state.txaAdministered).toBe(true);
    expect(given.messages).toContain('You administer 2 grams of TXA through the saline lock.');
    expect(given.state.marchStatus.C).not.toBe('TREATED');

    const pulsed = executeAction(given.state, { type: 'check_radial_pulse', rawInput: 'check radial pulse' }, scenario001).state;
    expect(pulsed.radialPulseFinding).toBe('present');
    expect(['TREATED', 'STABLE']).toContain(pulsed.marchStatus.C);
  });

  it('requires whole blood to complete circulation only when radial pulses are absent', () => {
    let present = createInitialState(scenario001);
    present = executeAction(present, { type: 'check_radial_pulse', rawInput: 'check radial pulse' }, scenario001).state;
    const skippedBeforeLock = executeAction(
      present,
      {
        type: 'administer_whole_blood',
        parameters: { volumeMl: 450 },
        rawInput: 'Administer 450cc of low titer O whole blood',
      },
      scenario001,
    );
    expect(skippedBeforeLock.state.wholeBloodAdministered).toBe(false);
    expect(skippedBeforeLock.messages).toContain(
      'Radial pulses are present. Whole blood is not required; you may skip this step.',
    );

    present = executeAction(present, { type: 'initiate_saline_lock', rawInput: 'initiate saline lock' }, scenario001).state;
    present = executeAction(
      present,
      { type: 'administer_txa', parameters: { doseGrams: 2 }, rawInput: 'administer 2 grams TXA' },
      scenario001,
    ).state;
    expect(['TREATED', 'STABLE']).toContain(present.marchStatus.C);

    const skipped = executeAction(
      present,
      {
        type: 'administer_whole_blood',
        parameters: { volumeMl: 450 },
        rawInput: 'Administer 450cc of low titer O whole blood',
      },
      scenario001,
    );
    expect(skipped.state.wholeBloodAdministered).toBe(false);
    expect(skipped.messages).toContain(
      'Radial pulses are present. Whole blood is not required; you may skip this step.',
    );

    let absent = createInitialState(scenario001);
    absent = {
      ...absent,
      physiology: { ...absent.physiology, radialPulsePresent: false, radialPulseQuality: 'absent', shockState: 'decompensated' },
    };
    const bloodBeforePulse = executeAction(
      absent,
      { type: 'administer_whole_blood', parameters: { volumeMl: 450 }, rawInput: 'Administer 450mL of low titer O whole blood' },
      scenario001,
    );
    expect(bloodBeforePulse.state.wholeBloodAdministered).toBe(false);
    expect(bloodBeforePulse.messages).toContain('Assess for radial pulses before administering whole blood.');

    absent = executeAction(absent, { type: 'check_radial_pulse', rawInput: 'check radial pulse' }, scenario001).state;
    const bloodBeforeLock = executeAction(
      absent,
      { type: 'administer_whole_blood', parameters: { volumeMl: 450 }, rawInput: 'Administer 450mL of low titer O whole blood' },
      scenario001,
    );
    expect(bloodBeforeLock.state.wholeBloodAdministered).toBe(false);
    expect(bloodBeforeLock.messages).toContain('Initiate a saline lock before administering whole blood.');

    absent = executeAction(absent, { type: 'initiate_saline_lock', rawInput: 'initiate saline lock' }, scenario001).state;
    absent = executeAction(
      absent,
      { type: 'administer_txa', parameters: { doseGrams: 2 }, rawInput: 'administer 2 grams TXA' },
      scenario001,
    ).state;
    expect(absent.marchStatus.C).not.toBe('TREATED');

    const givenBlood = executeAction(
      absent,
      { type: 'administer_whole_blood', parameters: { volumeMl: 450 }, rawInput: 'Administer 450cc of low titer O whole blood' },
      scenario001,
    );
    expect(givenBlood.state.wholeBloodAdministered).toBe(true);
    expect(givenBlood.messages).toContain('You administer 450 mL of low titer O whole blood through the saline lock.');
    expect(['TREATED', 'STABLE']).toContain(givenBlood.state.marchStatus.C);
  });

  it('reports AVPU from current casualty condition and accepts the assessment', () => {
    let state = createInitialState(scenario001);
    expect(state.physiology.consciousness).toBe('verbal');

    const verbal = executeAction(state, { type: 'assess_avpu', rawInput: 'Checking AVPU' }, scenario001);
    expect(verbal.messages).toContain('You assess AVPU (Alert, Verbal, Pain, Unresponsive).');
    expect(verbal.messages.some((m) => m.startsWith('V — Verbal'))).toBe(true);
    expect(verbal.state.performedAssessments).toContain('assess_avpu');
    expect(getAvpuResult(verbal.state.physiology.consciousness).letter).toBe('V');

    const again = executeAction(verbal.state, { type: 'assess_avpu', rawInput: 'Assessing AVPU' }, scenario001);
    expect(again.messages[0]).toContain('AVPU already assessed');
    expect(again.messages[0]).toContain('V — Verbal');

    const unresponsiveState = {
      ...createInitialState(scenario001),
      physiology: { ...createInitialState(scenario001).physiology, consciousness: 'unresponsive' as const },
    };
    const unresponsive = executeAction(
      unresponsiveState,
      { type: 'assess_avpu', rawInput: 'Checking AVPU' },
      scenario001,
    );
    expect(unresponsive.messages.some((m) => m.startsWith('U — Unresponsive'))).toBe(true);

    const painState = {
      ...createInitialState(scenario001),
      physiology: { ...createInitialState(scenario001).physiology, consciousness: 'pain' as const },
    };
    const pain = executeAction(painState, { type: 'assess_avpu', rawInput: 'Assessing AVPU' }, scenario001);
    expect(pain.messages.some((m) => m.startsWith('P — Pain'))).toBe(true);
  });
});
