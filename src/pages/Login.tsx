import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [forceResetEmail, setForceResetEmail] = useState('');
  const [showForceReset, setShowForceReset] = useState(false);

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
        setShowForceReset(true);
        return;
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showForceReset) {
    return (
      <div className="page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>Password Reset Required</h1>
              <p className="lead">
                A password reset link has been sent to <strong>{forceResetEmail}</strong>. Click the link in that email to set a new password.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p className="muted small" style={{ margin: 0 }}>
                Didn't receive it? Check your spam folder, or go to the reset page to request a new one.
              </p>
              <button
                type="button"
                className="btn auth-submit"
                onClick={() => navigate(`/auth/reset-password?email=${encodeURIComponent(forceResetEmail)}`)}
              >
                Go to Reset Page
              </button>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                className="muted small"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowForceReset(false)}
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
