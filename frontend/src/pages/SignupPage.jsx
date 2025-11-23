// frontend/src/pages/SignupPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api/auth';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Call backend to create the user
      await signup({ username, email, password });

      // ❌ DO NOT auto-login
      // ❌ DO NOT store token/user here

      // ✅ Just send them to the login page
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wa-auth-layout">
      <aside className="wa-auth-sidebar">
        <div className="wa-sidebar-header">
          <span className="wa-brand">Loop</span>
        </div>
        <div className="wa-sidebar-subtitle">
          Join the loop and start chatting securely.
        </div>
      </aside>

      <main className="wa-auth-main">
        <div className="wa-auth-card">
          <div className="wa-auth-logo-circle">
            <span className="wa-auth-logo-initial">L</span>
          </div>
          <h1 className="wa-auth-title">Create your account</h1>
          <p className="wa-auth-subtitle">
            Pick a username your friends will recognize.
          </p>

          <form className="wa-auth-form" onSubmit={handleSubmit}>
            <label className="wa-input-label">
              Username
              <input
                type="text"
                className="wa-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="talal"
                autoComplete="username"
                required
              />
            </label>

            <label className="wa-input-label">
              Email
              <input
                type="email"
                className="wa-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
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
                autoComplete="new-password"
                required
              />
            </label>

            {error && <div className="wa-error-banner">{error}</div>}

            <button
              type="submit"
              className="wa-primary-button"
              disabled={submitting}
            >
              {submitting ? 'Creating account…' : 'Sign up'}
            </button>
          </form>

          <div className="wa-auth-footer">
            <span>Already on Loop?</span>
            <Link to="/login" className="wa-auth-link">
              Log in
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