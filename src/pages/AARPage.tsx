import { Link, useLocation } from 'react-router-dom';
import { AARView } from '@/components/AARView';
import type { AARResult } from '@/engine/aar';

export function AARPage() {
  const location = useLocation();
  const aar = location.state?.aar as AARResult | undefined;
  const scenarioTitle = location.state?.scenarioTitle as string | undefined;
  const recordId = location.state?.recordId as string | undefined;

  if (!aar) {
    return (
      <div>
        <p>No AAR data available. Open a saved session from Performance.</p>
        <Link to="/performance" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Performance History
        </Link>
      </div>
    );
  }

  return (
    <AARView
      aar={aar}
      scenarioTitle={scenarioTitle}
      primaryTo={recordId ? `/performance/${recordId}` : '/performance'}
      primaryLabel="Performance History"
      secondaryTo="/"
      secondaryLabel="Dashboard"
    />
  );
}
