import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import { getBlogPosts } from '../utils/blog';

const BlogAdminPage = () => {
  const { addToCart, cart, creditBalance } = useStore();
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [cartMessage, setCartMessage] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [viewMode, setViewMode] = useState('manage');

  useEffect(() => {
    if (!loading && !profile?.is_admin) navigate('/');
  }, [profile, loading, navigate]);

  useEffect(() => {
    getBlogPosts(true).then((p) => { setPosts(p); setLoadingPosts(false); });
  }, []);

  useEffect(() => {
    if (!cartMessage) return undefined;
    const t = setTimeout(() => setCartMessage(''), 2200);
    return () => clearTimeout(t);
  }, [cartMessage]);

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
              <Link to="/blog/new" className="btn" style={{ fontSize: 13, padding: '6px 14px' }}>
                + New post
              </Link>
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
