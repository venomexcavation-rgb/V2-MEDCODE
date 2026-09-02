import { describe, it, expect, beforeEach } from 'vitest';
import {
  ALL_TCCC_RULES,
  ACTIVE_TCCC_GUIDELINE_VERSION_ID,
  TCCC_GUIDELINE_PENDING,
  evaluateScenarioTcccRules,
  getTcccRuleById,
  resolveTcccRuleIds,
} from '@/data/tccc';
import { parseActionInput } from '@/engine/actionParser';
import { executeAction, resetEventCounter } from '@/engine/simulationEngine';
import { generateAAR } from '@/engine/aar';
import { createInitialState, scenario001 } from '@/scenarios/scenario001';
import type { ScenarioDefinition } from '@/engine/types';

describe('TCCC guideline layer', () => {
  beforeEach(() => {
    resetEventCounter();
  });

  it('preserves guideline version metadata in a central slot', () => {
    expect(TCCC_GUIDELINE_PENDING.id).toBe(ACTIVE_TCCC_GUIDELINE_VERSION_ID);
    expect(TCCC_GUIDELINE_PENDING.trainingUseOnly).toBe(true);
    expect(TCCC_GUIDELINE_PENDING.verificationStatus).toBe('TODO_TCCC_VERIFICATION_REQUIRED');
    expect(ALL_TCCC_RULES.every((rule) => rule.guidelineVersionId === ACTIVE_TCCC_GUIDELINE_VERSION_ID)).toBe(
      true,
    );
  });

  it('does not encode unverified clinical recommendations as verified', () => {
    expect(ALL_TCCC_RULES.every((rule) => rule.verified === false)).toBe(true);
    expect(ALL_TCCC_RULES.every((rule) => rule.expectedBehavior === 'TODO_TCCC_VERIFICATION_REQUIRED')).toBe(
      true,
    );
  });

  it('cannot mutate SimulationState from TCCC rule data', () => {
    const state = createInitialState(scenario001);
    const snapshot = JSON.stringify({
      physiology: state.physiology,
      injuries: state.injuries,
      discoveredFindingIds: state.discoveredFindingIds,
    });
    const rule = getTcccRuleById('TCCC-M-001');
    expect(rule).toBeDefined();
    Object.freeze(state.physiology);
    evaluateScenarioTcccRules(state, scenario001);
    expect(
      JSON.stringify({
        physiology: state.physiology,
        injuries: state.injuries,
        discoveredFindingIds: state.discoveredFindingIds,
      }),
    ).toBe(snapshot);
    expect(Object.isFrozen(rule)).toBe(true);
    expect(Object.isFrozen(ALL_TCCC_RULES)).toBe(true);
  });

  it('allows a scenario to reference valid TCCC rule IDs', () => {
    const { found, unknown } = resolveTcccRuleIds(scenario001.requiredTcccRules ?? []);
    expect(unknown).toEqual([]);
    expect(found.map((r) => r.id)).toEqual(scenario001.requiredTcccRules);
  });

  it('handles unknown rule IDs without throwing', () => {
    const scenario: ScenarioDefinition = {
      ...scenario001,
      requiredTcccRules: ['TCCC-M-001', 'TCCC-NOT-A-REAL-RULE'],
    };
    const { results, unknownRuleIds } = evaluateScenarioTcccRules(createInitialState(scenario), scenario);
    expect(unknownRuleIds).toContain('TCCC-NOT-A-REAL-RULE');
    expect(results.some((r) => r.outcome === 'unresolved_rule')).toBe(true);
  });

  it('satisfies location-dependent scoring only for the correct extremity', () => {
    let state = createInitialState(scenario001);
    state = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario001).state;
    state = executeAction(
      state,
      {
        type: 'apply_tourniquet',
        location: 'left_leg',
        parameters: { placement: 'high_and_tight' },
        rawInput: 'tq left leg',
      },
      scenario001,
    ).state;

    const { results } = evaluateScenarioTcccRules(state, scenario001);
    const hemorrhageControl = results.find((r) => r.ruleId === 'TCCC-M-001');
    expect(hemorrhageControl?.outcome).toBe('completed');
    expect(hemorrhageControl?.locationCorrect).toBe(true);
  });

  it('does not satisfy location-dependent checks on the wrong extremity', () => {
    let state = createInitialState(scenario001);
    state = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario001).state;
    state = executeAction(
      state,
      { type: 'apply_tourniquet', location: 'right_leg', rawInput: 'tq right leg' },
      scenario001,
    ).state;

    const { results } = evaluateScenarioTcccRules(state, scenario001);
    const hemorrhageControl = results.find((r) => r.ruleId === 'TCCC-M-001');
    expect(hemorrhageControl?.outcome).toBe('incorrect');
    expect(hemorrhageControl?.locationCorrect).toBe(false);
    expect(state.injuries.find((i) => i.requiresTourniquet)?.controlled).toBe(false);
  });

  it('keeps hidden findings hidden until the appropriate assessment', () => {
    const before = createInitialState(scenario001);
    expect(before.discoveredFindingIds).not.toContain('finding-left-leg-hemorrhage');
    const { results: beforeResults } = evaluateScenarioTcccRules(before, scenario001);
    expect(beforeResults.find((r) => r.ruleId === 'TCCC-M-002')?.outcome).toBe('missed');

    const after = executeAction(before, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario001).state;
    expect(after.discoveredFindingIds).toContain('finding-left-leg-hemorrhage');
    const { results: afterResults } = evaluateScenarioTcccRules(after, scenario001);
    expect(afterResults.find((r) => r.ruleId === 'TCCC-M-002')?.outcome).toBe('completed');
  });

  it('includes TCCC rule IDs and guideline version in the AAR', () => {
    let state = createInitialState(scenario001);
    state = executeAction(state, { type: 'blood_sweep', rawInput: 'blood sweep' }, scenario001).state;
    state = executeAction(
      state,
      {
        type: 'apply_tourniquet',
        location: 'left_leg',
        parameters: { placement: 'high_and_tight' },
        rawInput: 'tq',
      },
      scenario001,
    ).state;
    const aar = generateAAR(state, scenario001);
    expect(aar.tcccGuidelineVersionId).toBe(ACTIVE_TCCC_GUIDELINE_VERSION_ID);
    expect(aar.tcccGuidelineVersionDate).toBe(TCCC_GUIDELINE_PENDING.versionDate);
    expect(aar.tcccResults.some((r) => r.ruleId === 'TCCC-M-001')).toBe(true);
    expect(aar.tcccResults.find((r) => r.ruleId === 'TCCC-M-001')?.outcome).toBe('completed');
  });

  it('does not let parser output alone produce a medical outcome', () => {
    const state = createInitialState(scenario001);
    const parsed = parseActionInput('Apply a tourniquet high and tight to the left leg');
    expect(parsed.success).toBe(true);
    expect(parsed.action?.type).toBe('apply_tourniquet');
    expect(state.injuries.find((i) => i.requiresTourniquet)?.controlled).toBe(false);
    expect(state.hemorrhageControlledAt).toBeUndefined();
  });

  it('completes circulation after pulse check, saline lock, and TXA when radials are present', () => {
    let state = createInitialState(scenario001);
    const ivBlocked = executeAction(state, { type: 'initiate_iv_access', rawInput: 'initiate IV access' }, scenario001);
    expect(ivBlocked.state.ivAccessInitiated).toBe(false);
    expect(ivBlocked.messages).toContain('Assess for radial pulses before initiating IV access.');

    state = executeAction(state, { type: 'check_radial_pulse', rawInput: 'check radial pulse' }, scenario001).state;
    expect(state.radialPulseFinding).toBe('present');
    expect(state.marchStatus.C).not.toBe('TREATED');
    expect(state.marchStatus.C).not.toBe('STABLE');

    const afterIv = executeAction(state, { type: 'initiate_iv_access', rawInput: 'initiate IV access' }, scenario001).state;
    expect(afterIv.ivAccessInitiated).toBe(true);
    expect(afterIv.marchStatus.C).not.toBe('TREATED');
    expect(afterIv.marchStatus.C).not.toBe('STABLE');

    const txaBeforeLock = executeAction(
      state,
      { type: 'administer_txa', parameters: { doseGrams: 2 }, rawInput: 'administer 2 grams TXA' },
      scenario001,
    );
    expect(txaBeforeLock.state.txaAdministered).toBe(false);
    expect(txaBeforeLock.messages.some((m) => m.toLowerCase().includes('saline lock'))).toBe(true);

    let salineState = executeAction(
      state,
      { type: 'initiate_saline_lock', rawInput: 'initiate saline lock' },
      scenario001,
    ).state;
    expect(salineState.salineLockInitiated).toBe(true);
    expect(salineState.marchStatus.C).not.toBe('TREATED');
    expect(evaluateScenarioTcccRules(salineState, scenario001).results.find((r) => r.ruleId === 'TCCC-C-001')?.outcome).toBe(
      'completed',
    );
    expect(evaluateScenarioTcccRules(salineState, scenario001).results.find((r) => r.ruleId === 'TCCC-C-003')?.outcome).toBe(
      'missed',
    );
    expect(evaluateScenarioTcccRules(salineState, scenario001).results.find((r) => r.ruleId === 'TCCC-C-004')?.outcome).toBe(
      'not_applicable',
    );

    const afterTxa = executeAction(
      salineState,
      { type: 'administer_txa', parameters: { doseGrams: 2 }, rawInput: 'administer 2 grams TXA' },
      scenario001,
    ).state;
    expect(afterTxa.txaAdministered).toBe(true);
    expect(['TREATED', 'STABLE']).toContain(afterTxa.marchStatus.C);
    expect(evaluateScenarioTcccRules(afterTxa, scenario001).results.find((r) => r.ruleId === 'TCCC-C-003')?.outcome).toBe(
      'completed',
    );
  });

  it('requires 450 mL low titer O whole blood when radial pulses are absent', () => {
    let state = createInitialState(scenario001);
    state = {
      ...state,
      physiology: { ...state.physiology, radialPulsePresent: false, radialPulseQuality: 'absent', shockState: 'decompensated' },
    };
    state = executeAction(state, { type: 'check_radial_pulse', rawInput: 'check radial pulse' }, scenario001).state;
    expect(state.radialPulseFinding).toBe('absent');
    state = executeAction(state, { type: 'initiate_saline_lock', rawInput: 'initiate saline lock' }, scenario001).state;
    state = executeAction(
      state,
      { type: 'administer_txa', parameters: { doseGrams: 2 }, rawInput: 'administer 2 grams TXA' },
      scenario001,
    ).state;
    expect(state.txaAdministered).toBe(true);
    expect(state.marchStatus.C).not.toBe('TREATED');
    expect(state.marchStatus.C).not.toBe('STABLE');

    const blood = executeAction(
      state,
      { type: 'administer_whole_blood', parameters: { volumeMl: 450 }, rawInput: 'Administer 450mL of low titer O whole blood' },
      scenario001,
    );
    expect(blood.state.wholeBloodAdministered).toBe(true);
    expect(['TREATED', 'STABLE']).toContain(blood.state.marchStatus.C);
    expect(evaluateScenarioTcccRules(blood.state, scenario001).results.find((r) => r.ruleId === 'TCCC-C-004')?.outcome).toBe(
      'completed',
    );
  });

  it('parses initiate saline lock, TXA, and 450 cc/mL low titer O whole blood', () => {
    expect(parseActionInput('Initiate IV access').action?.type).toBe('initiate_iv_access');
    expect(parseActionInput('Initiate saline lock').action?.type).toBe('initiate_saline_lock');
    expect(parseActionInput('administer 2 grams TXA').action?.type).toBe('administer_txa');
    expect(parseActionInput('Administer 450cc of low titer O whole blood').action?.type).toBe('administer_whole_blood');
    expect(parseActionInput('Administer 450mL of low titer O whole blood').action?.parameters?.volumeMl).toBe(450);
    expect(parseActionInput('administer whole blood').success).toBe(false);
    expect(parseActionInput('administer whole blood').clarification).toContain('450');
  });
});
