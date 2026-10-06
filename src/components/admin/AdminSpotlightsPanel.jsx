import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBlogPosts, setStorySpotlight } from '../../utils/blog';
import { supabase } from '../../lib/supabase';

export default function AdminSpotlightsPanel() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPosts = () => {
    setLoading(true);
    getBlogPosts(true)
      .then((p) => setPosts(p))
      .catch(() => setError('Failed to load stories.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleSpotlightToggle = async (post) => {
    setError('');
    try {
      await setStorySpotlight(post.id, { spotlight: !post.isSpotlight });
      loadPosts();
    } catch {
      setError('Failed to update spotlight.');
    }
  };

  const handleMainSpotlightToggle = async (post) => {
    setError('');
    try {
      await setStorySpotlight(post.id, { main: !post.isMainSpotlight });
      loadPosts();
    } catch {
      setError('Failed to update main spotlight.');
    }
  };

  const [magazines, setMagazines] = useState([]);
  const [magsLoading, setMagsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('magazines')
      .select('id, title, slug, cover_url, status, is_spotlight')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setMagazines(data || []);
        setMagsLoading(false);
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

  const spotlighted = posts.filter((p) => p.isSpotlight);
  const mainPost = spotlighted.find((p) => p.isMainSpotlight);
  const spotlightedMags = magazines.filter((m) => m.is_spotlight);

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <p className="eyebrow">Homepage</p>
          <h2>Story spotlights</h2>
          <p className="muted">
            Pick up to three stories for the homepage "Stories in Focus" section.
            The main spotlight is shown as the large feature card.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Spotlighted stories', value: spotlighted.length },
            { label: 'Main story set', value: mainPost ? 'Yes' : 'No' },
            { label: 'Spotlighted magazines', value: spotlightedMags.length },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
              <div className="muted small">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div className="adm-users-loading">
          <div className="adm-users-loading-spinner" />
          <p className="muted">Loading stories…</p>
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p className="muted">No blog posts yet.</p>
          <Link className="btn" to="/blog/new" style={{ marginTop: 12, display: 'inline-block' }}>
            Create your first post
          </Link>
        </div>
      ) : (
        <div className="blog-manage-table">
          {posts.map((post) => (
            <article key={post.id} className="blog-manage-item">
              <div className="blog-manage-item-head">
                <div className="blog-manage-item-title">
                  <h3>{post.title}</h3>
                  <p className="muted small">{post.excerpt}</p>
                </div>
                <div className="blog-manage-item-status">
                  {post.isMainSpotlight && <span className="status-badge published" style={{ marginRight: 4 }}>Main spotlight</span>}
                  {post.isSpotlight && !post.isMainSpotlight && <span className="status-badge scheduled" style={{ marginRight: 4 }}>Spotlight</span>}
                  {!post.published && <span className="status-badge draft">Draft</span>}
                </div>
              </div>
              <div className="blog-manage-item-meta">
                <div className="meta-group">
                  {post.tag && <span className="tag">{post.tag}</span>}
                  <span className="muted small">{post.date}</span>
                </div>
              </div>
              <div className="blog-manage-item-actions">
                <button
                  className={`ghost small-btn${post.isSpotlight ? ' blog-spotlight-btn--on' : ''}`}
                  type="button"
                  onClick={() => handleSpotlightToggle(post)}
                >
                  {post.isSpotlight ? 'In spotlight ✓' : 'Spotlight'}
                </button>
                <button
                  className={`ghost small-btn${post.isMainSpotlight ? ' blog-spotlight-btn--main' : ''}`}
                  type="button"
                  onClick={() => handleMainSpotlightToggle(post)}
                >
                  {post.isMainSpotlight ? 'Main spotlight ✓' : 'Make main'}
                </button>
                <Link className="ghost small-btn" to={`/blog/${post.id}`}>View</Link>
                <Link className="ghost small-btn" to={`/blog/${post.id}/edit`}>Edit</Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <h3 style={{ margin: '36px 0 12px', fontSize: 18 }}>Magazines</h3>
      <p className="muted" style={{ marginBottom: 16 }}>
        Spotlighted published magazines appear in the homepage magazine spotlight row.
      </p>

      {magsLoading ? (
        <div className="adm-users-loading">
          <div className="adm-users-loading-spinner" />
          <p className="muted">Loading magazines…</p>
        </div>
      ) : magazines.length === 0 ? (
        <p className="muted">No magazines yet.</p>
      ) : (
        <div className="blog-manage-table">
          {magazines.map((mag) => (
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
      )}
    </div>
  );
}
