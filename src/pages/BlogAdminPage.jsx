import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { defaultBlogPosts } from '../data';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import { getStoredPosts, renderBlogContent } from '../utils/blog';

const BlogAdminPage = () => {
  const { addToCart, cart, creditBalance } = useStore();
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(defaultBlogPosts);
  const [cartMessage, setCartMessage] = useState('');
  const [activeImage, setActiveImage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !profile?.is_admin) {
      navigate('/');
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    setPosts(getStoredPosts());
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

  const handleContentClick = (post) => (event) => {
    const target = event.target;
    if (target.tagName !== 'IMG') return;
    const imageId = target.dataset.imageId;
    const imageTitle = target.dataset.imageTitle;
    const selected = post.images?.find((image) => image.id === imageId)
      ?? post.images?.find((image) => image.title === imageTitle);
    if (!selected) return;
    setActiveImage({ ...selected, post });
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setMenuOpen(false);
  };

  if (loading || !profile?.is_admin) {
    return null;
  }

  return (
    <Layout>
      <section className="hero slim">
        <p className="eyebrow">Blog admin</p>
        <h1>Manage posts and previews.</h1>
        <p className="lead">
          Create, edit, and preview posts. This admin view shows extra details and controls.
        </p>
        <div className="hero-actions">
          <Link className="pill" to="/blog/new">
            Create new post
          </Link>
          <Link className="ghost" to="/cart">
            View cart ({cart.length})
          </Link>
          <span className="muted small">Credits available: {creditBalance}</span>
        </div>
        {cartMessage && <div className="notice">{cartMessage}</div>}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Manage</p>
            <h2>Drafts & published posts</h2>
          </div>
          <p className="muted small">Saved locally for testing in this browser.</p>
        </div>
        <div className="blog-manage-grid">
          {posts.map((post) => (
            <article key={post.id} className="card blog-manage-card">
              <div className="card-body">
                <div className="tag">{post.tag}</div>
                <h3>{post.title}</h3>
                <p className="muted">{post.excerpt}</p>
                <p className="muted small">{post.date}</p>
              </div>
              <div className="card-footer">
                <Link className="ghost" to={`/blog/${post.id}`}>
                  Read story
                </Link>
                <Link className="ghost" to={`/blog/${post.id}/edit`}>
                  Edit post
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Reader view</p>
            <h2>Live blog feed</h2>
          </div>
        </div>
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
                {(post.contentHtml || post.content) && (
                  <div
                    className="blog-body"
                    onClick={handleContentClick(post)}
                    dangerouslySetInnerHTML={{
                      __html: renderBlogContent(post.contentHtml || post.content, post.images),
                    }}
                  />
                )}
              </div>
              {post.images?.length > 0 && (
                <div className="blog-post-images">
                  {post.images.map((image) => (
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
      </section>

      {menuOpen && activeImage && (
        <div className="blog-image-menu-overlay" role="presentation" onClick={handleCloseMenu}>
          <div className="blog-image-menu" role="dialog" onClick={(event) => event.stopPropagation()}>
            <img src={activeImage.url} alt={activeImage.title} />
            <div className="blog-image-menu-body">
              <div>
                <strong>{activeImage.title}</strong>
                <p className="muted small">{activeImage.price} credits</p>
              </div>
              <div className="blog-image-menu-actions">
                <Link className="ghost" to={`/blog/${activeImage.post.id}`}>
                  View story
                </Link>
                <button
                  className="pill"
                  type="button"
                  onClick={() => handleAddToCart(activeImage.post, activeImage)}
                >
                  Buy photo
                </button>
                <button className="ghost" type="button" onClick={handleCloseMenu}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BlogAdminPage;
