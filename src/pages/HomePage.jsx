import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getBlogPosts } from '../utils/blog';
import { useThemes } from '../hooks/useGallery';
import { usePageSeo } from '../contexts/SeoContext';
import { supabase, proxyImageUrl } from '../lib/supabase';
import { getCoverDisplayUrl } from '../lib/magazines';
import { useAuth } from '../store/AuthContext';
import { useSiteIdentity } from '../contexts/SiteIdentityContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { heroLogoEnabled, heroLogoSvgPath, heroLogoViewbox, heroLogoColor, heroLogoPosX, heroLogoPosY, heroLogoSize } = useSiteIdentity();
  const heroOverlayPath = heroLogoEnabled && heroLogoSvgPath ? heroLogoSvgPath : '';
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

  const [spotlightPosts, setSpotlightPosts] = useState(null);
  const [spotlightMagazines, setSpotlightMagazines] = useState([]);
  const [openFaq, setOpenFaq] = useState(0);
  const [heroReady, setHeroReady] = useState(false);
  const heroSectionRef = useRef(null);
  const heroBandRef = useRef(null);
  const heroCueRef = useRef(null);
  const storiesAnchorRef = useRef(null);
  // Pinned hero: full-height at the top of the page, shrinks to a half-screen
  // banner as you scroll, then stays pinned while the rest of the page
  // glides behind it. Reverses smoothly when scrolling back up.
  useEffect(() => {
    const section = heroSectionRef.current;
    if (!section) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const nav = document.querySelector('.site-nav');
      const navH = nav ? nav.offsetHeight : 0;
      section.style.setProperty('--hero-top', `${navH}px`);
      const fullH = Math.max(window.innerHeight - navH - 24, 320);
      const halfH = Math.round(window.innerHeight * 0.5);
      const t = Math.min(Math.max(window.scrollY / Math.max(fullH - halfH, 1), 0), 1);
      const eased = t * t * (3 - 2 * t);
      section.style.height = `${Math.round(fullH + (halfH - fullH) * eased)}px`;
      const isScrolled = t >= 1;
      section.classList.toggle('is-scrolled', isScrolled);
      if (heroCueRef.current) {
        if (t > 0) {
          // Hand opacity control from the entrance animation to the scroll
          // handler so the cue fades out smoothly.
          heroCueRef.current.style.animation = 'none';
        }
        const cueOpacity = Math.max(1 - t * 2.5, 0);
        heroCueRef.current.style.opacity = String(cueOpacity);
        heroCueRef.current.style.pointerEvents = cueOpacity > 0.1 ? 'auto' : 'none';
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Scroll-reveal: fade/rise sections in as they enter the viewport.
  // Re-runs when async content lands so late-rendered cards are picked up too.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]:not(.is-visible)'));
    if (!els.length) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      // Trigger just before the element enters the viewport so content is
      // already settling in as it arrives — no visible blank space.
      { threshold: 0, rootMargin: '0px 0px 20% 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [spotlightPosts, spotlightMagazines.length, blogPosts.length, publishedThemes.length, magSettings]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setHeroReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const scrollToStories = () => {
    storiesAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [loadedImages, setLoadedImages] = useState(() => new Set());
  const markImageLoaded = (key) => {
    setLoadedImages((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const faqs = [
    {
      q: 'How do I buy a print or digital download?',
      a: 'Browse any collection and add images to your cart with credits. Digital downloads arrive instantly after checkout; fine-art prints ship from my studio within 5–7 days, carefully packed.',
    },
    {
      q: 'What are credits and how do they work?',
      a: 'Credits are the shop currency — one credit unlocks one image, and bundles get you more for less. Buy credits any time from the Pricing menu; they never expire.',
    },
    {
      q: 'Can I license an image for commercial use?',
      a: 'Yes. Most images are available for editorial and commercial licensing. Open the image, choose License, and tell me about your project — I usually reply within a day.',
    },
    {
      q: 'Do you photograph weddings and sessions?',
      a: 'I take a small number of weddings, portraits, and brand sessions each year, mostly in the Pacific Northwest. Session pricing is under the Pricing menu, and every package includes a private online gallery.',
    },
    {
      q: 'What is the digital magazine?',
      a: 'A cozy, slow-reading photo journal published monthly — full photo essays, field notes, and printing notes. Subscribe for access to every issue, or buy single issues to own forever.',
    },
    {
      q: 'Do you offer gift codes?',
      a: 'I do. Gift codes can be applied to credits, prints, or magazine issues, and they redeem instantly at checkout — a nice way to share the trail with someone.',
    },
  ];

  useEffect(() => {
    supabase
      .from('magazines')
      .select('id, title, slug, description, cover_url, is_spotlight, published_at')
      .eq('status', 'published')
      .eq('is_spotlight', true)
      .order('published_at', { ascending: false })
      .limit(4)
      .then(async ({ data }) => {
        const mags = data || [];
        // Prefer the published front-cover page over the studio's editor thumbnail.
        if (mags.length) {
          const { data: coverRows } = await supabase
            .from('magazine_reader_pages')
            .select('magazine_id, image')
            .eq('page_index', 0)
            .in('magazine_id', mags.map((m) => m.id));
          const coverMap = {};
          (coverRows || []).forEach((row) => { coverMap[row.magazine_id] = row.image; });
          setSpotlightMagazines(mags.map((m) => ({ ...m, cover_url: coverMap[m.id] || m.cover_url })));
        } else {
          setSpotlightMagazines([]);
        }
      });
  }, []);

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
      <div className="home-content">

        <section className="home-hero-band-section" ref={heroSectionRef}>
          <h1 className="home-hero-sr-title">Caleb Wolf Photography — cinematic landscapes, wilderness stories, and prints</h1>
          <div className={`home-hero-band${heroReady ? ' is-ready' : ''}`} ref={heroBandRef}>
            <img
              src={publishedThemes[0]?.cover_url || 'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?w=1600'}
              alt="Caleb Wolf Photography — landscape hero"
              className="home-hero-band-img"
            />
            <div className="home-hero-band-overlay" />
            {heroOverlayPath ? (
              <div
                className="hero-logo-overlay"
                style={{
                  left: `${heroLogoPosX}%`,
                  top: `${heroLogoPosY}%`,
                  transform: 'translate(-50%, -50%)',
                  color: heroLogoColor,
                }}
              >
                <svg
                  style={{ width: heroLogoSize, height: heroLogoSize }}
                  viewBox={heroLogoViewbox}
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d={heroOverlayPath} />
                </svg>
              </div>
            ) : null}
            <div className="home-hero-band-actions">
              <Link className="btn" to="/collections">Browse collections</Link>
              <Link className="ghost" to="/blog">Read the journal</Link>
            </div>
          </div>
          <div
            className="hero-scroll-cue"
            ref={heroCueRef}
            role="button"
            tabIndex={0}
            onClick={scrollToStories}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToStories(); }}
            aria-label="Scroll to see more"
          >
            <span>See more</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </section>
        <div ref={storiesAnchorRef} />

        {spotlightPosts && (
          <section className="home-section home-spotlight-section" data-reveal>
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
                    className={`home-spotlight-img${loadedImages.has('main') ? ' is-loaded' : ''}`}
                    onLoad={() => markImageLoaded('main')}
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
                        className={`home-spotlight-img${loadedImages.has(`side-${post.id}`) ? ' is-loaded' : ''}`}
                        onLoad={() => markImageLoaded(`side-${post.id}`)}
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

        {spotlightMagazines.length > 0 && (
          <section className="home-section" data-reveal>
            <div className="home-container">
              <div className="home-section-header">
                <div>
                  <p className="home-eyebrow">In the spotlight</p>
                  <h2 className="home-section-title">Featured Magazines</h2>
                </div>
                <Link to="/magazines" className="home-outline-btn">All Magazines</Link>
              </div>

              <div className="home-mag-spotlight-grid">
                {spotlightMagazines.map((mag) => (
                  <Link to={`/magazines/${mag.slug}`} key={mag.id} className="home-mag-spotlight-card">
                    <div className="home-mag-spotlight-cover">
                      {mag.cover_url ? (
                        <img
                          src={getCoverDisplayUrl(mag.cover_url, 600)}
                          alt={`${mag.title} magazine cover`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="home-mag-spotlight-placeholder">{mag.title.charAt(0)}</div>
                      )}
                    </div>
                    <div className="home-mag-spotlight-body">
                      <h3 className="home-mag-spotlight-title">{mag.title}</h3>
                      {mag.description && (
                        <p className="home-mag-spotlight-desc">{mag.description}</p>
                      )}
                      <span className="home-spotlight-cta">Open issue →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="home-section" data-reveal>
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

        <section className="home-section home-section-alt" data-reveal>
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

        <section className="home-section" data-reveal>
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

        <section className="home-section home-faq-section" data-reveal>
          <div className="home-container">
            <div className="home-section-header">
              <div>
                <p className="home-eyebrow">Good to know</p>
                <h2 className="home-section-title">Questions, answered</h2>
              </div>
              <Link to="/contact" className="home-outline-btn">Ask anything</Link>
            </div>

            <div className="home-faq-list">
              {faqs.map((item, i) => (
                <div key={i} className={`home-faq-item${openFaq === i ? ' open' : ''}`}>
                  <button
                    type="button"
                    className="home-faq-q"
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                    aria-expanded={openFaq === i}
                  >
                    <span>{item.q}</span>
                    <svg className="home-faq-chevron" width="14" height="14" viewBox="0 0 10 10" fill="none">
                      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {openFaq === i && <p className="home-faq-a">{item.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {magSettings?.homepage_widget_enabled && magSettings?.subscription_enabled && (
          <section className="home-section home-mag-widget-section" data-reveal>
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
