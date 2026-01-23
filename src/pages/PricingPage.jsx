import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { pricingTiers } from '../data';

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

export default PricingPage;
