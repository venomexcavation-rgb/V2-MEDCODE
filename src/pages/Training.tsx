import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MarchTracker } from '@/components/MarchTracker';
import { CasualtyPanel } from '@/components/CasualtyPanel';
import { getScenarioById, createInitialState } from '@/scenarios/scenario001';
import { parseActionInput } from '@/engine/actionParser';
import { executeAction, resetEventCounter, tickSimulation } from '@/engine/simulationEngine';
import type { SimulationState } from '@/engine/types';
import { formatDuration } from '@/lib/formatDuration';
import { saveTrainingRecord } from '@/lib/persistence';

interface LogEntry {
  id: string;
  type: 'trainee' | 'simulation' | 'casualty' | 'system';
  text: string;
}

const QUICK_ACTIONS = [
  { label: 'Assess', commands: ['Check for massive hemorrhage', 'Assess airway', 'Assess breathing', 'Check radial pulse'] },
  { label: 'Expose', commands: ['Expose the left leg', 'Expose the chest'] },
  { label: 'Intervention', commands: ['Apply tourniquet high and tight to the left leg', 'Apply chest seal to right chest', 'Initiate IV access', 'Initiate saline lock', 'Prevent hypothermia'] },
  { label: 'Reassess', commands: ['Reassess bleeding', 'Reassess breathing', 'Reassess circulation'] },
  { label: 'Complete', commands: ['Request evacuation', 'End scenario'] },
];

export function Training() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const scenario = getScenarioById(scenarioId ?? '');

  const [state, setState] = useState<SimulationState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [activeQuickMenu, setActiveQuickMenu] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef(false);
  const stateRef = useRef<SimulationState | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!scenario) return;
    resetEventCounter();
    const initial = createInitialState(scenario);
    setState(initial);
    setLogs([
      {
        id: 'intro-1',
        type: 'simulation',
        text: scenario.initialPresentation,
      },
      {
        id: 'intro-2',
        type: 'casualty',
        text: 'Casualty (groaning): "Help… help me…"',
      },
    ]);
  }, [scenario]);

  // Simulation clock tick
  useEffect(() => {
    if (!scenario || !state || state.status !== 'active') return;

    const interval = setInterval(() => {
      setState((prev) => {
        if (!prev || prev.status !== 'active') return prev;
        return tickSimulation(prev, scenario, 1);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scenario, state?.status]);

  // Save AAR and navigate on completion
  useEffect(() => {
    if (!state || !scenario || savedRef.current) return;
    if (state.status === 'completed' || state.status === 'failed') {
      if (state.aar) {
        const record = saveTrainingRecord(scenario.id, scenario.title, state.aar, state.elapsedSeconds);
        savedRef.current = true;
        setLogs((prev) => [
          ...prev,
          {
            id: `end-${Date.now()}`,
            type: 'system',
            text: `Scenario ${state.status.toUpperCase()}. Redirecting to After Action Review…`,
          },
        ]);
        setTimeout(() => {
          navigate(`/training/${scenario.id}/aar`, {
            state: {
              aar: state.aar,
              scenarioTitle: scenario.title,
              recordId: record.id,
            },
          });
        }, 2000);
      }
    }
  }, [state, scenario, navigate]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = useCallback((type: LogEntry['type'], text: string) => {
    setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type, text }]);
  }, []);

  const handleSubmit = useCallback(
    (rawInput: string) => {
      const current = stateRef.current;
      if (!current || !scenario || current.status !== 'active') return;

      const trimmed = rawInput.trim();
      if (!trimmed) return;

      addLog('trainee', trimmed);
      setInput('');

      const parsed = parseActionInput(trimmed);
      if (!parsed.success || !parsed.action) {
        addLog('system', parsed.clarification ?? 'Could not interpret action.');
        return;
      }

      const result = executeAction(current, parsed.action, scenario);
      stateRef.current = result.state;
      setState(result.state);

      for (const msg of result.messages) {
        addLog('simulation', msg);
      }

      if (result.state.status === 'completed' || result.state.status === 'failed') {
        addLog('system', `Scenario ${result.state.status.toUpperCase()}.`);
      }

      const lastDialogue = result.state.dialogueHistory[result.state.dialogueHistory.length - 1];
      if (lastDialogue && !logs.some((l) => l.text === lastDialogue)) {
        addLog('casualty', lastDialogue);
      }
    },
    [scenario, addLog, logs],
  );

  if (!scenario || !state) {
    return (
      <div>
        <p>Scenario not found.</p>
      </div>
    );
  }

  const statusClass =
    state.status === 'active'
      ? 'status-active'
      : state.status === 'completed'
        ? 'status-completed'
        : 'status-failed';

  return (
    <div>
      <div className="sim-header-bar">
        <div className="sim-header-item">
          <div className="sim-header-label">Scenario</div>
          <div className="sim-header-value">{scenario.id}</div>
        </div>
        <div className="sim-header-item">
          <div className="sim-header-label">Elapsed Time</div>
          <div className="sim-header-value">{formatDuration(state.elapsedSeconds)}</div>
        </div>
        <div className="sim-header-item">
          <div className="sim-header-label">Status</div>
          <div className="sim-header-value">
            <span className={`status-badge ${statusClass}`}>{state.status.toUpperCase()}</span>
          </div>
        </div>
        {state.status === 'active' && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleSubmit('End scenario')}
          >
            End Scenario
          </button>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <MarchTracker status={state.marchStatus} />
      </div>

      <div className="sim-layout">
        <div className="sim-panel">
          <div className="sim-panel-header">Casualty</div>
          <div className="sim-panel-body">
            <CasualtyPanel state={state} scenario={scenario} />
          </div>
        </div>

        <div className="sim-panel sim-interaction">
          <div className="sim-panel-header">Simulation</div>
          <div className="sim-log">
            {logs.map((entry) => (
              <div key={entry.id} className={`log-entry ${entry.type} fade-in`}>
                <div className="log-label">{entry.type}</div>
                {entry.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
          <div className="sim-input-area">
            <div className="quick-actions">
              {QUICK_ACTIONS.map((qa) => (
                <div key={qa.label} style={{ position: 'relative' }}>
                  <button
                    className="quick-btn"
                    onClick={() =>
                      setActiveQuickMenu(activeQuickMenu === qa.label ? null : qa.label)
                    }
                    disabled={state.status !== 'active'}
                  >
                    {qa.label}
                  </button>
                  {activeQuickMenu === qa.label && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '2px',
                        padding: '0.5rem',
                        zIndex: 10,
                        minWidth: '220px',
                      }}
                    >
                      {qa.commands.map((cmd) => (
                        <button
                          key={cmd}
                          className="quick-btn"
                          style={{ display: 'block', width: '100%', marginBottom: '0.25rem', textAlign: 'left' }}
                          onClick={() => {
                            setActiveQuickMenu(null);
                            handleSubmit(cmd);
                          }}
                        >
                          {cmd}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <form
              className="sim-input-row"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(input);
              }}
            >
              <input
                className="sim-input"
                placeholder="Describe your assessment or intervention…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={state.status !== 'active'}
              />
              <button type="submit" className="btn btn-primary" disabled={state.status !== 'active'}>
                Execute
              </button>
            </form>
          </div>
        </div>

        <div className="sim-panel">
          <div className="sim-panel-header">Action Log</div>
          <div className="sim-panel-body">
            {state.events.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No actions recorded yet.</p>
            ) : (
              state.events.map((evt) => (
                <div key={evt.id} className="action-log-item">
                  <span className="action-log-time">{formatDuration(evt.timestamp)}</span>
                  {evt.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
