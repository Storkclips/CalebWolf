import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import { stripeProducts } from '../stripe-config';
import { createCheckoutSession } from '../lib/stripe';

const BuyCreditsPage = () => {
  const { creditBalance } = useStore();
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const handlePurchase = async (product) => {
    if (!user) return;
    setLoading(product.priceId);
    setError('');

    try {
      const { url } = await createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode,
        successUrl: `${window.location.origin}/success`,
        cancelUrl: window.location.href,
      });

      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Layout>
      <section className="hero slim">
        <div>
          <p className="eyebrow">Credits</p>
          <h1>Buy Credits</h1>
          <p className="lead">
            Credits let you purchase and download images from any collection.
            Choose a plan below to get started.
          </p>
        </div>
        <div className="hero-panel">
          <div className="floating-card">
            <p className="eyebrow">Your balance</p>
            <div className="stat-value">{creditBalance}</div>
            <p className="muted small">credits available</p>
          </div>
        </div>
      </section>

      {!user && (
        <div className="notice" style={{ maxWidth: 600 }}>
          <Link to="/auth">Sign in</Link> or create an account to purchase credits.
        </div>
      )}

      {error && <div className="auth-error" style={{ maxWidth: 600 }}>{error}</div>}

      <section className="grid credits-grid">
        {stripeProducts.map((product) => (
          <div key={product.id} className="credits-card section">
            <div className="credits-card-header">
              <span className="credits-amount">{product.credits}</span>
              <span className="muted">credits</span>
            </div>
            <h3>{product.name}</h3>
            <p className="muted">{product.description}</p>
            <div className="credits-price">
              <span className="price">{product.currencySymbol}{product.price.toFixed(2)}</span>
              {product.mode === 'subscription' && (
                <span className="muted small">/month</span>
              )}
            </div>
            <ul className="credits-features">
              <li>{product.credits} image credits {product.mode === 'subscription' ? 'every month' : ''}</li>
              <li>Instant download access</li>
              <li>High-resolution files</li>
              {product.mode === 'subscription' && <li>Cancel anytime</li>}
            </ul>
            <button
              className="btn credits-buy-btn"
              onClick={() => handlePurchase(product)}
              disabled={!user || loading === product.priceId}
            >
              {loading === product.priceId
                ? 'Redirecting...'
                : product.mode === 'subscription'
                  ? `Subscribe for ${product.currencySymbol}${product.price.toFixed(2)}/mo`
                  : `Buy for ${product.currencySymbol}${product.price.toFixed(2)}`}
            </button>
          </div>
        ))}
      </section>
    </Layout>
  );
};

export default BuyCreditsPage;
