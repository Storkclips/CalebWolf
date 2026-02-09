import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import { getBlogPost, renderBlogContent } from '../utils/blog';

const BlogDetailPage = () => {
  const { postId } = useParams();
  const { addToCart, cart, creditBalance } = useStore();
  const { profile } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      const fetchedPost = await getBlogPost(postId);
      setPost(fetchedPost);
      setLoading(false);
    };
    loadPost();
  }, [postId]);

  if (!post) {
    return (
      <Layout>
        <section className="hero slim">
          <p className="eyebrow">Blog</p>
          <h1>Story not found</h1>
          <p className="lead">We could not find that post in local storage.</p>
          <div className="hero-actions">
            <Link className="ghost" to="/blog">
              Back to blog
            </Link>
          </div>
        </section>
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
    const selected = post.images?.find((image) => image.id === imageId)
      ?? post.images?.find((image) => image.title === imageTitle);
    if (!selected) return;
    setActiveImage(selected);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setMenuOpen(false);
  };

  const wordSource = post.contentHtml || post.content || '';
  const wordCount = wordSource
    .replace(/<image:[^>]+>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  const computedReadTime = Math.max(1, Math.ceil(wordCount / 200));
  const readTime = post.readTime || computedReadTime;
  const heroImage = post.images?.[0] ?? null;
  const authorName = post.authorName || 'Joshua Wolf';
  const authorInitials = post.authorInitials || 'JW';
  const publishDate = post.publishDate || post.date;

  return (
    <Layout>
      <section className="section blog-article">
        <div className="blog-article-topbar">
          <Link className="ghost" to="/blog">
            Back to blog
          </Link>
          <div className="blog-article-actions">
            {profile?.is_admin && (
              <Link className="ghost" to={`/blog/${post.id}/edit`}>
                Edit story
              </Link>
            )}
            <Link className="pill" to="/cart">
              View cart ({cart.length})
            </Link>
            <span className="muted small">Credits available: {creditBalance}</span>
          </div>
        </div>

        <header className="blog-article-header">
          <div className="blog-article-meta">
            <div className="blog-article-avatar" aria-hidden="true">
              {authorInitials}
            </div>
            <div className="blog-article-meta-text">
              <span className="blog-article-author">{authorName}</span>
              <span className="blog-article-dot">·</span>
              <span>{publishDate}</span>
              <span className="blog-article-dot">·</span>
              <span>{readTime} min read</span>
            </div>
            <button className="ghost blog-article-menu" type="button" aria-label="More options">
              ⋯
            </button>
          </div>
          <h1 className="blog-article-title">{post.title}</h1>
          <p className="blog-article-byline">By {authorName} | Caleb Wolf Photography</p>
        </header>

        {heroImage && (
          <figure className="blog-article-hero">
            <img
              src={heroImage.url}
              alt={heroImage.title}
              style={{
                '--frame-position': `${heroImage.focusX ?? 50}% ${heroImage.focusY ?? 50}%`,
              }}
            />
          </figure>
        )}

        <div className="blog-story-body" onClick={handleContentClick}>
          {post.contentHtml || post.content ? (
            <div
              className="blog-body"
              dangerouslySetInnerHTML={{
                __html: renderBlogContent(post.contentHtml || post.content, post.images),
              }}
            />
          ) : (
            <p className="muted">Add story content to see the full article here.</p>
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
                  <button className="pill" type="button" onClick={() => handleAddToCart(image)}>
                    Buy photo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
                <a className="ghost" href={activeImage.url} target="_blank" rel="noreferrer">
                  View photo
                </a>
                <button className="pill" type="button" onClick={() => handleAddToCart(activeImage)}>
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

export default BlogDetailPage;
