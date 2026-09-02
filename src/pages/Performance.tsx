import { Link } from 'react-router-dom';
import { MarchTracker } from '@/components/MarchTracker';
import { getPerformanceStats, getTrainingRecords } from '@/lib/persistence';
import { formatDuration } from '@/lib/formatDuration';

export function Performance() {
  const stats = getPerformanceStats();
  const records = getTrainingRecords();

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Performance</h1>
        <p className="page-subtitle">Training history and proficiency tracking</p>
      </header>

      <div className="card-grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-value">{stats.totalScenarios}</div>
        </div>
        <div className="card">
          <div className="stat-label">Average Score</div>
          <div className="stat-value">{stats.averageScore > 0 ? `${stats.averageScore}%` : '—'}</div>
        </div>
        <div className="card">
          <div className="stat-label">Avg Critical Time</div>
          <div className="stat-value">
            {stats.averageCriticalInterventionTime
              ? formatDuration(stats.averageCriticalInterventionTime)
              : '—'}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Weak Areas</div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            {stats.weakAreas.length > 0
              ? stats.weakAreas.map((w) => <div key={w}>{w}</div>)
              : 'None identified'}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="stat-label" style={{ marginBottom: '1rem' }}>
          MARCH Averages
        </div>
        {stats.totalScenarios > 0 ? (
          <MarchTracker
            status={{ M: 'UNKNOWN', A: 'UNKNOWN', R: 'UNKNOWN', C: 'UNKNOWN', H: 'UNKNOWN' }}
            scores={stats.marchAverages}
          />
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Complete scenarios to track MARCH performance over time.
          </p>
        )}
      </div>

      <div className="aar-section">
        <div className="aar-section-title">Session History</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Open a completed session to review its After Action Review.
        </p>
        {records.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--text-secondary)' }}>No completed scenarios yet.</p>
            <Link to="/scenarios" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Start Training
            </Link>
          </div>
        ) : (
          records.map((record) => (
            <Link
              key={record.id}
              to={`/performance/${record.id}`}
              className="card scenario-card session-history-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="scenario-card-id">{record.scenarioId}</div>
                  <strong>{record.scenarioTitle}</strong>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {new Date(record.completedAt).toLocaleString()} — Duration:{' '}
                    {formatDuration(record.durationSeconds)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                    {record.overallScore}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {record.performanceBand}
                  </div>
                </div>
              </div>
              {record.weakAreas.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  {record.weakAreas.map((w) => (
                    <span key={w} className="tag">
                      {w}
                    </span>
                  ))}
                </div>
              )}
              <div className="session-history-cta">
                {record.aar ? 'Open After Action Review' : 'Open session summary'}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
