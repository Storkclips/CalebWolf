import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';

export function Login() {
  const navigate = useNavigate();
  const [showReset, setShowReset] = useState(false);

  const handleSuccess = () => {
    navigate('/');
  };

  return (
    <div className="page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{showReset ? 'Reset Password' : 'Sign In'}</h1>
            <p className="lead">
              {showReset
                ? 'Enter your email to receive a password reset link.'
                : 'Welcome back! Please sign in to your account.'}
            </p>
          </div>

          {showReset ? (
            <AuthForm
              mode="reset"
              onResetSuccess={() => setShowReset(false)}
            />
          ) : (
            <AuthForm mode="login" onSuccess={handleSuccess} />
          )}

          <div className="auth-switch">
            {showReset ? (
              <>
                Remember your password? <button
                  type="button"
                  className="auth-link"
                  onClick={() => setShowReset(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Forgot your password? <button
                  type="button"
                  className="auth-link"
                  onClick={() => setShowReset(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Reset it
                </button>
              </>
            )}
          </div>

          {!showReset && (
            <div className="auth-switch">
              Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}