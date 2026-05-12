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

  // Supabase sends the recovery token in the URL hash after the redirect.
  // We must listen for the PASSWORD_RECOVERY event to get a valid session
  // before the user can call updateUser().
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if there's already a recovery session active
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setSessionReady(true);
    })();

    return () => subscription.unsubscribe();
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
    } catch (error: any) {
      setError(error.message);
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
            <p className="lead">Enter and confirm your new password.</p>
          </div>

          {!sessionReady ? (
            <div className="reset-pw-waiting">
              <div className="adm-users-loading-spinner" style={{ margin: '0 auto 12px' }} />
              <p className="muted small" style={{ textAlign: 'center' }}>
                Verifying your reset link…
              </p>
              <p className="muted small" style={{ textAlign: 'center', marginTop: 8 }}>
                If nothing happens, your link may have expired.{' '}
                <button
                  type="button"
                  className="auth-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => navigate('/login')}
                >
                  Request a new one
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error">{error}</div>}
              {message && <div className="notice">{message}</div>}

              <label>
                New Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
