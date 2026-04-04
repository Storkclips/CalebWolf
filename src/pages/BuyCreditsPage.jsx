import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import { supabase } from '../lib/supabase';
import { createCheckoutSession } from '../lib/stripe';

const fmt = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const BuyCreditsPage = () => {
  const { creditBalance } = useStore();
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      setPackages(data || []);
      setLoadingPkgs(false);
    };
    load();
  }, []);

  const handlePurchase = async (pkg) => {
    if (!user) return;
    setPurchasing(pkg.id);
    setError('');

    try {
      const { url } = await createCheckoutSession({
        priceId: pkg.stripe_price_id,
        mode: 'payment',
        successUrl: `${window.location.origin}/success`,
        cancelUrl: window.location.href,
      });

      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(null);
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
            Pick a pack below — one-time purchase, no subscription.
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

      {loadingPkgs ? (
        <div className="muted" style={{ padding: '48px 0', textAlign: 'center' }}>Loading packages…</div>
      ) : (
        <section className="grid credits-grid">
          {packages.map((pkg) => {
            const isOnSale = pkg.sale_active && pkg.sale_price_cents > 0;
            const displayPrice = isOnSale ? pkg.sale_price_cents : pkg.price_cents;
            const totalCredits = pkg.credits + pkg.bonus_credits;

            return (
              <div
                key={pkg.id}
                className={`credits-card section${pkg.is_featured ? ' credits-card-featured' : ''}`}
              >
                {pkg.is_featured && <div className="credits-card-badge">Best value</div>}
                {isOnSale && (
                  <div className="credits-card-sale-badge">{pkg.sale_label || 'Sale'}</div>
                )}

                <div className="credits-card-header">
                  <span className="credits-amount">{pkg.credits}</span>
                  <span className="muted">credits</span>
                </div>

                {pkg.bonus_credits > 0 && (
                  <div className="credits-bonus-row">
                    <span className="credits-bonus-label">+ {pkg.bonus_credits} bonus</span>
                    <span className="credits-bonus-total">= {totalCredits} total</span>
                  </div>
                )}

                <h3>{pkg.name}</h3>
                <p className="muted">{pkg.description}</p>

                <div className="credits-price">
                  {isOnSale && (
                    <span className="credits-price-original">{fmt(pkg.price_cents)}</span>
                  )}
                  <span className={`price${isOnSale ? ' credits-price-sale' : ''}`}>
                    {fmt(displayPrice)}
                  </span>
                </div>

                <ul className="credits-features">
                  <li>{totalCredits} image download credits</li>
                  <li>Instant download access</li>
                  <li>High-resolution files</li>
                  <li>One-time purchase</li>
                </ul>

                <button
                  className="btn credits-buy-btn"
                  onClick={() => handlePurchase(pkg)}
                  disabled={!user || purchasing === pkg.id}
                >
                  {purchasing === pkg.id
                    ? 'Redirecting...'
                    : `Buy for ${fmt(displayPrice)}`}
                </button>
              </div>
            );
          })}
        </section>
      )}
    </Layout>
  );
};

export default BuyCreditsPage;
