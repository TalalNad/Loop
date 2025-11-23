// frontend/src/pages/EditProfilePage.jsx
import { Link } from 'react-router-dom';

export default function EditProfilePage() {
  const storedUser = localStorage.getItem('loop_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  return (
    <div className="wa-profile-layout">
      <aside className="wa-profile-sidebar">
        <Link to="/chats" className="wa-profile-back">
          ← Back to chats
        </Link>
      </aside>

      <main className="wa-profile-main">
        <div className="wa-profile-card">
          <div className="wa-avatar-circle large">
            <span className="wa-avatar-initial">
              {currentUser?.username?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>

          <h1 className="wa-profile-title">Edit profile</h1>

          <div className="wa-profile-field">
            <label>Username</label>
            <input
              className="wa-input"
              value={currentUser?.username || ''}
              readOnly
            />
          </div>

          <div className="wa-profile-field">
            <label>Email</label>
            <input
              className="wa-input"
              value={currentUser?.email || ''}
              readOnly
            />
          </div>

          <p className="wa-profile-note">
            We&apos;ll make this editable and connect it to the backend later.
          </p>
        </div>
      </main>
    </div>
  );
}