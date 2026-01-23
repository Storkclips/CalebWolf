import { Link } from 'react-router-dom';
import { testimonials } from '../data';

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

export default TestimonialStrip;
