import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CODE_TTL = 5 * 60;

type Step = 'request' | 'verify' | 'new-password';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [step, setStep] = useState<Step>('request');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!sentAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, CODE_TTL - Math.floor((Date.now() - sentAt) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [sentAt]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const sendCode = useCallback(async (emailToSend: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email: emailToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setSentAt(Date.now());
      setSecondsLeft(CODE_TTL);
      setCode('');
      setStep('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) sendCode(email.trim());
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), checkOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      setStep('new-password');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setSuccess('Password updated! Redirecting to sign in…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page reset-pw-page">
      <div className="auth-container">
        <div className="auth-card">

          {/* Step indicators */}
          <div className="reset-pw-steps">
            {(['request', 'verify', 'new-password'] as Step[]).map((s, i) => (
              <div key={s} className={`reset-pw-step ${step === s ? 'active' : ''} ${
                (step === 'verify' && s === 'request') || (step === 'new-password' && s !== 'new-password') ? 'done' : ''
              }`}>
                <span className="reset-pw-step-dot">{
                  (step === 'verify' && s === 'request') || (step === 'new-password' && s !== 'new-password')
                    ? '✓' : i + 1
                }</span>
                <span className="reset-pw-step-label">
                  {s === 'request' ? 'Email' : s === 'verify' ? 'Code' : 'Password'}
                </span>
              </div>
            ))}
          </div>

          <div className="auth-header">
            <h1>
              {step === 'request' ? 'Reset Password' : step === 'verify' ? 'Enter Code' : 'New Password'}
            </h1>
            <p className="lead">
              {step === 'request' && "Enter your email and we'll send you a 6-digit code."}
              {step === 'verify' && `A 6-digit code was sent to ${email}.`}
              {step === 'new-password' && 'Code verified. Choose your new password.'}
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="notice">{success}</div>}

          {step === 'request' && (
            <form onSubmit={handleRequestSubmit} className="auth-form">
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </label>
              <button type="submit" className="btn auth-submit" disabled={loading || !email.trim()}>
                {loading ? 'Sending…' : 'Send Code'}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifySubmit} className="auth-form">
              <div className="reset-pw-timer-row">
                {secondsLeft > 0 ? (
                  <span className="reset-pw-timer">Expires in <strong>{fmt(secondsLeft)}</strong></span>
                ) : (
                  <span className="reset-pw-timer expired">Code expired</span>
                )}
                <button
                  type="button"
                  className="auth-link reset-pw-resend"
                  disabled={loading || secondsLeft > 0}
                  onClick={() => sendCode(email.trim())}
                  style={{ background: 'none', border: 'none', cursor: secondsLeft > 0 ? 'not-allowed' : 'pointer' }}
                >
                  {secondsLeft > 0 ? `Resend in ${fmt(secondsLeft)}` : 'Resend code'}
                </button>
              </div>

              <label>
                6-Digit Code
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={loading}
                  autoFocus
                  placeholder="000000"
                  className="reset-pw-code-input"
                />
              </label>

              <button type="submit" className="btn auth-submit" disabled={loading || secondsLeft === 0 || code.length !== 6}>
                {loading ? 'Verifying…' : 'Verify Code'}
              </button>

              <button
                type="button"
                className="ghost"
                style={{ width: '100%', textAlign: 'center' }}
                onClick={() => { setStep('request'); setError(null); }}
              >
                ← Use a different email
              </button>
            </form>
          )}

          {step === 'new-password' && (
            <form onSubmit={handlePasswordSubmit} className="auth-form">
              <label>
                New Password
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  autoFocus
                />
              </label>
              <label>
                Confirm Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </label>
              <button type="submit" className="btn auth-submit" disabled={loading}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
