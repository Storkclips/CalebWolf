import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Supabase appends #access_token=...&type=recovery to the redirect URL.
  // We need to let the client library parse those tokens before calling updateUser.
  useEffect(() => {
    const hash = window.location.hash;

    if (hash && hash.includes('type=recovery')) {
      // The Supabase client automatically exchanges the hash tokens when it
      // detects them on page load via onAuthStateChange. Wait for that event.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSessionReady(true);
          subscription.unsubscribe();
        }
      });

      // Clean the hash from the URL without a page reload
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      return () => subscription.unsubscribe();
    } else {
      // Check if there's already an active recovery session (e.g., page refresh)
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
        } else {
          setError('Invalid or expired reset link. Please request a new one.');
        }
      })();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessage('Password updated successfully! Redirecting to login…');
      setTimeout(() => navigate('/login'), 2000);
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
            <p className="lead">Enter your new password below.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}
            {message && <div className="notice">{message}</div>}

            {!sessionReady && !error && (
              <p className="muted small" style={{ textAlign: 'center', margin: '8px 0 16px' }}>
                Verifying reset link…
              </p>
            )}

            <label>
              New Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || !sessionReady}
                minLength={6}
                autoFocus={sessionReady}
              />
            </label>

            <label>
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading || !sessionReady}
                minLength={6}
              />
            </label>

            <button
              type="submit"
              className="btn auth-submit"
              disabled={loading || !sessionReady}
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <a href="/login" className="muted small">Back to login</a>
          </div>
        </div>
      </div>
    </div>
  );
}
