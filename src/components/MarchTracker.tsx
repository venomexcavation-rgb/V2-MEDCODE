import type { MarchLetter, MarchStatus } from '@/engine/types';

const MARCH_LETTERS: MarchLetter[] = ['M', 'A', 'R', 'C', 'H'];

interface MarchTrackerProps {
  status: Record<MarchLetter, MarchStatus>;
  scores?: Record<MarchLetter, number>;
}

export function MarchTracker({ status, scores }: MarchTrackerProps) {
  return (
    <div className="march-tracker">
      {MARCH_LETTERS.map((letter) => {
        const s = status[letter];
        const statusClass = s.toLowerCase();
        return (
          <div key={letter} className="march-item">
            <span className="march-letter">{letter}</span>
            {scores ? (
              <span className="march-status">{scores[letter]}%</span>
            ) : (
              <span className={`march-status ${statusClass}`}>{s}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
