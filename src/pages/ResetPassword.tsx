import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Step = 'request' | 'verify' | 'done';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
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

  const handleVerifyAndReset = async (e: React.FormEvent) => {
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
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

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
            {step === 'request' && <p className="lead">Enter your email and we'll send you a reset code.</p>}
            {step === 'verify' && <p className="lead">Enter the 6-digit code we sent to <strong>{email}</strong> and choose a new password.</p>}
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
                {loading ? 'Sending…' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyAndReset} className="auth-form">
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
              <label>
                New Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </label>
              <button type="submit" className="btn auth-submit" disabled={loading}>
                {loading ? 'Updating…' : 'Update Password'}
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
