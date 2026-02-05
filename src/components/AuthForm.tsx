import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSuccess?: () => void;
}

export function AuthForm({ mode, onSuccess }: AuthFormProps) {
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
        {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
      </button>
    </form>
  );
}