import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import { getBlogPosts } from '../utils/blog';
import { supabase } from '../lib/supabase';

const TAGS = ['Travel', 'Landscape', 'Portrait', 'Behind the Lens', 'Gear', 'Street', 'Nature', 'Wildlife'];

const PEXELS_IMAGES = [
  'https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg',
  'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg',
  'https://images.pexels.com/photos/147411/italy-mountains-dawn-daybreak-147411.jpeg',
  'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg',
  'https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg',
  'https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg',
  'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg',
  'https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg',
  'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg',
  'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg',
];

const EXCERPTS = [
  'A journey through light and shadow — how the golden hour transforms ordinary scenes into something extraordinary.',
  'Chasing waterfalls across three continents taught me more about patience than any photography course ever could.',
  'The difference between a good shot and a great one often comes down to a single degree of perspective.',
  'What happens when you put down the camera and simply observe? Sometimes the best photos start with not shooting.',
  'Exploring the forgotten corners of the city at dawn, where the streets belong to no one and the light belongs to everyone.',
  'Every portrait is a negotiation — between the photographer, the subject, and the light that brings them together.',
  'After years of shooting landscapes, I finally understand what Ansel Adams meant by previsualization.',
  'The gear debate is endless, but the truth is your vision matters more than your sensor.',
];

const PARAGRAPHS = [
  '<p>There\'s a particular quality of light that exists only in the hour after sunrise. Photographers call it the golden hour, but that name barely does it justice — it\'s softer than gold, warmer than bronze, and it disappears before you\'ve had a chance to fully appreciate it.</p>',
  '<p>I\'ve been chasing this light for years. Not just photographically, but philosophically. What does it mean to be present in a moment that is, by its very nature, fleeting? The camera forces you to answer that question every time you raise it to your eye.</p>',
  '<p>The best landscape photographers I know share one trait: they arrive before the light does. They stand in the dark, tripod planted, and they wait. Not with frustration, but with a kind of open curiosity. What will this place reveal today?</p>',
  '<p>Color theory says that complementary colors create tension and harmony simultaneously. Blue hour and the warm lights of a city are a perfect illustration — the coolness of the sky pushing against the amber of street lamps, each making the other more vivid.</p>',
  '<p>Composition is a language, and like any language, fluency comes with time. At first you follow rules — rule of thirds, leading lines, negative space. Then one day you start breaking them deliberately, and that\'s when things get interesting.</p>',
];

const generateTestPosts = async (count) => {
  const now = new Date();
  const inserts = Array.from({ length: count }, (_, i) => {
    const date = new Date(now - i * 86400000 * 2);
    const tag = TAGS[i % TAGS.length];
    const imageUrl = PEXELS_IMAGES[i % PEXELS_IMAGES.length];
    const excerpt = EXCERPTS[i % EXCERPTS.length];
    const para = PARAGRAPHS[i % PARAGRAPHS.length];
    const num = i + 1;
    return {
      title: `Test Post ${num}: ${tag} — ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
      excerpt,
      tag,
      date: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      content_html: `${para}${PARAGRAPHS[(i + 1) % PARAGRAPHS.length]}`,
      published: true,
      author_name: 'Caleb Wolf',
      author_initials: 'CW',
      publish_date: date.toISOString().slice(0, 10),
      read_time: 3 + (i % 5),
      last_edited: now.toISOString(),
      _image_url: imageUrl,
    };
  });

  const results = [];
  for (const post of inserts) {
    const { _image_url, ...postData } = post;
    const { data, error } = await supabase.from('blog_posts').insert(postData).select('id').single();
    if (!error && data) {
      await supabase.from('blog_images').insert({
        post_id: data.id,
        title: `Photo for ${postData.title}`,
        url: _image_url,
        price: 3,
        sort_order: 0,
        focus_x: 50,
        focus_y: 50,
      });
      results.push(data.id);
    }
  }
  return results.length;
};

const BlogAdminPage = () => {
  const { addToCart, cart, creditBalance } = useStore();
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [cartMessage, setCartMessage] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [viewMode, setViewMode] = useState('manage');
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState(null);

  const reloadPosts = () => {
    setLoadingPosts(true);
    getBlogPosts(true).then((p) => { setPosts(p); setLoadingPosts(false); });
  };

  useEffect(() => {
    if (!loading && !profile?.is_admin) navigate('/');
  }, [profile, loading, navigate]);

  useEffect(() => {
    reloadPosts();
  }, []);

  useEffect(() => {
    if (!cartMessage) return undefined;
    const t = setTimeout(() => setCartMessage(''), 2200);
    return () => clearTimeout(t);
  }, [cartMessage]);

  useEffect(() => {
    if (!genMsg) return undefined;
    const t = setTimeout(() => setGenMsg(null), 3000);
    return () => clearTimeout(t);
  }, [genMsg]);

  const handleGenerate = async () => {
    const n = Math.min(Math.max(1, Number(genCount) || 1), 50);
    setGenerating(true);
    setGenMsg(null);
    try {
      const created = await generateTestPosts(n);
      setGenMsg({ type: 'success', text: `Created ${created} test post${created !== 1 ? 's' : ''}.` });
      reloadPosts();
    } catch {
      setGenMsg({ type: 'error', text: 'Failed to generate posts.' });
    }
    setGenerating(false);
  };

  const handleAddToCart = (post, image) => {
    addToCart({ id: image.id, title: image.title, price: image.price, collectionTitle: post.title, preview: image.url });
    setCartMessage('Added image to cart.');
  };

  if (loading || !profile?.is_admin) return null;

  const publishedCount = posts.filter((p) => p.published).length;
  const draftCount = posts.filter((p) => !p.published).length;

  return (
    <div className="site-wrap">
      {/* ── Navbar ── */}
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link to="/" className="site-logo">Caleb Wolf</Link>
          <div className="site-nav-actions" style={{ marginLeft: 'auto' }}>
            <Link to="/admin" className="site-admin-btn">← Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="adm-layout">
        {/* Sidebar */}
        <aside className="adm-sidebar">
          <div className="adm-sidebar-header">
            <div>
              <p className="adm-sidebar-eyebrow">Blog</p>
              <h2 className="adm-sidebar-title">Admin</h2>
            </div>
          </div>
          <nav className="adm-nav">
            <button
              type="button"
              className={`adm-nav-item${viewMode === 'manage' ? ' active' : ''}`}
              onClick={() => setViewMode('manage')}
            >
              <span className="adm-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </span>
              <span className="adm-nav-label">All Posts</span>
            </button>
            <button
              type="button"
              className={`adm-nav-item${viewMode === 'preview' ? ' active' : ''}`}
              onClick={() => setViewMode('preview')}
            >
              <span className="adm-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </span>
              <span className="adm-nav-label">Preview Feed</span>
            </button>
          </nav>
          <div className="adm-sidebar-footer">
            <Link to="/blog/new" className="adm-sidebar-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Post
            </Link>
            <Link to="/blog" className="adm-sidebar-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              View Blog
            </Link>
          </div>
        </aside>

        {/* Main */}
        <div className="adm-main">
          <header className="adm-topbar">
            <div className="adm-topbar-breadcrumb">
              <span className="adm-topbar-section">Blog</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
              <span className="adm-topbar-current">{viewMode === 'manage' ? 'All Posts' : 'Preview Feed'}</span>
            </div>
            <div className="adm-topbar-right">
              <Link to="/blog/new" className="btn">+ New post</Link>
              <div className="adm-avatar">
                {profile?.display_name?.[0]?.toUpperCase() || 'A'}
              </div>
            </div>
          </header>

          <div className="adm-content">
            <div className="adm-panel">
              <div className="adm-panel-header">
                <div>
                  <p className="eyebrow">Blog</p>
                  <h2>{viewMode === 'manage' ? 'All Posts' : 'Preview Feed'}</h2>
                  <p className="muted">Manage and publish your blog content.</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 20 }}>
                    {[
                      { label: 'Total', value: posts.length },
                      { label: 'Published', value: publishedCount },
                      { label: 'Drafts', value: draftCount },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
                        <div className="muted small">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {cartMessage && <div className="notice" style={{ marginBottom: 12 }}>{cartMessage}</div>}
              {genMsg && (
                <div className={genMsg.type === 'success' ? 'notice' : 'auth-error'} style={{ marginBottom: 12 }}>
                  {genMsg.text}
                </div>
              )}

              {/* ── Generate test posts ── */}
              <div className="blog-gen-row">
                <span className="muted small">Generate test posts:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={genCount}
                  onChange={(e) => setGenCount(e.target.value)}
                  className="blog-gen-input"
                  disabled={generating}
                />
                <button
                  type="button"
                  className="ghost"
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{ fontSize: 13 }}
                >
                  {generating ? 'Generating…' : 'Generate'}
                </button>
              </div>

              {viewMode === 'manage' && (
                loadingPosts ? (
                  <div className="adm-users-loading">
                    <div className="adm-users-loading-spinner" />
                    <p className="muted">Loading posts…</p>
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
                            <span className={`status-badge ${post.published ? 'published' : 'draft'}`}>
                              {post.published ? 'Published' : 'Draft'}
                            </span>
                          </div>
                        </div>
                        <div className="blog-manage-item-meta">
                          <div className="meta-group">
                            <span className="tag">{post.tag}</span>
                            <span className="muted small">{post.date}</span>
                          </div>
                          {post.images?.length > 0 && (
                            <span className="muted small">{post.images.length} images</span>
                          )}
                        </div>
                        <div className="blog-manage-item-actions">
                          <Link className="ghost small-btn" to={`/blog/${post.id}`}>View</Link>
                          <Link className="ghost small-btn" to={`/blog/${post.id}/edit`}>Edit</Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )
              )}

              {viewMode === 'preview' && (
                posts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <p className="muted">No blog posts to preview yet.</p>
                  </div>
                ) : (
                  <div className="grid blog-grid">
                    {posts.map((post) => (
                      <article key={post.id} className="card blog blog-post-card">
                        <div className="card-body">
                          <div className="tag">{post.tag}</div>
                          <h3><Link to={`/blog/${post.id}`}>{post.title}</Link></h3>
                          <p className="muted">{post.excerpt}</p>
                          <p className="muted small">{post.date}</p>
                        </div>
                        {post.images?.length > 0 && (
                          <div className="blog-post-images">
                            {post.images.slice(0, 3).map((image) => (
                              <div key={image.id} className="blog-post-image-card">
                                <img
                                  src={image.url}
                                  alt={image.title}
                                  style={{ '--frame-position': `${image.focusX ?? 50}% ${image.focusY ?? 50}%` }}
                                />
                                <div className="blog-post-image-body">
                                  <div>
                                    <strong>{image.title}</strong>
                                    <p className="muted small">{image.price} credits</p>
                                  </div>
                                  <button className="pill" type="button" onClick={() => handleAddToCart(post, image)}>
                                    Buy photo
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogAdminPage;
