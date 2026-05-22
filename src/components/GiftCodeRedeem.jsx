import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';

const GiftCodeRedeem = () => {
  const { user, refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
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
      const { data, error } = await supabase.rpc('redeem_gift_code', { p_code: code.trim() });

      if (error) throw new Error(error.message || 'Something went wrong. Please try again.');
      if (data?.error) throw new Error(data.error);

      await refreshProfile();

      setStatus('success');
      setMessage(`${data.credits} credits have been added to your account!`);
      setCode('');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  const isReady = code.replace(/-/g, '').length >= 4 && user && status !== 'loading';

  return (
    <section className="gift-redeem-section" style={{ maxWidth: 520, margin: '0 auto', padding: '2rem 0' }}>
      <div className="section-head">
        <div>
          <p className="eyebrow">Gift Codes</p>
          <h2>Redeem a Gift Code</h2>
          <p className="lead">Have a gift code? Enter it below to instantly add credits.</p>
        </div>
      </div>

      <div className="gift-redeem-card" style={{ width: '100%' }}>
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
              {status === 'loading' ? 'Redeeming\u2026' : 'Redeem'}
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
