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
          <Link to="/login">Sign in</Link> or create an account to purchase credits.
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
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';
import { useStore } from '../store/StoreContext';

const GiftCodeRedeem = () => {
  const { user } = useAuth();
  const { refreshCredits } = useStore(); // call this after redeem to update balance
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const formatCode = (raw) => {
    const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
    return clean.match(/.{1,4}/g)?.join('-') ?? clean;
  };

  const handleChange = (e) => {
    setCode(formatCode(e.target.value));
    if (status !== 'idle') {
      setStatus('idle');
      setMessage('');
    }
  };

  const handleRedeem = async () => {
    if (!user) return;
    const raw = code.replace(/-/g, '');
    if (raw.length < 4) {
      setStatus('error');
      setMessage('Please enter a valid gift code.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      // 1. Look up the code
      const { data: gc, error: lookupErr } = await supabase
        .from('gift_codes')
        .select('*')
        .eq('code', code.trim())
        .single();

      if (lookupErr || !gc) {
        throw new Error('Code not found. Please check and try again.');
      }
      if (!gc.active) {
        throw new Error('This gift code is no longer active.');
      }
      if (gc.expires_at && new Date(gc.expires_at) < new Date()) {
        throw new Error('This gift code has expired.');
      }
      if (gc.max_uses !== null && gc.use_count >= gc.max_uses) {
        throw new Error('This gift code has reached its maximum number of uses.');
      }

      // 2. Check if user already redeemed this code
      const { data: existing } = await supabase
        .from('gift_code_redemptions')
        .select('id')
        .eq('code_id', gc.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        throw new Error('You have already redeemed this gift code.');
      }

      // 3. Record redemption
      const { error: redeemErr } = await supabase
        .from('gift_code_redemptions')
        .insert({ code_id: gc.id, user_id: user.id, credits_granted: gc.credits });

      if (redeemErr) throw new Error('Failed to redeem code. Please try again.');

      // 4. Increment use count on the code
      await supabase
        .from('gift_codes')
        .update({ use_count: gc.use_count + 1 })
        .eq('id', gc.id);

      // 5. Add credits to user's balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', user.id)
        .single();

      await supabase
        .from('profiles')
        .update({ credit_balance: (profile?.credit_balance ?? 0) + gc.credits })
        .eq('id', user.id);

      if (typeof refreshCredits === 'function') refreshCredits();

      setStatus('success');
      setMessage(`${gc.credits} credits have been added to your account!`);
      setCode('');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  const isReady = code.replace(/-/g, '').length >= 4 && user && status !== 'loading';

  return (
    <section className="gift-redeem-section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Gift Codes</p>
          <h2>Redeem a Gift Code</h2>
          <p className="lead">Have a gift code? Enter it below to instantly add credits.</p>
        </div>
      </div>

      <div className="gift-redeem-card">
        <div className="gift-redeem-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12"/>
            <rect x="2" y="7" width="20" height="5"/>
            <line x1="12" y1="22" x2="12" y2="7"/>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
          </svg>
        </div>

        <div className="gift-redeem-body">
          {!user && (
            <p className="gift-redeem-notice">
              Please <a href="/login">sign in</a> to redeem a gift code.
            </p>
          )}

          <div className="gift-redeem-row">
            <input
              type="text"
              className="gift-code-input"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={code}
              onChange={handleChange}
              maxLength={19}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={!user || status === 'loading'}
              aria-label="Gift code"
            />
            <button
              className="btn gift-redeem-btn"
              onClick={handleRedeem}
              disabled={!isReady}
            >
              {status === 'loading' ? 'Redeeming…' : 'Redeem'}
            </button>
          </div>

          {status === 'success' && (
            <div className="gift-status gift-status-success" role="status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              {message}
            </div>
          )}
          {status === 'error' && (
            <div className="gift-status gift-status-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {message}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default GiftCodeRedeem;
