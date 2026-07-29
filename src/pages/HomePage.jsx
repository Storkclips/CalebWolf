import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroGallery from '../components/HeroGallery';
import Layout from '../components/Layout';
import { getBlogPosts } from '../utils/blog';
import { useThemes } from '../hooks/useGallery';
import { supabase } from '../lib/supabase';
import { usePageSeo } from '../contexts/SeoContext';

export default function HomePage() {
  usePageSeo({
    site_title: 'Caleb Wolf Photography — Cinematic Landscape & Wilderness Photography',
    meta_description: 'Explore cinematic landscape, wilderness, and portrait photography by Caleb Wolf. Browse collections, read the journal, and purchase prints or digital downloads.',
    og_title: 'Caleb Wolf Photography',
    og_description: 'Cinematic landscape and wilderness photography from the world\'s most remote edges.',
  });

  const [blogPosts, setBlogPosts] = useState([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState(null);
  const { themes } = useThemes();

  const publishedThemes = themes.filter(t => t.is_published).slice(0, 6);

  useEffect(() => {
    const loadPosts = async () => {
      const posts = await getBlogPosts();
  
      const publishedPosts = posts
        .filter(post => post.published === true)
        .slice(0, 3);
  
      setBlogPosts(publishedPosts);
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

            {publishedThemes.length > 0 ? (
              <div className="home-coll-editorial">
                {/* Featured large tile — first theme */}
                <Link
                  to={`/collections/${publishedThemes[0].slug}`}
                  className="home-coll-tile home-coll-tile--featured"
                >
                  <img
                    src={publishedThemes[0].cover_url || 'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?w=1200'}
                    alt={publishedThemes[0].name}
                    className="home-coll-tile-img"
                  />
                  <div className="home-coll-tile-overlay" />
                  <div className="home-coll-tile-info">
                    <span className="home-coll-tile-label">Featured</span>
                    <span className="home-coll-tile-name">{publishedThemes[0].name}</span>
                    <span className="home-coll-tile-cta">Explore collection →</span>
                  </div>
                </Link>

                {/* Remaining tiles grid */}
                <div className="home-coll-rest">
                  {publishedThemes.slice(1, 6).map((theme, i) => (
                    <Link
                      to={`/collections/${theme.slug}`}
                      key={theme.id}
                      className={`home-coll-tile${i === 0 ? ' home-coll-tile--wide' : ''}`}
                    >
                      <img
                        src={theme.cover_url || 'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?w=800'}
                        alt={theme.name}
                        className="home-coll-tile-img"
                      />
                      <div className="home-coll-tile-overlay" />
                      <div className="home-coll-tile-info">
                        <span className="home-coll-tile-label">Collection</span>
                        <span className="home-coll-tile-name">{theme.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="home-coll-editorial">
                <div className="home-coll-tile home-coll-tile--featured home-coll-tile--placeholder">
                  <div className="home-coll-tile-overlay" />
                  <div className="home-coll-tile-info">
                    <span className="home-coll-tile-label">Coming soon</span>
                    <span className="home-coll-tile-name">New Collection</span>
                  </div>
                </div>
                <div className="home-coll-rest">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="home-coll-tile home-coll-tile--placeholder">
                      <div className="home-coll-tile-overlay" />
                      <div className="home-coll-tile-info">
                        <span className="home-coll-tile-label">Coming soon</span>
                        <span className="home-coll-tile-name">New Collection</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="home-footer-input"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    disabled={newsletterStatus === 'loading'}
                  />
                  <button
                    className="home-footer-btn"
                    onClick={async () => {
                      if (!newsletterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) {
                        setNewsletterStatus({ type: 'error', text: 'Please enter a valid email.' });
                        return;
                      }
                      setNewsletterStatus({ type: 'loading' });
                      const { error } = await supabase
                        .from('newsletter_subscribers')
                        .upsert({ email: newsletterEmail }, { onConflict: 'email' });
                      if (error) {
                        setNewsletterStatus({ type: 'error', text: 'Something went wrong. Please try again.' });
                      } else {
                        setNewsletterStatus({ type: 'success', text: 'You\'re subscribed!' });
                        setNewsletterEmail('');
                      }
                      setTimeout(() => setNewsletterStatus(null), 4000);
                    }}
                    disabled={newsletterStatus?.type === 'loading'}
                  >
                    {newsletterStatus?.type === 'loading' ? '...' : 'Subscribe'}
                  </button>
                </div>
                {newsletterStatus && newsletterStatus.type !== 'loading' && (
                  <p style={{ margin: '8px 0 0', fontSize: '13px', color: newsletterStatus.type === 'success' ? '#22c55e' : '#f59e0b' }}>
                    {newsletterStatus.text}
                  </p>
                )}
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
