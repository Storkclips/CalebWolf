import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface AuthFormProps {
  mode: 'login' | 'signup' | 'reset';
  onSuccess?: () => void;
  onResetSuccess?: () => void;
}

export function AuthForm({ mode, onSuccess, onResetSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: undefined
          }
        });

        if (error) throw error;

        setMessage('Account created successfully! You can now sign in.');
      } else if (mode === 'reset') {
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
        onResetSuccess?.();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        onSuccess?.();
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      {message && (
        <div className="notice">
          {message}
        </div>
      )}

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

      {(mode === 'login' || mode === 'signup') && (
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
      )}

      <button type="submit" className="btn auth-submit" disabled={loading}>
        {loading ? 'Loading...' : mode === 'reset' ? 'Send Reset Link' : mode === 'login' ? 'Sign In' : 'Sign Up'}
      </button>
    </form>
  );
}