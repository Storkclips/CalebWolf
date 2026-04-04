import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroGallery from '../components/HeroGallery';
import Layout from '../components/Layout';
import { getBlogPosts } from '../utils/blog';
import { useThemes } from '../hooks/useGallery';

export default function HomePage() {
  const [blogPosts, setBlogPosts] = useState([]);
  const { themes } = useThemes();

  const publishedThemes = themes.filter(t => t.is_published).slice(0, 6);

  useEffect(() => {
    const loadPosts = async () => {
      const posts = await getBlogPosts();
      setBlogPosts(posts.slice(0, 3));
    };
    loadPosts();
  }, []);

  return (
    <Layout>
      <HeroGallery />

      <div className="home-content">

        <section className="home-section">
          <div className="home-container">
            <div className="home-section-header">
              <div>
                <p className="home-eyebrow">Writing</p>
                <h2 className="home-section-title">From the Journal</h2>
              </div>
              <Link to="/blog" className="home-outline-btn">All Posts</Link>
            </div>

            <div className="home-blog-grid">
              {blogPosts.length > 0 ? blogPosts.map(b => (
                <Link to={`/blog/${b.id}`} key={b.id} className="home-blog-card">
                  <div className="home-blog-img-wrap">
                    <img
                      src={b.images?.[0]?.url || 'https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg?w=600'}
                      alt={b.title}
                      className="home-blog-img"
                    />
                    {b.tag && <span className="home-blog-tag">{b.tag}</span>}
                  </div>
                  <div className="home-blog-body">
                    <h3 className="home-blog-title">{b.title}</h3>
                    <p className="home-blog-excerpt">{b.excerpt}</p>
                    <div className="home-blog-meta">
                      <span>{b.date}</span>
                      <span>{b.readTime || '5'} min read</span>
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="home-empty-state">
                  <p>No posts published yet. Check back soon.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="home-section home-section-alt">
          <div className="home-container">
            <div className="home-section-header">
              <div>
                <p className="home-eyebrow">Browse</p>
                <h2 className="home-section-title">Collections</h2>
              </div>
              <Link to="/collections" className="home-outline-btn">View All</Link>
            </div>

            <div className="home-collections-grid">
              {publishedThemes.length > 0 ? publishedThemes.map(theme => (
                <Link to={`/collections/${theme.slug}`} key={theme.id} className="home-collection-item">
                  <img
                    src={theme.cover_url || 'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?w=800'}
                    alt={theme.name}
                    className="home-collection-img"
                  />
                  <div className="home-collection-overlay" />
                  <div className="home-collection-info">
                    <span className="home-collection-label">Collection</span>
                    <span className="home-collection-name">{theme.name}</span>
                  </div>
                </Link>
              )) : (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="home-collection-item home-collection-placeholder">
                    <div className="home-collection-overlay" />
                    <div className="home-collection-info">
                      <span className="home-collection-label">Coming soon</span>
                      <span className="home-collection-name">New Collection</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="home-section">
          <div className="home-container">
            <div className="home-quote-block">
              <div className="home-quote-rule" />
              <blockquote className="home-quote-text">
                "Every landscape holds its breath between moments. My work is the exhale."
              </blockquote>
              <p className="home-quote-attr">— Caleb Wolf</p>
              <div className="home-quote-rule" />
            </div>
          </div>
        </section>

        <footer className="home-footer">
          <div className="home-container">
            <div className="home-footer-grid">
              <div>
                <div className="home-footer-logo">CALEB WOLF PHOTOGRAPHY</div>
                <p className="home-footer-desc">
                  Landscape and wilderness photography from the world's most remote edges. Based in the Pacific Northwest, working globally.
                </p>
                <div className="home-footer-social">
                  {['Instagram', '500px', 'Vero'].map(s => (
                    <a key={s} href="#" className="home-footer-social-link">{s}</a>
                  ))}
                </div>
              </div>

              <div>
                <p className="home-footer-col-label">Navigate</p>
                {[['Portfolio', '/collections'], ['Collections', '/collections'], ['Journal', '/blog'], ['About', '/about'], ['Contact', '/contact']].map(([l, to]) => (
                  <Link key={l} to={to} className="home-footer-link">{l}</Link>
                ))}
              </div>

              <div>
                <p className="home-footer-col-label">Newsletter</p>
                <p className="home-footer-desc">
                  New work, journal entries, and workshop announcements — directly to your inbox.
                </p>
                <div className="home-footer-newsletter">
                  <input type="email" placeholder="your@email.com" className="home-footer-input" />
                  <button className="home-footer-btn">Subscribe</button>
                </div>
              </div>
            </div>

            <div className="home-footer-bottom">
              <span>© 2026 Caleb Wolf Photography. All rights reserved.</span>
              <span>All images protected under copyright.</span>
            </div>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
