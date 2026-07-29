import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import { getBlogPost, renderBlogContent } from '../utils/blog';
import PrintOrderModal from '../components/PrintOrderModal';
import ProtectedImage from '../components/ProtectedImage';
import { proxyImageUrl } from '../lib/supabase';

/* ── Cursor-following tooltip ── */
const CursorTooltip = ({ text, visible }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const move = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [visible]);

  if (!visible || !text) return null;
  return (
    <div
      ref={ref}
      className="ext-tooltip"
      style={{ left: pos.x + 16, top: pos.y + 16 }}
    >
      {text}
    </div>
  );
};

/* ── Leave-site confirmation modal ── */
const LeaveSiteModal = ({ url, onProceed, onCancel }) => {
  let domain = url;
  try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch {}

  return (
    <div className="leave-modal-backdrop" onClick={onCancel}>
      <div className="leave-modal" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="leave-modal-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </div>
        <h3 className="leave-modal-title">Leaving this site</h3>
        <p className="leave-modal-body">
          You are about to visit an external site:
        </p>
        <p className="leave-modal-domain">{domain}</p>
        <div className="leave-modal-actions">
          <button type="button" className="leave-modal-cancel" onClick={onCancel}>Go back</button>
          <button type="button" className="leave-modal-proceed" onClick={onProceed}>Proceed</button>
        </div>
      </div>
    </div>
  );
};

const BlogDetailPage = () => {
  const { postId } = useParams();
  const { addToCart, cart, creditBalance } = useStore();
  const { profile } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [printOrderImage, setPrintOrderImage] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [leaveSiteUrl, setLeaveSiteUrl] = useState(null);

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
    // Use linkUrl from data attribute (rendered HTML) as ground-truth; fall back to model
    const linkUrl = target.dataset.linkUrl || selected.linkUrl || '';
    setActiveImage({ ...selected, linkUrl });
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

      {/* ── Single-image lightbox (opened from gallery popup) ── */}
      {lightboxOpen && activeImage && (
        <div
          className="reveal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="reveal-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div
            className="reveal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reveal-img-wrap">
              <ProtectedImage
                src={proxyImageUrl(activeImage.url, 1400)}
                alt={activeImage.altText || activeImage.title}
                fit="contain"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <div className="reveal-footer">
              <div className="reveal-info">
                <p className="reveal-title">{activeImage.title}</p>
                {activeImage.caption && (
                  <p className="reveal-caption">{activeImage.caption}</p>
                )}
              </div>
              <div className="reveal-actions">
                <span className="reveal-price">{activeImage.price} cr</span>
                <button
                  type="button"
                  className="reveal-cart-btn"
                  onClick={() => { handleAddToCart(activeImage); setLightboxOpen(false); }}
                >
                  + Cart
                </button>
                <button
                  type="button"
                  className="reveal-print-btn"
                  onClick={() => { setLightboxOpen(false); setPrintOrderImage(activeImage); }}
                >
                  Print
                </button>
                {activeImage.linkUrl && (
                  <button
                    type="button"
                    className="reveal-link-btn"
                    onMouseEnter={() => setTooltipVisible(true)}
                    onMouseLeave={() => setTooltipVisible(false)}
                    onClick={() => { setTooltipVisible(false); setLeaveSiteUrl(activeImage.linkUrl); }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Visit link
                  </button>
                )}
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

      <CursorTooltip
        text={activeImage?.linkUrl}
        visible={tooltipVisible && !!activeImage?.linkUrl}
      />

      {leaveSiteUrl && (
        <LeaveSiteModal
          url={leaveSiteUrl}
          onCancel={() => setLeaveSiteUrl(null)}
          onProceed={() => {
            const url = leaveSiteUrl;
            setLeaveSiteUrl(null);
            const target = activeImage?.openInNewTab !== false ? '_blank' : '_self';
            window.open(url, target, 'noopener,noreferrer');
          }}
        />
      )}
    </Layout>
  );
};

export default BlogDetailPage;
