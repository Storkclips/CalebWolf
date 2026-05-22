import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type ForceResetStep = 'code' | 'password';

export function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Force-reset intercept state
  const [forceResetEmail, setForceResetEmail] = useState('');
  const [forceResetStep, setForceResetStep] = useState<ForceResetStep | null>(null);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('force_change_password')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile?.force_change_password) {
        await supabase.auth.signOut();
        setForceResetEmail(email);
        setForceResetStep('code');
        return;
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: forceResetEmail, code: resetCode.trim(), checkOnly: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');

      setForceResetStep('password');
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters');
      return;
    }

    setResetLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: forceResetEmail, code: resetCode.trim(), newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      // Sign in with the new password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: forceResetEmail,
        password: newPassword,
      });
      if (signInError) throw signInError;

      // Clear the force reset flag
      if (signInData.user) {
        await supabase
          .from('profiles')
          .update({ force_change_password: false, password_reset_required: false })
          .eq('id', signInData.user.id);
      }

      navigate('/');
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  if (forceResetStep) {
    return (
      <div className="page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>Password Reset Required</h1>
              {forceResetStep === 'code' && (
                <p className="lead">
                  Your account requires a password reset. Enter the 6-digit code that was emailed to <strong>{forceResetEmail}</strong>.
                </p>
              )}
              {forceResetStep === 'password' && (
                <p className="lead">Code verified. Choose a new password.</p>
              )}
            </div>

            {forceResetStep === 'code' && (
              <form onSubmit={handleVerifyCode} className="auth-form">
                {resetError && <div className="auth-error">{resetError}</div>}
                <label>
                  Reset Code
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                    autoFocus
                    maxLength={6}
                    placeholder="123456"
                    inputMode="numeric"
                    disabled={resetLoading}
                  />
                </label>
                <button type="submit" className="btn auth-submit" disabled={resetLoading}>
                  {resetLoading ? 'Verifying…' : 'Verify Code'}
                </button>
              </form>
            )}

            {forceResetStep === 'password' && (
              <form onSubmit={handleSetNewPassword} className="auth-form">
                {resetError && <div className="auth-error">{resetError}</div>}
                <label>
                  New Password
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    minLength={6}
                    disabled={resetLoading}
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
                    disabled={resetLoading}
                  />
                </label>
                <button type="submit" className="btn auth-submit" disabled={resetLoading}>
                  {resetLoading ? 'Updating…' : 'Set New Password'}
                </button>
              </form>
            )}

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                className="muted small"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => { setForceResetStep(null); setResetCode(''); setResetError(null); }}
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Sign In</h1>
            <p className="lead">Welcome back! Please sign in to your account.</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </label>

            <button type="submit" className="btn auth-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="auth-switch">
            Forgot your password?{' '}
            <button
              type="button"
              className="auth-link"
              onClick={() => navigate(`/auth/reset-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Reset it
            </button>
          </div>

          <div className="auth-switch">
            Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
