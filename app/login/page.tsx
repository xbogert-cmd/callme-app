'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type AuthTab = 'login' | 'signup';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '0.9375rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get('error');

  const [tab, setTab]         = useState<AuthTab>('login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(callbackError ? 'Authentication failed. Please try again.' : null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createBrowserSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setMessage('Account created! Check your email for a confirmation link.');
        setLoading(false);
      }
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  const switchTab = (t: AuthTab) => {
    setTab(t);
    setError(null);
    setMessage(null);
  };

  return (
    <>
      <div className="brand-stripe" />
      <div style={{
        background: 'var(--bg)', minHeight: '100vh', paddingTop: '3px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '0 20px' }}>

          {/* Logo + title */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <Image src="/logo.webp" alt="CallMe" width={56} height={56}
                style={{ borderRadius: '16px' }} priority />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              CallMe
            </h1>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)', marginTop: '4px' }}>
              Your AI accountability coach
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border)' }}>
              {(['login', 'signup'] as AuthTab[]).map((t) => (
                <button key={t} onClick={() => switchTab(t)}
                  style={{
                    flex: 1, padding: '13px 0',
                    fontSize: '0.9375rem',
                    fontWeight: tab === t ? 600 : 500,
                    color: tab === t ? 'var(--accent)' : 'var(--text-2)',
                    background: 'none', border: 'none',
                    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: '-2px', cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}>
                  {t === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: '24px 24px 20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{
                  display: 'block', fontSize: '0.8125rem', fontWeight: 500,
                  color: 'var(--text-2)', marginBottom: '6px',
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', fontSize: '0.8125rem', fontWeight: 500,
                  color: 'var(--text-2)', marginBottom: '6px',
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {error && (
                <div style={{
                  fontSize: '0.8125rem', color: '#DC2626',
                  background: '#FEE2E2', padding: '10px 12px',
                  borderRadius: '8px', marginBottom: '14px',
                }}>
                  {error}
                </div>
              )}

              {message && (
                <div style={{
                  fontSize: '0.8125rem', color: '#166534',
                  background: '#DCFCE7', padding: '10px 12px',
                  borderRadius: '8px', marginBottom: '14px',
                }}>
                  {message}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="btn-press"
                style={{
                  width: '100%', padding: '11px', borderRadius: '10px',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: '0.9375rem', fontWeight: 600,
                  border: 'none', cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}>
                {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '0 24px', marginTop: '-4px',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            {/* Google OAuth */}
            <div style={{ padding: '16px 24px 24px' }}>
              <button onClick={handleGoogle} type="button"
                className="btn-press"
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.9375rem', fontWeight: 500,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '10px',
                }}>
                {/* Google G */}
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
