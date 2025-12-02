import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import {
  blogPosts,
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
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1600&q=80',
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

const Layout = ({ children }) => (
  <div className="page">
    <header className="topbar">
      <Link to="/" className="logo">
        Caleb Wolf
      </Link>
      <nav className="nav">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/pricing">Pricing</NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/blog">Blog</NavLink>
        <NavLink to="/contact">Contact</NavLink>
      </nav>
      <Link className="pill" to="/pricing">
        Book a session
      </Link>
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

const MinimalHeader = () => (
  <header className="minimal-nav">
    <Link to="/" className="logo">Caleb Wolf</Link>
    <nav>
      <Link to="/pricing">Pricing</Link>
      <Link to="/contact">Contact</Link>
    </nav>
  </header>
);

const HeroGallery = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const slideCount = heroSlides.length;
  const intervalRef = useRef(null);
  const touchStartX = useRef(null);
  const lastScrollY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);

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

  const handleTouchStart = (event) => {
    setIsToolbarVisible(true);
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;

    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 40) {
      handleManualChange(activeIndex + (deltaX < 0 ? 1 : -1));
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    if (!isToolbarVisible) return undefined;

    const timeout = setTimeout(() => setIsToolbarVisible(false), 2600);
    return () => clearTimeout(timeout);
  }, [isToolbarVisible]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < lastScrollY.current) {
        setIsToolbarVisible(true);
      }

      lastScrollY.current = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeSlide = heroSlides[activeIndex];

  return (
    <section
      className="hero-gallery"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Featured photography gallery"
    >
      <div className="hero-inner">
        <div
          className="hero-frame"
          onMouseEnter={() => setIsToolbarVisible(true)}
          onMouseLeave={() => setIsToolbarVisible(false)}
        >
          <img className="hero-image" src={activeSlide.image} alt={activeSlide.title} />
          <div className="hero-copy hero-copy-overlay">
            <p className="eyebrow">{activeSlide.eyebrow}</p>
            <h1>{activeSlide.title}</h1>
            <p className="lead">{activeSlide.description}</p>
            <div className="hero-actions subtle">
              <Link className="btn" to="/pricing">
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
            style={{ backgroundImage: `url(${activeSlide.image})` }}
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

const HomePage = () => (
  <div className="home-shell">
    <MinimalHeader />
    <HeroGallery />
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
