import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getBlogPosts } from '../utils/blog';
import { supabase } from '../lib/supabase';

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

const SocialFollow = ({ socials }) => {
  if (!socials.length) return null;
  return (
    <div className="journal-follow-bar">
      <div className="journal-follow-inner">
        <p className="journal-follow-label">Follow the Journey</p>
        <div className="journal-follow-icons">
          {socials.map((s) => (
            <a
              key={s.id}
              href={s.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="journal-follow-icon"
              title={s.label}
              aria-label={s.label}
              style={{ '--icon-color': s.color }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d={s.svg_path} />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [activeTag, setActiveTag] = useState('All');
  const [loading, setLoading] = useState(true);
  const [socials, setSocials] = useState([]);

  useEffect(() => {
    getBlogPosts().then((p) => { setPosts(p); setLoading(false); });
    supabase
      .from('social_links')
      .select('*')
      .eq('enabled', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setSocials(data ?? []));
  }, []);

  const tags = useMemo(() => {
    const unique = new Set(posts.map((p) => p.tag).filter(Boolean));
    return ['All', ...unique];
  }, [posts]);

  const filtered = useMemo(
    () => (activeTag === 'All' ? posts : posts.filter((p) => p.tag === activeTag)),
    [posts, activeTag],
  );

  // First 5 posts shown on main page; the rest link to /blog/stories
  const hero = filtered[0] ?? null;
  const heroSecondary = filtered.slice(1, 5);
  const listPosts = filtered.slice(5, 10);
  const hasMore = filtered.length > 5;

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

        {/* ── Hero grid (Blizzard-style) ── */}
        {!loading && hero && (
          <div className="journal-container">
            <div className="journal-hero-grid">
              {/* Large featured card */}
              <Link to={`/blog/${hero.id}`} className="journal-hero-main">
                <div className="journal-hero-main-media">
                  <img
                    src={hero.images?.[0]?.url || 'https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg?w=1200'}
                    alt={hero.title}
                  />
                </div>
                <div className="journal-hero-main-overlay">
                  <p className="journal-hero-eyebrow">{hero.excerpt?.substring(0, 60) || ''}</p>
                  <h2 className="journal-hero-main-title">{hero.title}</h2>
                </div>
              </Link>

              {/* Side cards column */}
              {heroSecondary.length > 0 && (
                <div className="journal-hero-side">
                  {heroSecondary.map((post) => (
                    <Link key={post.id} to={`/blog/${post.id}`} className="journal-hero-side-card">
                      <div className="journal-hero-side-media">
                        <img
                          src={post.images?.[0]?.url || 'https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg?w=600'}
                          alt={post.title}
                        />
                      </div>
                      <div className="journal-hero-side-overlay">
                        <p className="journal-hero-side-eyebrow">{post.excerpt?.substring(0, 50) || ''}</p>
                        <h3 className="journal-hero-side-title">{post.title}</h3>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Article list (posts 6-10) ── */}
        {!loading && listPosts.length > 0 && (
          <div className="journal-container">
            <div className="journal-article-list">
              {listPosts.map((post) => (
                <Link key={post.id} to={`/blog/${post.id}`} className="journal-article-row">
                  <div className="journal-article-thumb">
                    <img
                      src={post.images?.[0]?.url || 'https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg?w=400'}
                      alt={post.title}
                    />
                  </div>
                  <div className="journal-article-body">
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

        {/* ── Read More Stories CTA ── */}
        {!loading && hasMore && (
          <div className="journal-readmore-wrap">
            <Link to="/blog/stories" className="journal-readmore-btn">
              Read More Stories
            </Link>
          </div>
        )}

        {/* ── Follow social footer ── */}
        <SocialFollow socials={socials} />

        <div className="journal-footer-spacer" />
      </div>
    </Layout>
  );
};

export default BlogPage;
