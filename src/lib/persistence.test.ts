import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, scenario001 } from '@/scenarios/scenario001';
import { executeAction, resetEventCounter } from '@/engine/simulationEngine';
import { generateAAR } from '@/engine/aar';
import {
  getTrainingRecordById,
  getTrainingRecords,
  saveTrainingRecord,
} from '@/lib/persistence';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

function runSampleScenario() {
  resetEventCounter();
  let state = createInitialState(scenario001);
  state = executeAction(state, { type: 'check_responsiveness', rawInput: 'check responsiveness' }, scenario001).state;
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
  state = executeAction(state, { type: 'reassess_hemorrhage', rawInput: 'reassess bleeding' }, scenario001).state;
  return generateAAR(state, scenario001);
}

describe('training history persistence', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
    });
  });

  it('stores the full AAR so Performance can reopen a session', () => {
    const aar = runSampleScenario();
    const record = saveTrainingRecord(scenario001.id, scenario001.title, aar, 90);

    expect(record.aar?.overallScore).toBe(aar.overallScore);
    expect(record.aar?.timeline.length).toBe(aar.timeline.length);

    const loaded = getTrainingRecordById(record.id);
    expect(loaded?.scenarioTitle).toBe(scenario001.title);
    expect(loaded?.aar?.missionResult).toBe(aar.missionResult);
    expect(loaded?.aar?.categoryScores.length).toBe(aar.categoryScores.length);
    expect(getTrainingRecords()).toHaveLength(1);
  });

  it('keeps legacy records readable when no AAR snapshot is stored', () => {
    const aar = runSampleScenario();
    const record = saveTrainingRecord(scenario001.id, scenario001.title, aar, 45);
    const stored = getTrainingRecords();
    stored[0] = { ...record, aar: undefined };
    localStorage.setItem('68w-training-records', JSON.stringify(stored));

    const loaded = getTrainingRecordById(record.id);
    expect(loaded?.overallScore).toBe(aar.overallScore);
    expect(loaded?.aar).toBeUndefined();
  });
});
