import { Link } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import { MarchTracker } from '@/components/MarchTracker';
import type { AARResult } from '@/engine/aar';
import { formatDuration } from '@/lib/formatDuration';

function bandClass(band: string): string {
  switch (band) {
    case 'Excellent':
      return 'band-excellent';
    case 'Proficient':
      return 'band-proficient';
    case 'Needs Improvement':
      return 'band-needs-improvement';
    default:
      return 'band-unsatisfactory';
  }
}

interface AARViewProps {
  aar: AARResult;
  scenarioTitle?: string;
  completedAt?: string;
  primaryTo: string;
  primaryLabel: string;
  secondaryTo: string;
  secondaryLabel: string;
}

export function AARView({
  aar,
  scenarioTitle,
  completedAt,
  primaryTo,
  primaryLabel,
  secondaryTo,
  secondaryLabel,
}: AARViewProps) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);
  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">After Action Review</h1>
        <p className="page-subtitle">{scenarioTitle ?? 'Training Scenario'}</p>
        {completedAt && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Session completed {new Date(completedAt).toLocaleString()}
          </p>
        )}
      </header>

      <div className="card-grid grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="stat-label">Mission Result</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {aar.missionResult}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Casualty Outcome</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {aar.casualtyOutcome}
          </p>
        </div>
      </div>

      <div className="card-grid grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="stat-label">Overall Performance</div>
          <div className="aar-score-large">{aar.overallScore}</div>
          <span className={`performance-band ${bandClass(aar.performanceBand)}`}>
            {aar.performanceBand}
          </span>
        </div>
        <div className="card">
          <div className="stat-label">Time to Critical Intervention</div>
          <div className="stat-value">
            {aar.timeToCriticalIntervention
              ? formatDuration(aar.timeToCriticalIntervention)
              : '—'}
          </div>
        </div>
      </div>

      <div className="aar-section">
        <div className="aar-section-title">MARCH Performance</div>
        <MarchTracker
          status={{ M: 'UNKNOWN', A: 'UNKNOWN', R: 'UNKNOWN', C: 'UNKNOWN', H: 'UNKNOWN' }}
          scores={aar.marchScores}
        />
      </div>

      {aar.criticalErrors.length > 0 && (
        <div className="aar-section">
          <div className="aar-section-title">Critical Errors</div>
          {aar.criticalErrors.map((check) => (
            <div key={check.id} className="check-item critical failed">
              <strong>{check.label}</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {check.detail}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="aar-section">
        <div className="aar-section-title">Category Breakdown</div>
        {aar.categoryScores.map((cat) => (
          <div key={cat.category} className="card" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong>{cat.label}</strong>
              <span>{cat.percentage}%</span>
            </div>
            {cat.checks.map((check) => (
              <div
                key={check.id}
                className={`check-item ${check.passed ? 'passed' : 'failed'}${check.critical ? ' critical' : ''}`}
              >
                {check.label} — {check.detail}
              </div>
            ))}
          </div>
        ))}
      </div>

      {aar.missedFindings.length > 0 && (
        <div className="aar-section">
          <div className="aar-section-title">Missed Findings</div>
          <ul className="feedback-list">
            {aar.missedFindings.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {aar.sequenceDeviations.length > 0 && (
        <div className="aar-section">
          <div className="aar-section-title">Sequence / Priority Issues</div>
          <ul className="feedback-list">
            {aar.sequenceDeviations.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="aar-section">
        <div className="aar-section-title">TCCC Guideline Alignment</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Guideline version: {aar.tcccGuidelineVersionId ?? '—'}
          {aar.tcccGuidelineVersionDate ? ` (${aar.tcccGuidelineVersionDate})` : ''}
          . Clinical expected-behavior text is shown only when verified against CoTCCC / JTS
          source material.
        </p>
        {(aar.tcccResults ?? []).map((result) => (
          <div
            key={result.ruleId}
            className={`check-item ${result.outcome === 'completed' ? 'passed' : 'failed'}`}
          >
            <strong>{result.ruleId}</strong> — {result.title}
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Outcome: {result.outcome.replace(/_/g, ' ')}. {result.evidenceDetail}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Expected behavior: {result.expectedBehavior}
              {result.source
                ? ` | ${result.source.authority} | ${result.source.document} | ${result.source.versionDate}`
                : ''}
              {result.verified ? '' : ' | UNVERIFIED'}
            </p>
          </div>
        ))}
        {(aar.unknownTcccRuleIds ?? []).length > 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--warning-text)' }}>
            Unknown TCCC rule IDs ignored: {aar.unknownTcccRuleIds.join(', ')}
          </p>
        )}
      </div>

      <div className="aar-section">
        <div className="aar-section-title">What Went Well</div>
        <ul className="feedback-list">
          {aar.whatWentWell.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="aar-section">
        <div className="aar-section-title">What Needs Improvement</div>
        <ul className="feedback-list">
          {aar.needsImprovement.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="aar-section">
        <div className="aar-section-title">Recommended Training</div>
        <ul className="feedback-list">
          {aar.recommendedTraining.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="aar-section">
        <div className="aar-section-title">Timeline</div>
        {aar.timeline.map((entry) => (
          <div key={`${entry.timestamp}-${entry.label}`} className="timeline-item">
            <span className="timeline-time">{entry.formattedTime}</span>
            <span>{entry.label}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Link to={primaryTo} className="btn btn-primary">
          {primaryLabel}
        </Link>
        <Link to={secondaryTo} className="btn btn-secondary">
          {secondaryLabel}
        </Link>
      </div>
    </div>
  );
}
