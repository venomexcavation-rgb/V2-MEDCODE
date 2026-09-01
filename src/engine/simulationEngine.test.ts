import { describe, it, expect, beforeEach } from 'vitest';
import { locationsMatch, parseLocationFromText } from '@/lib/locations';
import { parseActionInput } from '@/engine/actionParser';
import { createInitialState, scenario001 } from '@/scenarios/scenario001';
import { executeAction, resetEventCounter, tickSimulation } from '@/engine/simulationEngine';
import { generateAAR } from '@/engine/aar';

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

  it('asks for clarification when location missing', () => {
    const result = parseActionInput('Put a tourniquet on him');
    expect(result.success).toBe(false);
    expect(result.clarification).toContain('Where');
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
});
