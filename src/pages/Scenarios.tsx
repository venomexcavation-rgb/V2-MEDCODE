import { Link } from 'react-router-dom';
import { SCENARIOS, PLACEHOLDER_SCENARIOS } from '@/scenarios/scenario001';

export function Scenarios() {
  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Scenario Library</h1>
        <p className="page-subtitle">Select a training scenario</p>
      </header>

      <div className="card-grid grid-2">
        {SCENARIOS.map((scenario) => (
          <Link
            key={scenario.id}
            to={`/training/${scenario.id}`}
            className="card scenario-card"
          >
            <div className="scenario-card-id">{scenario.id}</div>
            <div className="scenario-card-title">{scenario.title}</div>
            <div className="scenario-meta">
              <div>
                <strong>Environment:</strong> {scenario.environment}
              </div>
              <div>
                <strong>Difficulty:</strong> {scenario.difficulty}
              </div>
              <div>
                <strong>Mechanism:</strong> {scenario.mechanism}
              </div>
              <div>
                <strong>Focus:</strong> {scenario.trainingFocus.join(' / ')}
              </div>
              <div>
                <strong>Estimated Time:</strong> {scenario.estimatedMinutes}
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <span className="tag tag-available">Available</span>
            </div>
          </Link>
        ))}

        {PLACEHOLDER_SCENARIOS.map((scenario) => (
          <div key={scenario.id} className="card scenario-card disabled">
            <div className="scenario-card-id">{scenario.id}</div>
            <div className="scenario-card-title">{scenario.title}</div>
            <div className="scenario-meta">
              <div>
                <strong>Environment:</strong> {scenario.environment}
              </div>
              <div>
                <strong>Difficulty:</strong> {scenario.difficulty}
              </div>
              <div>
                <strong>Mechanism:</strong> {scenario.mechanism}
              </div>
              <div>
                <strong>Focus:</strong> {scenario.trainingFocus.join(' / ')}
              </div>
              <div>
                <strong>Estimated Time:</strong> {scenario.estimatedMinutes}
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <span className="tag tag-soon">Coming Soon</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
