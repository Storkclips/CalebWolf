import Layout from '../components/Layout';

const AboutPage = () => (
  <Layout>
    {/* Hero */}
    <div className="about-hero">
      <div className="about-hero-inner">
        <p className="eyebrow">About Caleb</p>
        <h1>Filmmaker turned<br />photographer.</h1>
        <p className="lead">
          I learned to light for motion pictures before falling in love with stills. That mix of
          cinematic tone and honest, documentary moments defines my work today.
        </p>
      </div>
      <div className="about-hero-image">
        <img
          src="https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=800"
          alt="Caleb Wolf photographer"
        />
      </div>
    </div>

    {/* Philosophy + Approach */}
    <section className="about-section">
      <div className="about-two-col">
        <div className="about-block">
          <div className="about-block-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
            </svg>
          </div>
          <h3>Philosophy</h3>
          <p className="muted">
            I believe photos should feel lived-in and cinematic. I direct when helpful,
            then step back and let authentic moments unfold naturally — never forced,
            always honest.
          </p>
        </div>
        <div className="about-block">
          <div className="about-block-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" />
              <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z" />
              <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z" />
              <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z" />
              <path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
              <path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z" />
              <path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z" />
            </svg>
          </div>
          <h3>Approach</h3>
          <p className="muted">
            Every project starts with a discovery call to understand your story. From
            scouting and shot lists to color grading, I handle the details so you can
            be fully present in the moment.
          </p>
        </div>
        <div className="about-block">
          <div className="about-block-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h3>Location</h3>
          <p className="muted">
            Based in Portland, traveling often for destination work. I've shot in over
            20 states and regularly accept bookings across the Pacific Northwest,
            Southwest, and East Coast.
          </p>
        </div>
        <div className="about-block">
          <div className="about-block-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h3>Equipment</h3>
          <p className="muted">
            Sony mirrorless system with cinema-grade prime lenses. Every piece of
            gear chosen for rendering skin tones and low-light environments
            the way human eyes experience them.
          </p>
        </div>
      </div>
    </section>

    {/* Beyond the camera */}
    <section className="about-section about-section--alt">
      <div className="about-personal">
        <div className="about-personal-text">
          <p className="eyebrow">Beyond the camera</p>
          <h2>A few things about me</h2>
          <ul className="about-list">
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Mentors emerging photographers on lighting and workflow.
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Collects zines and 35mm film cameras from the 70s and 80s.
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Shot documentary short films before switching to photography full-time.
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Runs weekend workshops on natural-light portraiture in the Pacific Northwest.
            </li>
          </ul>
        </div>
        <div className="about-personal-images">
          <img
            className="about-personal-img about-personal-img--main"
            src="https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg?auto=compress&cs=tinysrgb&w=600"
            alt="Behind the scenes"
          />
          <img
            className="about-personal-img about-personal-img--accent"
            src="https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=400"
            alt="Camera equipment"
          />
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="about-cta">
      <h2>Ready to work together?</h2>
      <p className="muted">Let's talk about your project, timeline, and vision.</p>
      <div className="about-cta-actions">
        <a href="/contact" className="btn">Get in touch</a>
        <a href="/collections" className="ghost">View my work</a>
      </div>
    </section>
  </Layout>
);

export default AboutPage;
