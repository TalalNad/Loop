// frontend/src/pages/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

export default function LoginPage() {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await login({ credential, password });

      // persist auth state (we'll later use this for protected routes)
      localStorage.setItem('loop_token', data.token);
      localStorage.setItem('loop_user', JSON.stringify(data.user));

      navigate('/chats');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wa-auth-layout">
      {/* Left sidebar mimicking WhatsApp chat list area */}
      <aside className="wa-auth-sidebar">
        <div className="wa-sidebar-header">
          <span className="wa-brand">Loop</span>
        </div>
        <div className="wa-sidebar-subtitle">
          End-to-end encrypted chat for your people.
        </div>
      </aside>

      {/* Right panel */}
      <main className="wa-auth-main">
        <div className="wa-auth-card">
          <div className="wa-auth-logo-circle">
            <span className="wa-auth-logo-initial">L</span>
          </div>
          <h1 className="wa-auth-title">Log in to Loop</h1>
          <p className="wa-auth-subtitle">
            Use your username or email, just like WhatsApp Web login.
          </p>

          <form className="wa-auth-form" onSubmit={handleSubmit}>
            <label className="wa-input-label">
              Username or Email
              <input
                type="text"
                className="wa-input"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder="talal or talal@example.com"
                autoComplete="username"
                required
              />
            </label>

            <label className="wa-input-label">
              Password
              <input
                type="password"
                className="wa-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            {error && <div className="wa-error-banner">{error}</div>}

            <button
              type="submit"
              className="wa-primary-button"
              disabled={submitting}
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <div className="wa-auth-footer">
            <span>New to Loop?</span>
            <Link to="/signup" className="wa-auth-link">
              Create an account
            </Link>
          </div>
        </div>

        <p className="wa-encryption-note">
          Your personal messages are end-to-end encrypted.
        </p>
      </main>
    </div>
  );
}