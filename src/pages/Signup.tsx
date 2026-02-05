import React from 'react';
import { Link } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';

export function Signup() {
  return (
    <div className="page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Sign Up</h1>
            <p className="lead">Create your account to get started.</p>
          </div>
          
          <AuthForm mode="signup" />
          
          <div className="auth-switch">
            Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}