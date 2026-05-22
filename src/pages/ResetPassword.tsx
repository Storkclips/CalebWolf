import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type Step = 'request' | 'verify' | 'password' | 'done';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlToken = searchParams.get('token') || '';
  const urlEmail = searchParams.get('email') || '';

  // If a token link was followed, go straight to the password step
  const initialStep: Step = urlToken && urlEmail ? 'password' : 'request';

  const [step, setStep] = useState<Step>(initialStep);
  const [email, setEmail] = useState(urlEmail || searchParams.get('email') || '');
  const [code, setCode] = useState(urlToken); // token from URL or manually typed code
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset code');

      setStep('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), checkOnly: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');

      setStep('password');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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

      // Sign in and clear any force-reset flag
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInData?.user) {
        await supabase
          .from('profiles')
          .update({ force_change_password: false, password_reset_required: false })
          .eq('id', signInData.user.id);
        await supabase.auth.signOut();
      }

      setStep('done');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Reset Password</h1>
            {step === 'request' && <p className="lead">Enter your email and we'll send you a reset link.</p>}
            {step === 'verify' && <p className="lead">Enter the 6-digit code sent to <strong>{email}</strong>.</p>}
            {step === 'password' && <p className="lead">Choose a new password for <strong>{email}</strong>.</p>}
            {step === 'done' && <p className="lead">Password updated! Redirecting to login…</p>}
          </div>

          {step === 'request' && (
            <form onSubmit={handleRequestCode} className="auth-form">
              {error && <div className="auth-error">{error}</div>}
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                />
              </label>
              <button type="submit" className="btn auth-submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="auth-form">
              {error && <div className="auth-error">{error}</div>}
              <label>
                Reset Code
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                  maxLength={6}
                  placeholder="123456"
                  inputMode="numeric"
                />
              </label>
              <button type="submit" className="btn auth-submit" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify Code'}
              </button>
              <button
                type="button"
                className="auth-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px', fontSize: '14px' }}
                onClick={() => { setStep('request'); setError(null); setCode(''); }}
                disabled={loading}
              >
                Resend code
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleSetPassword} className="auth-form">
              {error && <div className="auth-error">{error}</div>}
              <label>
                New Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={6}
                  disabled={loading}
                />
              </label>
              <label>
                Confirm Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </label>
              <button type="submit" className="btn auth-submit" disabled={loading}>
                {loading ? 'Updating…' : 'Set New Password'}
              </button>
            </form>
          )}

          {step !== 'done' && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link to="/login" className="muted small">Back to login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
