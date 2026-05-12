import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../store/AuthContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const AuthPage = () => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      if (mode === 'reset') {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-password-reset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email,
            redirectTo: `${window.location.origin}/auth/reset-password`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send reset email');
        setMessage('Check your email for a password reset link.');
        setEmail('');
      } else if (mode === 'login') {
        await signIn(email, password);
        navigate('/');
      } else {
        await signUp(email, password, displayName);
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setMessage('');
  };

  return (
    <Layout>
      <section className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>
              {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : 'Reset password'}
            </h1>
            <p className="muted">
              {mode === 'login'
                ? 'Sign in to access your credits and downloads.'
                : mode === 'register'
                ? 'Sign up to get 25 free credits and start collecting.'
                : 'Enter your email to receive a reset link.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label>
                Display name
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
              />
            </label>
            {mode !== 'reset' && (
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </label>
            )}

            {error && <div className="auth-error">{error}</div>}
            {message && <div className="notice">{message}</div>}

            <button className="btn auth-submit" type="submit" disabled={submitting}>
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign in'
                : mode === 'register'
                ? 'Create account'
                : 'Send reset link'}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' && (
              <>
                <p className="muted">
                  No account?{' '}
                  <button type="button" className="auth-link" onClick={() => switchMode('register')}>
                    Sign up free
                  </button>
                </p>
                <p className="muted">
                  Forgot password?{' '}
                  <button type="button" className="auth-link" onClick={() => switchMode('reset')}>
                    Reset it
                  </button>
                </p>
              </>
            )}
            {mode === 'register' && (
              <p className="muted">
                Already have an account?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('login')}>
                  Sign in
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <p className="muted">
                Remember your password?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('login')}>
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AuthPage;
