import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';

export function Login() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/');
  };

  return (
    <div className="page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Sign In</h1>
            <p className="lead">Welcome back! Please sign in to your account.</p>
          </div>
          
          <AuthForm mode="login" onSuccess={handleSuccess} />
          
          <div className="auth-switch">
            Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}