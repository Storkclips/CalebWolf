import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getBlogPosts } from '../utils/blog';

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [activeTag, setActiveTag] = useState('All Posts');
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
    const uniqueTags = new Set(
      posts
        .map((post) => post.tag)
        .filter(Boolean),
    );
    return ['All Posts', ...uniqueTags];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (activeTag === 'All Posts') return posts;
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

  return (
    <Layout>
      <section className="section blog-viewer">
        <div className="blog-viewer-filter">
          <div className="blog-viewer-tabs">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={tag === activeTag ? 'active' : ''}
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <button className="ghost blog-viewer-search" type="button" aria-label="Search">
            🔍
          </button>
        </div>

        <div className="blog-viewer-list">
          {filteredPosts.map((post) => {
            const heroImage = post.images?.[0] ?? null;
            const authorName = post.authorName || 'Joshua Wolf';
            const authorInitials = post.authorInitials || 'JW';
            const publishDate = post.publishDate || post.date;
            return (
              <article key={post.id} className="blog-viewer-card">
                {heroImage && (
                  <Link className="blog-viewer-media" to={`/blog/${post.id}`}>
                    <img
                      src={heroImage.url}
                      alt={heroImage.title}
                      style={{
                        '--frame-position': `${heroImage.focusX ?? 50}% ${heroImage.focusY ?? 50}%`,
                      }}
                    />
                  </Link>
                )}
                <div className="blog-viewer-body">
                  <div className="blog-viewer-meta">
                    <span className="blog-viewer-avatar">{authorInitials}</span>
                    <div className="blog-viewer-meta-text">
                      <span className="blog-viewer-author">{authorName}</span>
                      <span className="blog-viewer-dot">·</span>
                      <span>{publishDate}</span>
                      <span className="blog-viewer-dot">·</span>
                      <span>{getReadTime(post)} min read</span>
                    </div>
                    <button className="ghost blog-viewer-menu" type="button" aria-label="More options">
                      ⋯
                    </button>
                  </div>
                  <h2 className="blog-viewer-title">
                    <Link to={`/blog/${post.id}`}>{post.title}</Link>
                  </h2>
                  <p className="blog-viewer-byline">
                    By {authorName} | Caleb Wolf Photography
                  </p>
                  <p className="blog-viewer-excerpt">{post.excerpt}</p>
                  <div className="blog-viewer-footer">
                    <span>22 views</span>
                    <span>0 comments</span>
                    <button type="button" aria-label="Like">
                      ♡
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </Layout>
  );
};

export default BlogPage;
