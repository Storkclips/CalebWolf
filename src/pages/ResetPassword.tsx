import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CODE_TTL = 5 * 60; // seconds

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill email if passed via query param from Login page
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [step, setStep] = useState<'request' | 'verify'>('request');

  // Timer
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sentAt, setSentAt] = useState<number | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Countdown tick
  useEffect(() => {
    if (!sentAt) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sentAt) / 1000);
      const remaining = Math.max(0, CODE_TTL - elapsed);
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [sentAt]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const sendCode = useCallback(async (emailToSend: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: emailToSend }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');

      setSentAt(Date.now());
      setSecondsLeft(CODE_TTL);
      setStep('verify');
      setCode('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await sendCode(email.trim());
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
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
          <div className="auth-header">
            <h1>Reset Password</h1>
            <p className="lead">
              {step === 'request'
                ? 'Enter your email and we\'ll send you a 6-digit code.'
                : `Enter the code sent to ${email} and choose a new password.`}
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="notice">{success}</div>}

          {step === 'request' ? (
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
          ) : (
            <form onSubmit={handleVerifySubmit} className="auth-form">
              {/* Timer + resend */}
              <div className="reset-pw-timer-row">
                {secondsLeft > 0 ? (
                  <span className="reset-pw-timer">
                    Code expires in <strong>{formatTime(secondsLeft)}</strong>
                  </span>
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
                  {secondsLeft > 0 ? `Resend in ${formatTime(secondsLeft)}` : 'Resend code'}
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

              <label>
                New Password
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
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

              <button type="submit" className="btn auth-submit" disabled={loading || secondsLeft === 0}>
                {loading ? 'Updating…' : 'Update Password'}
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
        </div>
      </div>
    </div>
  );
}
