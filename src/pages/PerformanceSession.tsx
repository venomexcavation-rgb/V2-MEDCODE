import { Link, useParams } from 'react-router-dom';
import { AARView } from '@/components/AARView';
import { MarchTracker } from '@/components/MarchTracker';
import { getTrainingRecordById } from '@/lib/persistence';
import { formatDuration } from '@/lib/formatDuration';

export function PerformanceSession() {
  const { recordId } = useParams<{ recordId: string }>();
  const record = recordId ? getTrainingRecordById(recordId) : undefined;

  if (!record) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">Session Not Found</h1>
          <p className="page-subtitle">This training record is not in local history.</p>
        </header>
        <Link to="/performance" className="btn btn-primary">
          Back to Performance
        </Link>
      </div>
    );
  }

  if (record.aar) {
    return (
      <AARView
        aar={record.aar}
        scenarioTitle={record.scenarioTitle}
        completedAt={record.completedAt}
        primaryTo="/performance"
        primaryLabel="Back to Performance"
        secondaryTo={`/training/${record.scenarioId}`}
        secondaryLabel="Replay Scenario"
      />
    );
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Session Summary</h1>
        <p className="page-subtitle">{record.scenarioTitle}</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          Completed {new Date(record.completedAt).toLocaleString()}
        </p>
      </header>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Full After Action Review was not stored for this session. Score, MARCH, and weak areas
          are still available. New completions save the complete AAR here.
        </p>
      </div>

      <div className="card-grid grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="stat-label">Overall Score</div>
          <div className="aar-score-large">{record.overallScore}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {record.performanceBand}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Duration / Critical Intervention</div>
          <div className="stat-value">{formatDuration(record.durationSeconds)}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Critical intervention:{' '}
            {record.timeToCriticalIntervention
              ? formatDuration(record.timeToCriticalIntervention)
              : '—'}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-label" style={{ marginBottom: '0.75rem' }}>
          Casualty Outcome
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{record.casualtyOutcome}</p>
      </div>

      <div className="aar-section">
        <div className="aar-section-title">MARCH Performance</div>
        <MarchTracker
          status={{ M: 'UNKNOWN', A: 'UNKNOWN', R: 'UNKNOWN', C: 'UNKNOWN', H: 'UNKNOWN' }}
          scores={record.marchScores}
        />
      </div>

      {record.weakAreas.length > 0 && (
        <div className="aar-section">
          <div className="aar-section-title">Weak Areas</div>
          {record.weakAreas.map((area) => (
            <span key={area} className="tag">
              {area}
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Link to="/performance" className="btn btn-primary">
          Back to Performance
        </Link>
        <Link to={`/training/${record.scenarioId}`} className="btn btn-secondary">
          Replay Scenario
        </Link>
      </div>
    </div>
  );
}
