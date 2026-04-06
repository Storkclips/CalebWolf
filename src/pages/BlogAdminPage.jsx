import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
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
    if (!loading && !profile?.is_admin) {
      navigate('/');
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    const loadPosts = async () => {
      const fetchedPosts = await getBlogPosts(true);
      setPosts(fetchedPosts);
      setLoadingPosts(false);
    };
    loadPosts();
  }, []);

  useEffect(() => {
    if (!cartMessage) return undefined;
    const timer = setTimeout(() => setCartMessage(''), 2200);
    return () => clearTimeout(timer);
  }, [cartMessage]);

  const handleAddToCart = (post, image) => {
    addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: post.title,
      preview: image.url,
    });
    setCartMessage('Added image to cart.');
  };

  if (loading || !profile?.is_admin) {
    return null;
  }

  const publishedCount = posts.filter((p) => p.published).length;
  const draftCount = posts.filter((p) => !p.published).length;

  return (
    <Layout>
      <section className="blog-admin-header">
        <div className="blog-admin-header-content">
          <div>
            <p className="eyebrow">Blog admin</p>
            <h1>Manage blog posts</h1>
            <p className="lead">
              Create, edit, and publish blog content. View admin controls and article details.
            </p>
          </div>
          <div className="blog-admin-stats">
            <div className="stat-box">
              <div className="stat-number">{posts.length}</div>
              <div className="stat-label">Total posts</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">{publishedCount}</div>
              <div className="stat-label">Published</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">{draftCount}</div>
              <div className="stat-label">Drafts</div>
            </div>
          </div>
        </div>
        <div className="blog-admin-actions">
          <Link className="pill" to="/blog/new">
            + Create new post
          </Link>
          <Link className="ghost" to="/cart">
            View cart ({cart.length})
          </Link>
        </div>
        {cartMessage && <div className="notice">{cartMessage}</div>}
      </section>

      <section className="blog-admin-toolbar">
        <div className="blog-admin-tabs">
          <button
            className={`blog-admin-tab ${viewMode === 'manage' ? 'active' : ''}`}
            onClick={() => setViewMode('manage')}
          >
            Manage posts
          </button>
          <button
            className={`blog-admin-tab ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setViewMode('preview')}
          >
            Preview feed
          </button>
        </div>
        <div className="blog-admin-info">
          <span className="muted small">Credits available: {creditBalance}</span>
        </div>
      </section>

      {viewMode === 'manage' && (
        <section className="blog-admin-manage">
          {loadingPosts ? (
            <div className="loading-state">
              <p className="muted">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <p className="muted">No blog posts yet.</p>
              <Link className="pill" to="/blog/new">
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
                      {post.published ? (
                        <span className="status-badge published">Published</span>
                      ) : (
                        <span className="status-badge draft">Draft</span>
                      )}
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
                    <Link className="ghost small-btn" to={`/blog/${post.id}`}>
                      View
                    </Link>
                    <Link className="ghost small-btn" to={`/blog/${post.id}/edit`}>
                      Edit
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {viewMode === 'preview' && (
        <section className="blog-admin-preview">
          {posts.length === 0 ? (
            <div className="empty-state">
              <p className="muted">No blog posts to preview yet.</p>
            </div>
          ) : (
            <div className="grid blog-grid">
              {posts.map((post) => (
                <article key={post.id} className="card blog blog-post-card">
                  <div className="card-body">
                    <div className="tag">{post.tag}</div>
                    <h3>
                      <Link to={`/blog/${post.id}`}>{post.title}</Link>
                    </h3>
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
                            style={{
                              '--frame-position': `${image.focusX ?? 50}% ${image.focusY ?? 50}%`,
                            }}
                          />
                          <div className="blog-post-image-body">
                            <div>
                              <strong>{image.title}</strong>
                              <p className="muted small">{image.price} credits</p>
                            </div>
                            <button
                              className="pill"
                              type="button"
                              onClick={() => handleAddToCart(post, image)}
                            >
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
          )}
        </section>
      )}
    </Layout>
  );
};

export default BlogAdminPage;
