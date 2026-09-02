import { Link } from 'react-router-dom';
import { MarchTracker } from '@/components/MarchTracker';
import { getPerformanceStats } from '@/lib/persistence';
import { formatDuration } from '@/lib/formatDuration';

const DEFAULT_MARCH = { M: 'UNKNOWN' as const, A: 'UNKNOWN' as const, R: 'UNKNOWN' as const, C: 'UNKNOWN' as const, H: 'UNKNOWN' as const };

export function Dashboard() {
  const stats = getPerformanceStats();

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">68W Training System</h1>
        <p className="page-subtitle">Tactical Casualty Simulation</p>
      </header>

      <div style={{ marginBottom: '2rem' }}>
        <Link to="/scenarios" className="btn btn-primary">
          Start Scenario
        </Link>
      </div>

      <div className="card-grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="stat-label">Scenarios Completed</div>
          <div className="stat-value">{stats.totalScenarios}</div>
        </div>
        <div className="card">
          <div className="stat-label">Overall Proficiency</div>
          <div className="stat-value">{stats.averageScore > 0 ? `${stats.averageScore}%` : '—'}</div>
        </div>
        <div className="card">
          <div className="stat-label">Avg Critical Intervention</div>
          <div className="stat-value">
            {stats.averageCriticalInterventionTime
              ? formatDuration(stats.averageCriticalInterventionTime)
              : '—'}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Weak Areas</div>
          <div className="stat-value" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
            {stats.weakAreas.length > 0 ? stats.weakAreas[0] : 'None identified'}
          </div>
        </div>
      </div>

      <div className="card-grid grid-2">
        <div className="card">
          <div className="stat-label" style={{ marginBottom: '1rem' }}>
            MARCH Performance
          </div>
          <MarchTracker
            status={DEFAULT_MARCH}
            scores={
              stats.totalScenarios > 0
                ? stats.marchAverages
                : undefined
            }
          />
          {stats.totalScenarios === 0 && (
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Complete a scenario to see MARCH performance breakdown.
            </p>
          )}
        </div>

        <div className="card">
          <div
            className="stat-label"
            style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}
          >
            <span>Recent Activity</span>
            <Link to="/performance" className="text-link">
              View on Performance
            </Link>
          </div>
          {stats.recentRecords.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              No training sessions recorded. Start Scenario 001 to begin.
            </p>
          ) : (
            stats.recentRecords.map((record) => (
              <div key={record.id} className="action-log-item">
                <span className="action-log-time">
                  {new Date(record.completedAt).toLocaleDateString()}
                </span>
                {record.scenarioTitle} — {record.overallScore}% ({record.performanceBand})
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
