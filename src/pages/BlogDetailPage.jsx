import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import { getBlogPost, renderBlogContent } from '../utils/blog';
import PrintOrderModal from '../components/PrintOrderModal';

const BlogDetailPage = () => {
  const { postId } = useParams();
  const { addToCart, cart, creditBalance } = useStore();
  const { profile } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [printOrderImage, setPrintOrderImage] = useState(null);

  useEffect(() => {
    const loadPost = async () => {
      const fetchedPost = await getBlogPost(postId);
      setPost(fetchedPost);
      setLoading(false);
    };
    loadPost();
  }, [postId]);

  if (loading) {
    return (
      <Layout>
        <div className="article-loading">Loading article...</div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="article-not-found">
          <p>Article not found.</p>
          <Link to="/blog" className="article-back-link">Back to the journal</Link>
        </div>
      </Layout>
    );
  }

  const handleAddToCart = (image) => {
    addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: post.title,
      preview: image.url,
    });
  };

  const handleContentClick = (event) => {
    const target = event.target;
    if (target.tagName !== 'IMG') return;
    const imageId = target.dataset.imageId;
    const imageTitle = target.dataset.imageTitle;
    const selected = post.images?.find((img) => img.id === imageId)
      ?? post.images?.find((img) => img.title === imageTitle);
    if (!selected) return;
    setActiveImage(selected);
    setLightboxOpen(true);
  };

  const wordSource = post.contentHtml || post.content || '';
  const wordCount = wordSource
    .replace(/<image:[^>]+>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  const readTime = post.readTime || Math.max(1, Math.ceil(wordCount / 200));
  const heroImage = post.images?.[0] ?? null;
  const authorName = post.authorName || 'Caleb Wolf';
  const authorInitials = post.authorInitials || 'CW';
  const publishDate = post.publishDate || post.date;

  return (
    <Layout>
      <article className="article-page">

        <div className="article-topbar">
          <div className="article-topbar-inner">
            <Link to="/blog" className="article-back">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              The Journal
            </Link>
            <div className="article-topbar-actions">
              {profile?.is_admin && (
                <Link className="article-edit-btn" to={`/blog/${post.id}/edit`}>Edit</Link>
              )}
              <button
                type="button"
                className="article-share-btn"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                title="Copy link"
              >
                Share
              </button>
            </div>
          </div>
        </div>

        <div className="article-container">

          <header className="article-header">
            {post.tag && <span className="article-category">{post.tag}</span>}
            <h1 className="article-title">{post.title}</h1>
            {post.excerpt && <p className="article-deck">{post.excerpt}</p>}

            <div className="article-byline-row">
              <div className="article-author-avatar">{authorInitials}</div>
              <div className="article-byline-info">
                <span className="article-author-name">{authorName}</span>
                <div className="article-byline-meta">
                  <span>{publishDate}</span>
                  <span className="article-meta-sep">·</span>
                  <span>{readTime} min read</span>
                  {cart.length > 0 && (
                    <>
                      <span className="article-meta-sep">·</span>
                      <Link to="/cart" className="article-cart-link">{cart.length} in cart</Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="article-header-rule" />
          </header>

          {heroImage && (
            <figure className="article-hero-figure">
              <button
                type="button"
                className="article-hero-btn"
                onClick={() => { setActiveImage(heroImage); setLightboxOpen(true); }}
                aria-label="View full image"
              >
                <img
                  src={heroImage.url}
                  alt={heroImage.altText || heroImage.title}
                  className="article-hero-img"
                  style={{ objectPosition: `${heroImage.focusX ?? 50}% ${heroImage.focusY ?? 50}%` }}
                />
              </button>
              {heroImage.caption && (
                <figcaption className="article-hero-caption">{heroImage.caption}</figcaption>
              )}
            </figure>
          )}

          <div className="article-body-layout">
            <div className="article-body" onClick={handleContentClick}>
              {post.contentHtml || post.content ? (
                <div
                  className="article-prose"
                  dangerouslySetInnerHTML={{
                    __html: renderBlogContent(post.contentHtml || post.content, post.images),
                  }}
                />
              ) : (
                <p className="article-empty">No content yet.</p>
              )}
            </div>
          </div>

          {post.images?.length > 1 && (
            <div className="article-gallery-section">
              <div className="article-gallery-header">
                <h2 className="article-gallery-title">Photography from this story</h2>
                <p className="article-gallery-sub">
                  Available to purchase individually. {creditBalance > 0 && `You have ${creditBalance} credits.`}
                </p>
              </div>
              <div className="article-photo-grid">
                {post.images.map((image, idx) => (
                  <div key={image.id} className="article-photo-card">
                    <button
                      type="button"
                      className="article-photo-btn"
                      onClick={() => { setActiveImage(image); setLightboxOpen(true); }}
                      aria-label={`View ${image.title}`}
                    >
                      <img
                        src={image.url}
                        alt={image.altText || image.title}
                        className="article-photo-img"
                        style={{ objectPosition: `${image.focusX ?? 50}% ${image.focusY ?? 50}%` }}
                      />
                      <div className="article-photo-overlay">
                        <span className="article-photo-zoom">View</span>
                      </div>
                    </button>
                    <div className="article-photo-meta">
                      <div className="article-photo-info">
                        <span className="article-photo-title">{image.title}</span>
                        <span className="article-photo-price">{image.price} credits</span>
                      </div>
                      <div className="article-photo-actions">
                        <button
                          type="button"
                          className="article-buy-btn"
                          onClick={() => handleAddToCart(image)}
                        >
                          Buy digital
                        </button>
                        <button
                          type="button"
                          className="article-print-btn"
                          onClick={() => setPrintOrderImage(image)}
                        >
                          Order print
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <footer className="article-footer">
            <div className="article-footer-author">
              <div className="article-author-avatar article-author-avatar-lg">{authorInitials}</div>
              <div>
                <p className="article-footer-author-name">{authorName}</p>
                <p className="article-footer-author-bio">Landscape photographer based in the Pacific Northwest.</p>
              </div>
            </div>
            <div className="article-footer-nav">
              <Link to="/blog" className="article-footer-back">More articles</Link>
              <Link to="/collections" className="article-footer-collections">Browse collections</Link>
            </div>
          </footer>
        </div>
      </article>

      {lightboxOpen && activeImage && (
        <div
          className="article-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="article-lb-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
          <div
            className="article-lb-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="article-lb-img-wrap">
              <img
                src={activeImage.url}
                alt={activeImage.altText || activeImage.title}
                className="article-lb-img"
                style={{ objectPosition: `${activeImage.focusX ?? 50}% ${activeImage.focusY ?? 50}%` }}
              />
            </div>
            <div className="article-lb-footer">
              <div className="article-lb-info">
                <p className="article-lb-title">{activeImage.title}</p>
                {activeImage.caption && (
                  <p className="article-lb-caption">{activeImage.caption}</p>
                )}
              </div>
              <div className="article-lb-actions">
                <span className="article-lb-price">{activeImage.price} credits</span>
                <button
                  type="button"
                  className="article-lb-buy"
                  onClick={() => { handleAddToCart(activeImage); setLightboxOpen(false); }}
                >
                  Buy digital
                </button>
                <button
                  type="button"
                  className="article-lb-print"
                  onClick={() => { setLightboxOpen(false); setPrintOrderImage(activeImage); }}
                >
                  Order print
                </button>
                <a
                  href={activeImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="article-lb-view"
                >
                  Full size
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      {printOrderImage && (
        <PrintOrderModal
          image={printOrderImage}
          onClose={() => setPrintOrderImage(null)}
        />
      )}
    </Layout>
  );
};

export default BlogDetailPage;
