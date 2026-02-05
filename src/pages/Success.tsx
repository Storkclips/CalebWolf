import React from 'react';
import { Link } from 'react-router-dom';

export function Success() {
  return (
    <div className="page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Payment Successful!</h1>
            <p className="lead">Thank you for your purchase. Your subscription is now active.</p>
          </div>
          
          <div className="hero-actions">
            <Link to="/" className="btn">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}