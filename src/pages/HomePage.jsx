import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HeroGallery from '../components/HeroGallery';
import Layout from '../components/Layout';
import { getBlogPosts } from '../utils/blog';
import { useThemes } from '../hooks/useGallery';
import { usePageSeo } from '../contexts/SeoContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [magSettings, setMagSettings] = useState(null);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    supabase.from('magazine_settings').select('*').maybeSingle().then(({ data }) => setMagSettings(data));
  }, []);

  useEffect(() => {
    if (!user) { setHasActiveSub(false); return; }
    supabase
      .from('magazine_subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()
      .then(({ data }) => {
        setHasActiveSub(!!data && (!data.current_period_end || new Date(data.current_period_end) > new Date()));
      });
  }, [user?.id]);

  async function startSubscriptionCheckout() {
    if (!user) { navigate('/login'); return; }
    setCheckingOut(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/magazine-subscription-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            success_url: `${window.location.origin}/magazines`,
            cancel_url: window.location.href,
          }),
        },
      );
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch { /* stay on page */ }
    setCheckingOut(false);
  }

  usePageSeo('home', {
    site_title: 'Caleb Wolf Photography — Cinematic Landscape & Wilderness Photography',
    meta_description: 'Explore cinematic landscape, wilderness, and portrait photography by Caleb Wolf. Browse collections, read the journal, and purchase prints or digital downloads.',
    og_title: 'Caleb Wolf Photography',
    og_description: 'Cinematic landscape and wilderness photography from the world\'s most remote edges.',
  });

  const [blogPosts, setBlogPosts] = useState([]);
  const { themes } = useThemes();

  const publishedThemes = themes.filter(t => t.is_published).slice(0, 6);

  useEffect(() => {
    const loadPosts = async () => {
      const posts = await getBlogPosts();

      const featured = posts.filter((p) => p.isFeatured);
      const recent = posts.filter((p) => !p.isFeatured);
      const ordered = [...featured, ...recent].slice(0, 3);

      setBlogPosts(ordered);
    };

    loadPosts();
  }, []); 

  const [spotlightPosts, setSpotlightPosts] = useState([]);

  useEffect(() => {
    getBlogPosts().then((posts) => {
      const lit = posts.filter((p) => p.isSpotlight);
      const main = lit.find((p) => p.isMainSpotlight) || lit[0] || null;
      const rest = lit.filter((p) => p.id !== main?.id).slice(0, 2);
      setSpotlightPosts(main ? { main, rest } : null);
    });
  }, []);

  return (
    <Layout>
      <HeroGallery />

      <div className="home-content">

        {spotlightPosts && (
          <section className="home-section home-spotlight-section">
            <div className="home-container">
              <div className="home-section-header">
                <div>
                  <p className="home-eyebrow">Spotlight</p>
                  <h2 className="home-section-title">Stories in Focus</h2>
                </div>
                <Link to="/blog/stories" className="home-outline-btn">All Stories</Link>
              </div>

              <div className="home-spotlight-grid">
                <Link to={`/blog/${spotlightPosts.main.id}`} className="home-spotlight-main">
                  <img
                    src={spotlightPosts.main.images?.[0]?.url || 'https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg?w=1200'}
                    alt={`${spotlightPosts.main.title} — Caleb Wolf Photography`}
                    className="home-spotlight-img"
                  />
                  <div className="home-spotlight-overlay" />
                  <div className="home-spotlight-info">
                    <span className="home-spotlight-badge">Featured story</span>
                    <h3 className="home-spotlight-title">{spotlightPosts.main.title}</h3>
                    {spotlightPosts.main.excerpt && (
                      <p className="home-spotlight-excerpt">{spotlightPosts.main.excerpt}</p>
                    )}
                    <span className="home-spotlight-cta">Read the story →</span>
                  </div>
                </Link>

                {spotlightPosts.rest.map((post) => (
                  <Link to={`/blog/${post.id}`} key={post.id} className="home-spotlight-side">
                    <div className="home-spotlight-side-img-wrap">
                      <img
                        src={post.images?.[0]?.url || 'https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg?w=800'}
                        alt={`${post.title} — Caleb Wolf Photography`}
                        className="home-spotlight-img"
                        loading="lazy"
                      />
                      <div className="home-spotlight-overlay" />
                    </div>
                    <div className="home-spotlight-side-body">
                      {post.tag && <span className="home-blog-tag">{post.tag}</span>}
                      <h3 className="home-spotlight-side-title">{post.title}</h3>
                      <div className="home-blog-meta">
                        <span>{post.date}</span>
                        <span>{post.readTime || '5'} min read</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

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
                      alt={`${b.title} — Caleb Wolf Photography`}
                      className="home-blog-img"
                      loading="lazy"
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

        {magSettings?.homepage_widget_enabled && magSettings?.subscription_enabled && (
          <section className="home-section home-mag-widget-section">
            <div className="home-container">
              <div className="home-mag-widget">
                <div className="home-mag-widget-text">
                  <p className="home-eyebrow">Digital magazine</p>
                  <h2 className="home-section-title">{magSettings.homepage_widget_title}</h2>
                  <p className="home-mag-widget-copy">{magSettings.homepage_widget_copy}</p>
                  <ul className="home-mag-widget-bullets">
                    <li>Unlimited access to every published magazine while subscribed</li>
                    <li>New monthly issues permanently added to your library</li>
                    <li>Cancel anytime</li>
                    <li>Permanent access to issues you own</li>
                  </ul>
                </div>
                <div className="home-mag-widget-cta">
                  {magSettings.subscription_price_display && (
                    <p className="home-mag-widget-price">
                      ${Number(magSettings.subscription_price_display).toFixed(2)}
                      <span> / month</span>
                    </p>
                  )}
                  {hasActiveSub ? (
                    <Link className="btn" to="/my-library">View your magazine library</Link>
                  ) : (
                    <button className="btn" type="button" disabled={checkingOut} onClick={startSubscriptionCheckout}>
                      Subscribe now
                    </button>
                  )}
                  <Link className="ghost" to="/magazines">Browse magazines</Link>
                </div>
              </div>
            </div>
          </section>
        )}

      </div>
    </Layout>
  );
}
