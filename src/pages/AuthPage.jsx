import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../store/AuthContext';

const AuthPage = () => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
            <p className="muted">
              {mode === 'login'
                ? 'Sign in to access your credits and downloads.'
                : 'Sign up to get 25 free credits and start collecting.'}
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

            {error && <div className="auth-error">{error}</div>}

            <button className="btn auth-submit" type="submit" disabled={submitting}>
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? (
              <p className="muted">
                No account?{' '}
                <button type="button" className="auth-link" onClick={() => { setMode('register'); setError(''); }}>
                  Sign up free
                </button>
              </p>
            ) : (
              <p className="muted">
                Already have an account?{' '}
                <button type="button" className="auth-link" onClick={() => { setMode('login'); setError(''); }}>
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
