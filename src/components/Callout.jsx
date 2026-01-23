import { Link } from 'react-router-dom';

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

export default Callout;
