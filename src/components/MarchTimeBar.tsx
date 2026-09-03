import type { MarchLetter } from '@/engine/types';
import { formatDuration } from '@/lib/formatDuration';

const MARCH_LETTERS: MarchLetter[] = ['M', 'A', 'R', 'C', 'H'];

const MARCH_LABELS: Record<MarchLetter, string> = {
  M: 'Massive hemorrhage',
  A: 'Airway',
  R: 'Respiration',
  C: 'Circulation',
  H: 'Hypothermia / Head',
};

interface MarchTimeBarProps {
  totalSeconds: number;
  marchTimeSeconds: Record<MarchLetter, number>;
}

export function MarchTimeBar({ totalSeconds, marchTimeSeconds }: MarchTimeBarProps) {
  const total = Math.max(0, totalSeconds);
  const safeTotal = total > 0 ? total : 1;

  return (
    <div>
      <div
        className="march-time-bar"
        role="img"
        aria-label={MARCH_LETTERS.map(
          (letter) => `${letter} ${formatDuration(marchTimeSeconds[letter] ?? 0)}`,
        ).join(', ')}
      >
        {MARCH_LETTERS.map((letter) => {
          const seconds = Math.max(0, marchTimeSeconds[letter] ?? 0);
          if (seconds <= 0) return null;
          const percent = (seconds / safeTotal) * 100;
          return (
            <div
              key={letter}
              className={`march-time-seg march-time-${letter}`}
              style={{ width: `${percent}%` }}
              title={`${letter} ${MARCH_LABELS[letter]} — ${formatDuration(seconds)}`}
            >
              {percent >= 12 ? letter : ''}
            </div>
          );
        })}
      </div>
      <div className="march-time-legend">
        {MARCH_LETTERS.map((letter) => {
          const seconds = Math.max(0, marchTimeSeconds[letter] ?? 0);
          const percent = total > 0 ? Math.round((seconds / total) * 100) : 0;
          return (
            <div key={letter} className="march-time-legend-item">
              <span className={`march-time-swatch march-time-${letter}`} />
              <span className="march-letter" style={{ fontSize: '1rem', marginBottom: 0 }}>
                {letter}
              </span>
              <span className="march-time-legend-meta">
                {formatDuration(seconds)} · {percent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
