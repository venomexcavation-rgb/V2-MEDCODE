import { describe, it, expect, beforeEach } from 'vitest';
import { locationsMatch, parseLocationFromText } from '@/lib/locations';
import { parseActionInput } from '@/engine/actionParser';
import { createInitialState, scenario001 } from '@/scenarios/scenario001';
import { executeAction, resetEventCounter, tickSimulation } from '@/engine/simulationEngine';
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
