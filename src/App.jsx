import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  blogPosts,
  clientCollections,
  collections,
  portfolioItems,
  pricingTiers,
  testimonials,
} from './data';

const heroSlides = [
  {
    image:
      'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1600&q=80',
    eyebrow: 'Editorial & Documentary',
    title: 'Full-day wedding narratives in cinematic light.',
    description:
      'Guided portraits and documentary candids woven together so your gallery feels effortless and alive.',
  },
  {
    images: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80',
    ],
    eyebrow: 'Portraits',
    title: 'Editorial portraits with gentle direction.',
    description:
      'From creative studio setups to windswept coastlines, every session is designed to feel like you.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
    eyebrow: 'Destination',
    title: 'Travel-ready storytelling for intimate celebrations.',
    description:
      'Permits, scouting, and timelines handled so you can simply be present while we create artful coverage.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?auto=format&fit=crop&w=1600&q=80',
    eyebrow: 'Brand Stories',
    title: 'Launch visuals with intentional art direction.',
    description:
      'Cohesive imagery for founders and teams, from lifestyle to product, delivered with social-ready crops.',
  },
];

const normalizeCollection = (collection) => ({
  ...collection,
  imageObjects: collection.images.map((src, index) => ({
    id: `${collection.id}-${index + 1}`,
    src,
    title: `${collection.title} — Frame ${index + 1}`,
    price: collection.pricePerImage ?? 3,
  })),
});

const normalizedClientCollections = clientCollections.map(normalizeCollection);
const normalizedCollections = collections.map(normalizeCollection);

const StoreContext = createContext();

const StoreProvider = ({ children }) => {
  const [creditBalance, setCreditBalance] = useState(25);
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((entry) => entry.id !== id));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const checkout = () => {
    if (cartTotal > creditBalance) {
      return { success: false, message: 'Not enough credits for this purchase.' };
    }
    setCreditBalance((balance) => balance - cartTotal);
    clearCart();
    return { success: true, message: 'Checkout complete. Enjoy your downloads!' };
  };

  return (
    <StoreContext.Provider
      value={{ creditBalance, cart, cartTotal, addToCart, removeFromCart, clearCart, checkout }}
    >
      {children}
    </StoreContext.Provider>
  );
};

const useStore = () => useContext(StoreContext);

const Layout = ({ children }) => {
  const { creditBalance, cart } = useStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="logo">
          Caleb Wolf
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/collections">Collections</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/blog">Blog</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          <NavLink to="/cart" className="cart-link">
            Cart ({cartCount})
          </NavLink>
        </nav>
        <div className="topbar-actions">
          <span className="pill credits">{creditBalance} credits</span>
          <Link className="pill" to="/pricing">
            Book a session
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div>
          <div className="logo">Caleb Wolf</div>
          <p>Fine-art photography for weddings, portraits, and brands.</p>
        </div>
        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/about">About</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footer-meta">
          <p>Based in Portland, available worldwide.</p>
          <p className="muted">© 2024 Caleb Wolf Photography</p>
        </div>
      </footer>
    </div>
  );
};

const MinimalHeader = () => {
  const { creditBalance, cart } = useStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="minimal-nav">
      <Link to="/" className="logo">Caleb Wolf</Link>
      <nav>
        <Link to="/collections">Collections</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/cart">Cart ({cartCount})</Link>
        <span className="pill credits">{creditBalance} credits</span>
      </nav>
    </header>
  );
};

const HeroGallery = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const slideCount = heroSlides.length;
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPaused) return undefined;

    intervalRef.current = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, 5000);

    return () => clearTimeout(intervalRef.current);
  }, [activeIndex, isPaused, slideCount]);

  const handleManualChange = (index) => {
    setIsPaused(true);
    setActiveIndex((index + slideCount) % slideCount);
  };

  const toggleToolbar = () => setIsToolbarVisible((prev) => !prev);
  const handleToolbarFocus = () => setIsToolbarVisible(true);

  const activeSlide = heroSlides[activeIndex];
  const heroImage = activeSlide.image ?? activeSlide.images?.[0];
  const isPortraitSet = activeSlide.images && activeSlide.images.length > 1;

  return (
    <section
      className="hero-gallery"
      aria-label="Featured photography gallery"
    >
      <div className="hero-inner">
        <div
          className="hero-frame"
        >
          <button
            type="button"
            className="gear-toggle"
            onClick={toggleToolbar}
            onFocus={handleToolbarFocus}
            aria-pressed={isToolbarVisible}
            aria-label="Show slideshow controls"
          >
            ⚙️
          </button>
          <div className="hero-visual">
            {isPortraitSet ? (
              <div className="hero-mosaic">
                {activeSlide.images.map((image, index) => (
                  <img
                    key={image}
                    className="hero-image portrait"
                    src={image}
                    alt={`${activeSlide.title} ${index + 1}`}
                  />
                ))}
              </div>
            ) : (
              <img className="hero-image" src={heroImage} alt={activeSlide.title} />
            )}
          </div>
          <div className="hero-copy hero-copy-overlay">
            <div className="hero-actions subtle">
              <Link className="btn" to="/collections">
                View collections
              </Link>
              <Link className="ghost" to="/contact">
                Start an inquiry
              </Link>
            </div>
          </div>
          <div className={`hero-toolbar ${isToolbarVisible ? 'visible' : ''}`}>
            <button
              className="icon-button"
              type="button"
              onClick={() => handleManualChange(activeIndex - 1)}
              aria-label="Previous slide"
            >
              ←
            </button>
            <div className="hero-dots" role="tablist" aria-label="Slide selector">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  className={`dot ${index === activeIndex ? 'active' : ''}`}
                  type="button"
                  onClick={() => handleManualChange(index)}
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => handleManualChange(activeIndex + 1)}
              aria-label="Next slide"
            >
              →
            </button>
            <div className="hero-toolbar-actions">
              <button
                className="pill control-pill"
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                aria-pressed={isPaused}
              >
                {isPaused ? 'Resume' : 'Pause'} auto-play
              </button>
              <button
                className="pill control-pill"
                type="button"
                onClick={() => {
                  setIsPaused(true);
                  setIsLightboxOpen(true);
                }}
                aria-label="Open full-screen view"
              >
                Magnify
              </button>
            </div>
          </div>
        </div>
      </div>
      {isLightboxOpen && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={activeSlide.title}>
          <button
            className="icon-button close"
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            ✕
          </button>
          <div
            className="lightbox-frame"
            style={{ backgroundImage: `url(${heroImage})` }}
            role="img"
            aria-label={activeSlide.title}
          />
          <div className="lightbox-meta">
            <div>
              <p className="eyebrow">{activeSlide.eyebrow}</p>
              <h2>{activeSlide.title}</h2>
              <p className="muted">{activeSlide.description}</p>
            </div>
            <div className="lightbox-controls">
              <button
                className="icon-button"
                type="button"
                onClick={() => handleManualChange(activeIndex - 1)}
                aria-label="Previous slide"
              >
                ←
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => handleManualChange(activeIndex + 1)}
                aria-label="Next slide"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const PortfolioGrid = () => (
  <section className="section">
    <div className="section-head">
      <div>
        <p className="eyebrow">Portfolio</p>
        <h2>Recent frames</h2>
        <p className="muted">A glimpse into how each story was framed and lit.</p>
      </div>
      <Link className="ghost" to="/contact">
        Plan your session
      </Link>
    </div>
    <div className="grid portfolio-grid">
      {portfolioItems.map((item) => (
        <article className="card" key={item.title}>
          <div className="card-image" style={{ backgroundImage: `url(${item.image})` }} />
          <div className="card-body">
            <p className="tag">{item.category}</p>
            <h3>{item.title}</h3>
            <p className="muted">Crafted with directional light and thoughtful prompts.</p>
          </div>
        </article>
      ))}
    </div>
  </section>
);

const CollectionsPage = () => {
  const [isClientLoggedIn] = useState(true);

  return (
    <Layout>
      <section className="hero slim">
        <div>
          <p className="eyebrow">Full galleries</p>
          <h1>Browse curated image collections.</h1>
          <p className="lead">
            View full stories grouped by theme. Clients see their paid collections first, then
            can continue into the public showcase. Select a collection to open the gallery view
            without an embedded preview.
          </p>
          <div className="chips">
            <span className="chip">Bulk-ready themes</span>
            <span className="chip">Client-first browsing</span>
          </div>
        </div>
      </section>

      {isClientLoggedIn && (
        <section className="section alt">
          <div className="section-head">
            <div>
              <p className="eyebrow">Your library</p>
              <h2>Client collections</h2>
              <p className="muted">Quickly revisit the galleries tied to your account.</p>
            </div>
            <div className="section-actions">
              <span className="tag">Signed in</span>
              <Link className="pill" to="/client-downloads">
                View ready downloads
              </Link>
            </div>
          </div>
          <div className="grid collections-grid">
            {normalizedClientCollections.map((collection) => (
              <Link
                key={collection.id}
                className="collection-card"
                to={`/collections/${collection.id}`}
              >
                <div
                  className="collection-cover"
                  style={{ backgroundImage: `url(${collection.cover})` }}
                  aria-hidden
                />
                <div className="collection-body">
                  <div className="tag">Paid collection</div>
                  <h3>{collection.title}</h3>
                  <p className="muted">{collection.description}</p>
                  {collection.bulkBundle && (
                    <div className="bundle-note">
                      <span className="chip">Bulk download ready</span>
                      <span className="muted small">{collection.bulkBundle.label}</span>
                    </div>
                  )}
                  <div className="chips">
                    {collection.tags.map((tag) => (
                      <span key={tag} className="chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Signature work</p>
            <h2>Explore by theme</h2>
            <p className="muted">
              Select a collection to reveal a gallery of related images. Admins can flag themes
              for bulk pricing, making it easy to purchase entire galleries in one go.
            </p>
          </div>
          <Link className="ghost" to="/contact">
            Request a private gallery
          </Link>
        </div>

        <div className="grid collections-grid">
          {normalizedCollections.map((collection) => (
            <Link
              key={collection.id}
              className="collection-card"
              to={`/collections/${collection.id}`}
            >
              <div
                className="collection-cover"
                style={{ backgroundImage: `url(${collection.cover})` }}
                aria-hidden
              />
              <div className="collection-body">
                <div className="tag">{collection.category}</div>
                <h3>{collection.title}</h3>
                <p className="muted">{collection.description}</p>
                {collection.bulkBundle && (
                  <div className="bundle-note">
                    <span className="chip">Bulk eligible</span>
                    <span className="muted small">{collection.bulkBundle.summary}</span>
                  </div>
                )}
                <div className="chips">
                  {collection.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  );
};

const GalleryPage = () => {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { addToCart, cart, creditBalance } = useStore();
  const [message, setMessage] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeModalImage, setActiveModalImage] = useState(null);

  const allCollections = [...normalizedClientCollections, ...normalizedCollections];
  const collection = allCollections.find((item) => item.id === collectionId);
  const heroImages = collection?.imageObjects ?? [];
  const curatedImages = (collection?.imageObjects ?? []).map((image, index) => ({
    ...image,
    id: `${collection?.id ?? 'test'}-test-${index + 1}`,
    title: image.title || `Test image ${index + 1}`,
  }));
  const curatedImages = collection?.imageObjects ?? [];

  useEffect(() => {
    if (!collection) {
      navigate('/collections');
    }
  }, [collection, navigate]);

  useEffect(() => {
    setHeroIndex(0);
  }, [collectionId]);

  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => setMessage(''), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!heroImages.length) return undefined;

    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroImages.length]);

  const handleSlideChange = (delta) => {
    if (!heroImages.length) return;
    setHeroIndex((prev) => (prev + delta + heroImages.length) % heroImages.length);
  };

  if (!collection) {
    return null;
  }

  const handleAdd = (image) => {
    addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: collection.title,
      preview: image.src,
    });
    setMessage('Added Item To Cart');
  };

  const handleAddBundle = () => {
    if (!collection.bulkBundle) return;
    addToCart({
      id: `${collection.id}-bundle`,
      title: `${collection.title} — ${collection.bulkBundle.label}`,
      price: collection.bulkBundle.price,
      collectionTitle: collection.title,
      preview: collection.cover,
    });
    setMessage('Added Item To Cart');
  };

  return (
    <Layout>
      <section className="hero slim gallery-hero">
        <div className="gallery-hero-main">
          <div className="gallery-hero-copy">
            <p className="eyebrow">{collection.category}</p>
            <h1>{collection.title}</h1>
            <p className="lead">{collection.description}</p>
            <div className="chips">
              {collection.tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="hero-visual-frame framed">
            {heroImages.length > 0 && (
              <button
                type="button"
                className="hero-visual-button"
                onClick={() => setActiveModalImage(heroImages[heroIndex])}
                aria-label={`Open ${heroImages[heroIndex].title}`}
              >
                <img
                  key={heroImages[heroIndex].id}
                  className="hero-visual-image"
                  src={heroImages[heroIndex].src}
                  alt={heroImages[heroIndex].title}
                />
              </button>
            )}
            <div className="hero-visual-meta">
              <span className="tag">{collection.pricePerImage} credits per image</span>
              <span className="muted small">
                {heroImages.length ? `${heroIndex + 1}/${heroImages.length}` : 'No images yet'}
              </span>
            </div>
            <div className="hero-visual-controls framed-controls">
              <button type="button" className="ghost" onClick={() => handleSlideChange(-1)}>
                ‹ Prev
              </button>
              <button type="button" className="ghost" onClick={() => handleSlideChange(1)}>
                Next ›
              </button>
            </div>
          </div>
        </div>

        <aside className="gallery-hero-side">
          <div className="gallery-meta">
            <p className="muted">Add individual frames to your cart and check out using your credit balance.</p>
            {collection.bulkBundle && (
              <div className="bulk-offer">
                <div>
                  <p className="eyebrow">Bulk pricing enabled</p>
                  <h3>{collection.bulkBundle.label}</h3>
                  <p className="muted">{collection.bulkBundle.summary}</p>
                </div>
                <button type="button" className="pill" onClick={handleAddBundle}>
                  Add bundle ({collection.bulkBundle.price} credits)
                </button>
              </div>
            )}
            <div className="gallery-actions">
              <Link className="ghost" to="/collections">
                Back to collections
              </Link>
              <Link className="ghost" to="/cart">
                Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
              </Link>
              <Link className="pill" to="/checkout">
                Go to checkout
              </Link>
            </div>
          </div>
        </aside>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Add to cart</p>
            <h2>Curated gallery</h2>
            <p className="muted">
              Select only the images you want to download. The grid adapts to your screen so you
              can comfortably browse on mobile or desktop.
            </p>
          </div>
          <div className="tag">Credits available: {creditBalance}</div>
        </div>
        <div className="gallery-grid">
          {curatedImages.map((image) => (
            <figure key={image.id} className="collection-thumb">
              <button
                type="button"
                className="thumb-media thumb-button"
                onClick={() => setActiveModalImage(image)}
                aria-label={`Preview ${image.title}`}
              >
                <img src={image.src} alt={image.title} />
              </button>
              <figcaption>
                <div>
                  <div className="muted">{image.title}</div>
                  <div className="tag">{image.price} credits</div>
                </div>
                <button type="button" className="pill icon-pill" onClick={() => handleAdd(image)}>
                  <span aria-hidden>🛒 +</span>
                  <span className="sr-only">Add to cart</span>
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
        {message && <div className="toast" role="status">{message}</div>}
        {activeModalImage && (
          <div className="lightbox overlay" role="dialog" aria-modal="true">
            <div className="lightbox-panel">
              <button
                className="icon-button close"
                type="button"
                onClick={() => setActiveModalImage(null)}
                aria-label="Close image preview"
              >
                ✕
              </button>
              <div className="lightbox-media">
                <img src={activeModalImage.src} alt={activeModalImage.title} />
              </div>
              <div className="lightbox-details">
                <div>
                  <p className="eyebrow">{collection.title}</p>
                  <h3>{activeModalImage.title}</h3>
                  <p className="muted small">{activeModalImage.price} credits</p>
                </div>
                <div className="lightbox-actions">
                  <button
                    className="pill"
                    type="button"
                    onClick={() => handleAdd(activeModalImage)}
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
};

const TestimonialStrip = () => (
  <section className="section alt">
    <div className="section-head">
      <div>
        <p className="eyebrow">Trust</p>
        <h2>Notes from clients</h2>
      </div>
      <Link className="ghost" to="/pricing">
        View full offerings
      </Link>
    </div>
    <div className="grid testimonials">
      {testimonials.map((t) => (
        <figure key={t.name} className="quote">
          <blockquote>“{t.quote}”</blockquote>
          <figcaption>
            <div className="quote-name">{t.name}</div>
            <div className="muted">{t.detail}</div>
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
);

const BlogPreview = () => (
  <section className="section">
    <div className="section-head">
      <div>
        <p className="eyebrow">Journal</p>
        <h2>Latest blog posts</h2>
      </div>
      <Link className="ghost" to="/blog">
        See all posts
      </Link>
    </div>
    <div className="grid blog-grid">
      {blogPosts.map((post) => (
        <article key={post.id} className="card blog">
          <div className="card-body">
            <div className="tag">{post.tag}</div>
            <h3>{post.title}</h3>
            <p className="muted">{post.excerpt}</p>
            <div className="muted small">{post.date}</div>
          </div>
        </article>
      ))}
    </div>
  </section>
);

const Callout = () => (
  <section className="cta">
    <div>
      <p className="eyebrow">Availability</p>
      <h2>Now booking Spring & Summer 2024</h2>
      <p className="lead">Tell me about your date, location, and vision.</p>
      <div className="hero-actions">
        <Link className="btn" to="/contact">
          Start an inquiry
        </Link>
        <Link className="ghost" to="/pricing">
          Browse pricing
        </Link>
      </div>
    </div>
    <div className="cta-card">
      <div className="tag">Avg delivery</div>
      <h3>14 days</h3>
      <p className="muted">Preview gallery within 48 hours for weddings.</p>
      <div className="divider" />
      <div className="tag">Travel</div>
      <p className="muted">No fees for the Pacific Northwest.</p>
    </div>
  </section>
);

const PricingPage = () => (
  <Layout>
    <section className="hero slim">
      <div>
        <p className="eyebrow">Invest in your story</p>
        <h1>Collections designed to feel effortless.</h1>
        <p className="lead">
          Select the coverage that fits your day, then tailor it with albums, rehearsal
          coverage, or motion clips.
        </p>
      </div>
    </section>
    <section className="section">
      <div className="grid pricing-grid">
        {pricingTiers.map((tier) => (
          <article key={tier.name} className="card pricing">
            <div className="card-body">
              <h3>{tier.name}</h3>
              <p className="price">{tier.price}</p>
              <p>{tier.description}</p>
              <ul>
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link className="btn" to="/contact">
                Book this collection
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
    <section className="section alt">
      <div className="section-head">
        <div>
          <p className="eyebrow">Ordering</p>
          <h2>Ready to reserve?</h2>
          <p className="muted">
            Submit your date and location. I respond within one business day with a tailored
            proposal and contract to lock in your booking.
          </p>
        </div>
        <Link className="ghost" to="/contact">
          Send your details
        </Link>
      </div>
    </section>
  </Layout>
);

const AboutPage = () => (
  <Layout>
    <section className="hero slim">
      <p className="eyebrow">About Caleb</p>
      <h1>Filmmaker turned photographer.</h1>
      <p className="lead">
        I learned to light for motion pictures before falling in love with stills. That mix of
        cinematic tone and honest, documentary moments defines my work today.
      </p>
    </section>
    <section className="section">
      <div className="grid about-grid">
        <div>
          <h3>Philosophy</h3>
          <p>
            I believe photos should feel lived-in and cinematic. I direct when helpful,
            then step back and let authentic moments unfold.
          </p>
          <h3>Approach</h3>
          <p>
            Every project starts with a discovery call to understand your story. From
            scouting and shot lists to color grading, I handle the details.
          </p>
        </div>
        <div className="bio-card">
          <div className="tag">Beyond the camera</div>
          <ul>
            <li>Based in Portland, traveling often for destination work.</li>
            <li>Mentors emerging photographers on lighting and workflow.</li>
            <li>Collects zines and 35mm film cameras.</li>
          </ul>
        </div>
      </div>
    </section>
  </Layout>
);

const BlogPage = () => (
  <Layout>
    <section className="hero slim">
      <p className="eyebrow">Blog</p>
      <h1>Behind the scenes & resources.</h1>
      <p className="lead">Notes on lighting, storytelling, and real sessions.</p>
    </section>
    <section className="section">
      <div className="grid blog-grid">
        {blogPosts.map((post) => (
          <article key={post.id} className="card blog">
            <div className="card-body">
              <div className="tag">{post.tag}</div>
              <h3>{post.title}</h3>
              <p className="muted">{post.excerpt}</p>
              <div className="muted small">{post.date}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  </Layout>
);

const ContactPage = () => (
  <Layout>
    <section className="hero slim">
      <p className="eyebrow">Let’s talk</p>
      <h1>Tell me about your date, vision, and priorities.</h1>
      <p className="lead">
        I respond to every inquiry within one business day. Include your location and
        dream moments.
      </p>
    </section>
    <section className="section">
      <form
        name="contact"
        method="POST"
        data-netlify="true"
        netlify-honeypot="bot-field"
        className="form"
      >
        <input type="hidden" name="form-name" value="contact" />
        <p className="hidden">
          <label>
            Don’t fill this out if you’re human: <input name="bot-field" />
          </label>
        </p>
        <div className="grid form-grid">
          <label>
            Name
            <input name="name" type="text" placeholder="Your name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" placeholder="you@example.com" required />
          </label>
          <label>
            Event date
            <input name="date" type="date" />
          </label>
          <label>
            Location
            <input name="location" type="text" placeholder="City, venue" />
          </label>
        </div>
        <label>
          What are you dreaming up?
          <textarea
            name="message"
            rows="5"
            placeholder="Share your story, timeline, and any must-have moments."
            required
          ></textarea>
        </label>
        <div className="hero-actions">
          <button type="submit" className="btn">
            Send inquiry
          </button>
          <p className="muted">Or email hello@calebwolf.com</p>
        </div>
      </form>
    </section>
  </Layout>
);

const CartPage = () => {
  const { cart, creditBalance, cartTotal, removeFromCart, clearCart } = useStore();

  return (
    <Layout>
      <section className="hero slim">
        <p className="eyebrow">Cart & Credits</p>
        <h1>Review your downloads</h1>
        <p className="lead">
          This demo cart uses credits. We added a starter balance so you can test the flow.
        </p>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Credits</p>
            <h2>Balance: {creditBalance} credits</h2>
          </div>
          <div className="tag">Cart total: {cartTotal} credits</div>
        </div>
        {cart.length === 0 ? (
          <p className="muted">Your cart is empty. Browse a collection to add images.</p>
        ) : (
          <div className="cart-panel">
            <ul className="cart-list">
              {cart.map((item) => (
                <li key={item.id} className="cart-line">
                  <div className="cart-line-info">
                    <div className="cart-thumb" style={{ backgroundImage: `url(${item.preview})` }} />
                    <div>
                      <div className="cart-title">{item.title}</div>
                      <div className="muted small">{item.collectionTitle}</div>
                    </div>
                  </div>
                  <div className="cart-line-actions">
                    <span className="tag">{item.price} credits</span>
                    <span className="muted">Qty: {item.quantity}</span>
                    <button className="ghost" type="button" onClick={() => removeFromCart(item.id)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-summary">
              <div>
                <p className="muted">Credits available</p>
                <h3>{creditBalance} credits</h3>
              </div>
              <div>
                <p className="muted">Total due</p>
                <h3>{cartTotal} credits</h3>
              </div>
              <div className="cart-summary-actions">
                <button className="ghost" type="button" onClick={clearCart}>
                  Clear cart
                </button>
                <Link className="btn" to="/checkout">
                  Proceed to checkout
                </Link>
              </div>
            </div>
          </div>
        )}
        <p className="muted small">You can review totals here, then finalize payment on the checkout page.</p>
      </section>
    </Layout>
  );
};

const ClientDownloadsPage = () => {
  const downloads = normalizedClientCollections.flatMap((collection) =>
    collection.imageObjects.map((image) => ({
      ...image,
      collectionTitle: collection.title,
      collectionId: collection.id,
      category: collection.category,
    })),
  );

  const [lightboxImage, setLightboxImage] = useState(null);
  const [expandedCards, setExpandedCards] = useState(() => new Set());

  const toggleExpanded = (id) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Layout>
      <section className="hero slim">
        <p className="eyebrow">Client library</p>
        <h1>Ready-to-download photos</h1>
        <p className="lead">
          Access the images tied to your account. Jump back into the full gallery or download
          selects directly.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Purchased</p>
            <h2>Included downloads</h2>
            <p className="muted">Curated highlights from your collections, ready to save.</p>
          </div>
          <Link className="ghost" to="/collections">
            Back to collections
          </Link>
        </div>

        <div className="download-grid">
          {downloads.map((image) => (
            <article key={image.id} className="download-card">
              <button
                type="button"
                className="thumb-media thumb-button"
                onClick={() => setLightboxImage(image)}
              >
                <img src={image.src} alt={image.title} />
              </button>
              <div className="download-body">
                <div className="download-header">
                  <div>
                    <div className="muted small">{image.collectionTitle}</div>
                    <h3>{image.title}</h3>
                    <p className="muted">{image.category}</p>
                  </div>
                  <button
                    className="toggle-actions"
                    type="button"
                    onClick={() => toggleExpanded(image.id)}
                    aria-expanded={expandedCards.has(image.id)}
                    aria-controls={`${image.id}-actions`}
                  >
                    {expandedCards.has(image.id) ? '▲' : '▼'}
                    <span className="sr-only">Toggle download options</span>
                  </button>
                </div>
                {expandedCards.has(image.id) && (
                  <div className="download-actions" id={`${image.id}-actions`}>
                    <button className="pill" type="button">
                      Download
                    </button>
                    <Link className="ghost" to={`/collections/${image.collectionId}`}>
                      View gallery
                    </Link>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {lightboxImage && (
          <div className="lightbox" role="dialog" aria-modal="true">
            <div className="lightbox-content">
              <button className="lightbox-close" type="button" onClick={() => setLightboxImage(null)}>
                ×<span className="sr-only">Close</span>
              </button>
              <img src={lightboxImage.src} alt={lightboxImage.title} />
              <div className="muted small">
                {lightboxImage.collectionTitle} — {lightboxImage.title}
              </div>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
};

const CheckoutPage = () => {
  const { cart, cartTotal, creditBalance, checkout } = useStore();
  const [status, setStatus] = useState('');

  const handleCheckout = () => {
    const result = checkout();
    setStatus(result.message);
  };

  return (
    <Layout>
      <section className="hero slim">
        <p className="eyebrow">Checkout</p>
        <h1>Finish your download order</h1>
        <p className="lead">
          Securely spend credits on your selected images. You can still remove items before
          confirming.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Order summary</p>
            <h2>Cart total: {cartTotal} credits</h2>
            <p className="muted">Credits available: {creditBalance}</p>
          </div>
          <Link className="ghost" to="/cart">
            Return to cart
          </Link>
        </div>

        {cart.length === 0 ? (
          <p className="muted">Your cart is empty. Add images from a gallery to proceed.</p>
        ) : (
          <div className="checkout-panel">
            <div className="checkout-list">
              {cart.map((item) => (
                <div key={item.id} className="checkout-line">
                  <div className="cart-line-info">
                    <div className="cart-thumb" style={{ backgroundImage: `url(${item.preview})` }} />
                    <div>
                      <div className="cart-title">{item.title}</div>
                      <div className="muted small">{item.collectionTitle}</div>
                    </div>
                  </div>
                  <div className="cart-line-actions">
                    <span className="tag">{item.price} credits</span>
                    <span className="muted">Qty: {item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="checkout-summary">
              <div className="summary-line">
                <span>Credits available</span>
                <strong>{creditBalance} credits</strong>
              </div>
              <div className="summary-line">
                <span>Cart total</span>
                <strong>{cartTotal} credits</strong>
              </div>
              <button className="btn" type="button" onClick={handleCheckout} disabled={cartTotal === 0}>
                Complete checkout
              </button>
              <p className="muted small">Downloads unlock immediately after checkout in this demo.</p>
            </div>
          </div>
        )}
        {status && <div className="notice">{status}</div>}
      </section>
    </Layout>
  );
};

const HomePage = () => (
  <div className="home-shell">
    <MinimalHeader />
    <HeroGallery />
  </div>
);

export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/:collectionId" element={<GalleryPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/client-downloads" element={<ClientDownloadsPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </StoreProvider>
  );
}
