import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getBlogPosts } from '../utils/blog';

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [activeTag, setActiveTag] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      const fetchedPosts = await getBlogPosts();
      setPosts(fetchedPosts);
      setLoading(false);
    };
    loadPosts();
  }, []);

  const tags = useMemo(() => {
    const uniqueTags = new Set(posts.map((post) => post.tag).filter(Boolean));
    return ['All', ...uniqueTags];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (activeTag === 'All') return posts;
    return posts.filter((post) => post.tag === activeTag);
  }, [posts, activeTag]);

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

  const featuredPost = filteredPosts[0] ?? null;
  const secondaryPosts = filteredPosts.slice(1, 4);
  const remainingPosts = filteredPosts.slice(4);

  return (
    <Layout>
      <div className="news-page">

        <div className="news-masthead">
          <div className="news-container">
            <div className="news-masthead-inner">
              <h1 className="news-masthead-title">The Journal</h1>
              <p className="news-masthead-sub">Photography, travel & craft by Caleb Wolf</p>
            </div>
          </div>
        </div>

        <div className="news-container">
          <div className="news-nav-bar">
            <nav className="news-tag-nav">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`news-tag-btn${tag === activeTag ? ' active' : ''}`}
                  onClick={() => setActiveTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </nav>
            <div className="news-nav-rule" />
          </div>
        </div>

        {loading && (
          <div className="news-container">
            <div className="news-loading">Loading articles...</div>
          </div>
        )}

        {!loading && filteredPosts.length === 0 && (
          <div className="news-container">
            <div className="news-empty">No articles published yet.</div>
          </div>
        )}

        {!loading && featuredPost && (
          <div className="news-container">
            <div className="news-featured-section">
              <Link to={`/blog/${featuredPost.id}`} className="news-featured-card">
                <div className="news-featured-img-wrap">
                  <img
                    src={featuredPost.images?.[0]?.url || 'https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg?w=1200'}
                    alt={featuredPost.title}
                    className="news-featured-img"
                  />
                  {featuredPost.tag && (
                    <span className="news-category-badge">{featuredPost.tag}</span>
                  )}
                </div>
                <div className="news-featured-body">
                  <h2 className="news-featured-title">{featuredPost.title}</h2>
                  <p className="news-featured-excerpt">{featuredPost.excerpt}</p>
                  <div className="news-article-meta">
                    <span className="news-author">Caleb Wolf</span>
                    <span className="news-meta-sep">·</span>
                    <span>{featuredPost.date}</span>
                    <span className="news-meta-sep">·</span>
                    <span>{getReadTime(featuredPost)} min read</span>
                  </div>
                </div>
              </Link>

              {secondaryPosts.length > 0 && (
                <div className="news-secondary-list">
                  {secondaryPosts.map((post, idx) => (
                    <Link key={post.id} to={`/blog/${post.id}`} className="news-secondary-card">
                      {post.images?.[0]?.url && (
                        <div className="news-secondary-img-wrap">
                          <img src={post.images[0].url} alt={post.title} className="news-secondary-img" />
                        </div>
                      )}
                      <div className="news-secondary-body">
                        {post.tag && <span className="news-tag-label">{post.tag}</span>}
                        <h3 className="news-secondary-title">{post.title}</h3>
                        <div className="news-article-meta news-meta-sm">
                          <span>{post.date}</span>
                          <span className="news-meta-sep">·</span>
                          <span>{getReadTime(post)} min read</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && remainingPosts.length > 0 && (
          <div className="news-container">
            <div className="news-divider-line" />
            <h3 className="news-section-label">More Stories</h3>
            <div className="news-grid">
              {remainingPosts.map((post) => (
                <Link key={post.id} to={`/blog/${post.id}`} className="news-grid-card">
                  {post.images?.[0]?.url && (
                    <div className="news-grid-img-wrap">
                      <img src={post.images[0].url} alt={post.title} className="news-grid-img" />
                    </div>
                  )}
                  <div className="news-grid-body">
                    {post.tag && <span className="news-tag-label">{post.tag}</span>}
                    <h3 className="news-grid-title">{post.title}</h3>
                    <p className="news-grid-excerpt">{post.excerpt}</p>
                    <div className="news-article-meta news-meta-sm">
                      <span>{post.date}</span>
                      <span className="news-meta-sep">·</span>
                      <span>{getReadTime(post)} min read</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="news-spacer" />
      </div>
    </Layout>
  );
};

export default BlogPage;
