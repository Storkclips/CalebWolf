import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function MagazineSpotlightsPanel() {
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    supabase
      .from('magazines')
      .select('id, title, slug, cover_url, status, is_spotlight')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setMagazines(data || []);
        setLoading(false);
      });
  }, []);

  const handleMagSpotlightToggle = async (mag) => {
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('magazines')
        .update({ is_spotlight: !mag.is_spotlight })
        .eq('id', mag.id);
      if (updateError) throw updateError;
      setMagazines((prev) => prev.map((m) => (m.id === mag.id ? { ...m, is_spotlight: !mag.is_spotlight } : m)));
    } catch {
      setError('Failed to update magazine spotlight.');
    }
  };

  const spotlightedMags = magazines.filter((m) => m.is_spotlight);
  const q = query.trim().toLowerCase();
  const visibleMagazines = magazines.filter((m) => !q || m.title.toLowerCase().includes(q));

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <p className="eyebrow">Homepage</p>
          <h2>Magazine spotlights</h2>
          <p className="muted">
            Spotlighted published magazines appear in the homepage "Featured Magazines" row.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{spotlightedMags.length}</div>
            <div className="muted small">Spotlighted magazines</div>
          </div>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div className="adm-users-loading">
          <div className="adm-users-loading-spinner" />
          <p className="muted">Loading magazines…</p>
        </div>
      ) : magazines.length === 0 ? (
        <p className="muted">No magazines yet.</p>
      ) : (
        <>
          <input
            className="adm-spotlight-flyout-search"
            style={{ maxWidth: 320, marginBottom: 14 }}
            type="text"
            placeholder="Search magazines…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="blog-manage-table">
            {visibleMagazines.length === 0 && (
              <p className="muted" style={{ padding: '12px 4px' }}>No matching magazines.</p>
            )}
            {visibleMagazines.map((mag) => (
              <article key={mag.id} className="blog-manage-item">
                <div className="blog-manage-item-head">
                  <div className="blog-manage-item-title">
                    <h3>{mag.title}</h3>
                    <p className="muted small">/{mag.slug}</p>
                  </div>
                  <div className="blog-manage-item-status">
                    {mag.is_spotlight && <span className="status-badge published" style={{ marginRight: 4 }}>Spotlight</span>}
                    {mag.status !== 'published' && <span className="status-badge draft">{mag.status}</span>}
                  </div>
                </div>
                <div className="blog-manage-item-actions">
                  <button
                    className={`ghost small-btn${mag.is_spotlight ? ' blog-spotlight-btn--on' : ''}`}
                    type="button"
                    onClick={() => handleMagSpotlightToggle(mag)}
                  >
                    {mag.is_spotlight ? 'In spotlight ✓' : 'Spotlight'}
                  </button>
                  <Link className="ghost small-btn" to={`/magazines/${mag.slug}`}>View</Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
