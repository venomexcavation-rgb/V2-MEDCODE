import type { SimulationState } from '@/engine/types';
import type { ScenarioDefinition } from '@/engine/types';

interface CasualtyPanelProps {
  state: SimulationState;
  scenario: ScenarioDefinition;
}

function NotAssessed() {
  return <span className="info-value not-assessed">NOT ASSESSED</span>;
}

export function CasualtyPanel({ state, scenario }: CasualtyPanelProps) {
  const hasAssessedResponsiveness = state.performedAssessments.includes('check_responsiveness');
  const hasAssessedPulse =
    state.performedAssessments.includes('check_radial_pulse') ||
    state.performedAssessments.includes('assess_circulation');
  const hasAssessedBreathing =
    state.performedAssessments.includes('assess_breathing') ||
    state.performedAssessments.includes('check_respirations');
  const hasAssessedAirway = state.performedAssessments.includes('assess_airway');

  const discoveredFindings = state.findings.filter((f) =>
    state.discoveredFindingIds.includes(f.id),
  );

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <div className="scenario-card-id">Casualty</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          {scenario.casualtyDemographics}
        </div>
      </div>

      <div className="info-row">
        <span className="info-label">Mechanism</span>
        <span className="info-value">{scenario.mechanism}</span>
      </div>

      <div className="info-row">
        <span className="info-label">Presentation</span>
        <span className="info-value" style={{ fontSize: '0.75rem' }}>
          {scenario.initialPresentation}
        </span>
      </div>

      <div style={{ margin: '1rem 0 0.5rem', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
        Vitals & Findings
      </div>

      <div className="info-row">
        <span className="info-label">Responsiveness</span>
        {hasAssessedResponsiveness ? (
          <span className="info-value">{state.physiology.consciousness.toUpperCase()}</span>
        ) : (
          <NotAssessed />
        )}
      </div>

      <div className="info-row">
        <span className="info-label">Airway</span>
        {hasAssessedAirway ? (
          <span className="info-value">{state.physiology.airwayPatent ? 'PATENT' : 'COMPROMISED'}</span>
        ) : (
          <NotAssessed />
        )}
      </div>

      <div className="info-row">
        <span className="info-label">Respirations</span>
        {hasAssessedBreathing ? (
          <span className="info-value">
            {state.physiology.respiratoryRate}/min
            {state.physiology.respiratoryDistress ? ' — LABORED' : ''}
          </span>
        ) : (
          <NotAssessed />
        )}
      </div>

      <div className="info-row">
        <span className="info-label">Radial Pulse</span>
        {hasAssessedPulse ? (
          <span className="info-value">
            {state.physiology.radialPulsePresent
              ? state.physiology.radialPulseQuality.toUpperCase()
              : 'ABSENT'}
          </span>
        ) : (
          <NotAssessed />
        )}
      </div>

      <div className="info-row">
        <span className="info-label">Skin</span>
        {hasAssessedPulse ? (
          <span className="info-value">{state.physiology.skinSigns}</span>
        ) : (
          <NotAssessed />
        )}
      </div>

      {discoveredFindings.length > 0 && (
        <>
          <div style={{ margin: '1rem 0 0.5rem', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            Discovered Findings
          </div>
          {discoveredFindings.map((f) => (
            <div key={f.id} className="info-row fade-in">
              <span className="info-label">{f.category}</span>
              <span className="info-value" style={{ fontSize: '0.75rem' }}>
                {f.label}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
