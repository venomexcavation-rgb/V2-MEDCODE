import { useState } from 'react';
import { REFERENCE_LIBRARY, REFERENCE_CATEGORIES } from '@/data/references';

export function Reference() {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filtered =
    activeCategory === 'All'
      ? REFERENCE_LIBRARY
      : REFERENCE_LIBRARY.filter((r) => r.category === activeCategory);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Reference Library</h1>
        <p className="page-subtitle">Validated training material and protocols</p>
      </header>

      <div style={{ marginBottom: '1.5rem' }}>
        <button
          className={`ref-category-btn${activeCategory === 'All' ? ' active' : ''}`}
          onClick={() => setActiveCategory('All')}
        >
          All
        </button>
        {REFERENCE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`ref-category-btn${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="card-grid grid-2">
        {filtered.map((ref) => (
          <div key={ref.id} className="card">
            <div className="scenario-card-id">{ref.category}</div>
            <div className="scenario-card-title" style={{ fontSize: '1rem' }}>
              {ref.title}
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.75rem 0' }}>
              {ref.content}
            </p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Source: {ref.source} | Version: {ref.version} | Updated: {ref.updated}
            </div>
            {ref.placeholder && (
              <div className="ref-placeholder">
                Placeholder reference — pending validated source material
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
