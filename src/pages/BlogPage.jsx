import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getBlogPosts } from '../utils/blog';
import { proxyImageUrl } from '../lib/supabase';

const getReadTime = (post) => {
  if (post.readTime) return post.readTime;
  const content = post.contentHtml || post.content || '';
  const wordCount = content
    .replace(/<image:[^>]+>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

const FALLBACK_BLOG_IMAGE =
  'https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg?w=1200';

const getBlogImageUrl = (post, width = 900) => {
  const image =
    post?.images?.[0]?.url ||
    post?.images?.[0]?.preview ||
    post?.images?.[0]?.src ||
    post?.coverUrl ||
    post?.cover_url ||
    '';

  return image ? proxyImageUrl(image, width) : FALLBACK_BLOG_IMAGE;
};

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [activeTag, setActiveTag] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogPosts().then((p) => { setPosts(p); setLoading(false); });
  }, []);

  const tags = useMemo(() => {
    const unique = new Set(posts.map((p) => p.tag).filter(Boolean));
    return ['All', ...unique];
  }, [posts]);

  const filtered = useMemo(
    () => (activeTag === 'All' ? posts : posts.filter((p) => p.tag === activeTag)),
    [posts, activeTag],
  );

  const featured = filtered[0] ?? null;
  const secondary = filtered.slice(1, 4);
  const rest = filtered.slice(4);

  return (
    <Layout>
      <div className="journal-page">

        {/* ── Masthead ── */}
        <div className="journal-masthead">
          <div className="journal-container">
            <h1 className="journal-masthead-title">The Journal</h1>
            <p className="journal-masthead-sub">Photography, travel &amp; craft by Caleb Wolf</p>
          </div>
          <div className="journal-masthead-rule" />
        </div>

        {/* ── Tag nav ── */}
        <div className="journal-container">
          <nav className="journal-tag-nav" aria-label="Filter by topic">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`journal-tag-btn${tag === activeTag ? ' active' : ''}`}
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </button>
            ))}
          </nav>
          <div className="journal-tag-rule" />
        </div>

        {loading && (
          <div className="journal-container journal-state">
            <div className="journal-loading-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="journal-container journal-state">
            <p className="journal-empty-msg">No articles published yet.</p>
          </div>
        )}

        {!loading && featured && (
          <div className="journal-container">
            {/* ── Featured block ── */}
            <div className="journal-featured-block">
              <Link to={`/blog/${featured.id}`} className="journal-featured-link">
                <div className="journal-featured-media">
                  <img
                    src={getBlogImageUrl(featured, 1200)}
                    alt={featured.title}
                    className="journal-featured-img"
                    loading="lazy"
                  />
                  {featured.tag && (
                    <span className="journal-cat-pill">{featured.tag}</span>
                  )}
                </div>
                <div className="journal-featured-body">
                  <h2 className="journal-featured-title">{featured.title}</h2>
                  {featured.excerpt && (
                    <p className="journal-featured-excerpt">{featured.excerpt}</p>
                  )}
                  <div className="journal-meta">
                    <span className="journal-meta-author">Caleb Wolf</span>
                    <span className="journal-meta-dot" />
                    <span>{featured.date}</span>
                    <span className="journal-meta-dot" />
                    <span>{getReadTime(featured)} min read</span>
                  </div>
                </div>
              </Link>

              {/* ── Secondary sidebar ── */}
              {secondary.length > 0 && (
                <div className="journal-secondary-col">
                  <p className="journal-col-label">Latest</p>
                  {secondary.map((post) => (
                    <Link key={post.id} to={`/blog/${post.id}`} className="journal-secondary-item">
                      <div className="journal-secondary-text">
                        {post.tag && <span className="journal-tag-chip">{post.tag}</span>}
                        <h3 className="journal-secondary-title">{post.title}</h3>
                        <div className="journal-meta journal-meta-sm">
                          <span>{post.date}</span>
                          <span className="journal-meta-dot" />
                          <span>{getReadTime(post)} min read</span>
                        </div>
                      </div>
                          {post.images?.[0] && (
                            <div className="journal-secondary-thumb">
                              <img
                                src={getBlogImageUrl(post, 300)}
                                alt={post.title}
                                loading="lazy"
                              />
                            </div>
                          )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── More stories ── */}
        {!loading && rest.length > 0 && (
          <div className="journal-container">
            <div className="journal-section-divider">
              <span className="journal-section-label">More Stories</span>
            </div>
            <div className="journal-grid">
              {rest.map((post) => (
                <Link key={post.id} to={`/blog/${post.id}`} className="journal-card">
                  {post.images?.[0]?.url && (
                    <div className="journal-card-media">
                      <img src={post.images[0].url} alt={post.title} className="journal-card-img" />
                    </div>
                  )}
                  <div className="journal-card-body">
                    {post.tag && <span className="journal-tag-chip">{post.tag}</span>}
                    <h3 className="journal-card-title">{post.title}</h3>
                    {post.excerpt && (
                      <p className="journal-card-excerpt">{post.excerpt}</p>
                    )}
                    <div className="journal-meta journal-meta-sm">
                      <span>{post.date}</span>
                      <span className="journal-meta-dot" />
                      <span>{getReadTime(post)} min read</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="journal-footer-spacer" />
      </div>
    </Layout>
  );
};

export default BlogPage;
