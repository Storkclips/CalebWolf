import { Link, NavLink, Route, Routes } from 'react-router-dom';
import {
  blogPosts,
  portfolioItems,
  pricingTiers,
  testimonials,
} from './data';

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

const Hero = () => (
  <section className="hero">
    <div className="hero-copy">
      <p className="eyebrow">Editorial & Documentary</p>
      <h1>Story-driven photography with cinematic light.</h1>
      <p className="lead">
        Weddings, portraits, and brand stories photographed with intention. Expect
        heartfelt direction, timeless color, and gallery delivery within two weeks.
      </p>
      <div className="hero-actions">
        <Link className="btn" to="/pricing">
          View collections
        </Link>
        <Link className="ghost" to="/portfolio">
          See selected work
        </Link>
      </div>
    </div>
    <div className="hero-panel">
      <div className="floating-card">
        <div className="tag">Portfolios</div>
        <h3>Weddings · Portraits · Editorial</h3>
        <p>Designed to feel like a magazine spread while staying true to you.</p>
      </div>
      <div className="floating-card">
        <div className="tag">New</div>
        <h3>Spring '24 Calendar</h3>
        <p>Limited weekend dates available for the PNW and destination travel.</p>
      </div>
    </div>
  </section>
);

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
  <Layout>
    <Hero />
    <PortfolioGrid />
    <TestimonialStrip />
    <BlogPreview />
    <Callout />
  </Layout>
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
