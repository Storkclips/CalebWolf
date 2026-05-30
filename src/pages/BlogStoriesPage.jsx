import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getBlogPosts } from '../utils/blog';

const PAGE_SIZE_OPTIONS = [
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '50', value: 50 },
];

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

const BlogStoriesPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [customSize, setCustomSize] = useState('');
  const [customInputActive, setCustomInputActive] = useState(false);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSizeParam = parseInt(searchParams.get('size') || '10', 10);
  const pageSize = isNaN(pageSizeParam) || pageSizeParam < 1 ? 10 : Math.min(pageSizeParam, 200);

  useEffect(() => {
    getBlogPosts().then((p) => { setPosts(p); setLoading(false); });
  }, []);

  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagePosts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return posts.slice(start, start + pageSize);
  }, [posts, safePage, pageSize]);

  const setPage = (p) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setSize = (s) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('size', String(s));
      next.set('page', '1');
      return next;
    });
    setCustomInputActive(false);
    setCustomSize('');
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(customSize, 10);
    if (!isNaN(val) && val > 0) setSize(Math.min(val, 200));
  };

  const isCustomSize = !PAGE_SIZE_OPTIONS.some((o) => o.value === pageSize);

  return (
    <Layout>
      <div className="journal-page">

        {/* ── Masthead ── */}
        <div className="journal-masthead">
          <div className="journal-container">
            <div className="journal-stories-back">
              <Link to="/blog" className="journal-stories-back-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Back to Journal
              </Link>
            </div>
            <h1 className="journal-masthead-title">All Stories</h1>
            <p className="journal-masthead-sub">
              {loading ? '' : `${posts.length} article${posts.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="journal-masthead-rule" />
        </div>

        {/* ── Per-page controls ── */}
        <div className="journal-container">
          <div className="journal-stories-controls">
            <span className="journal-stories-control-label">Show per page:</span>
            <div className="journal-stories-size-btns">
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`journal-stories-size-btn${pageSize === opt.value && !isCustomSize ? ' active' : ''}`}
                  onClick={() => setSize(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
              {customInputActive ? (
                <form onSubmit={handleCustomSubmit} className="journal-stories-custom-form">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    className="journal-stories-custom-input"
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    placeholder="Custom"
                    autoFocus
                    onBlur={() => { if (!customSize) setCustomInputActive(false); }}
                  />
                  <button type="submit" className="journal-stories-size-btn active">Go</button>
                </form>
              ) : (
                <button
                  type="button"
                  className={`journal-stories-size-btn${isCustomSize ? ' active' : ''}`}
                  onClick={() => setCustomInputActive(true)}
                >
                  {isCustomSize ? pageSize : 'Custom'}
                </button>
              )}
            </div>
            <span className="journal-stories-page-info">
              Page {safePage} of {totalPages}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="journal-container journal-state">
            <div className="journal-loading-dots"><span /><span /><span /></div>
          </div>
        ) : pagePosts.length === 0 ? (
          <div className="journal-container journal-state">
            <p className="journal-empty-msg">No articles published yet.</p>
          </div>
        ) : (
          <div className="journal-container">
            <div className="journal-article-list">
              {pagePosts.map((post) => (
                <Link key={post.id} to={`/blog/${post.id}`} className="journal-article-row">
                  <div className="journal-article-thumb">
                    <img
                      src={post.images?.[0]?.url || 'https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg?w=400'}
                      alt={post.title}
                    />
                  </div>
                  <div className="journal-article-body">
                    {post.tag && <span className="journal-tag-chip">{post.tag}</span>}
                    <h3 className="journal-article-title">{post.title}</h3>
                    {post.excerpt && (
                      <p className="journal-article-excerpt">{post.excerpt}</p>
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

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="journal-container">
            <div className="journal-pagination">
              <button
                type="button"
                className="journal-page-btn"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Prev
              </button>

              <div className="journal-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - safePage) <= 1) return true;
                    return false;
                  })
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="journal-page-ellipsis">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={`journal-page-num${p === safePage ? ' active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    )
                  )}
              </div>

              <button
                type="button"
                className="journal-page-btn"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="journal-footer-spacer" />
      </div>
    </Layout>
  );
};

export default BlogStoriesPage;
