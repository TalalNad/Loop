// frontend/src/App.js
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ChatsPage from './pages/ChatsPage';
import EditProfilePage from './pages/EditProfilePage';

import './styles/auth.css';
import './styles/chat.css';

function RequireAuth({ children }) {
  const token = localStorage.getItem('loop_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <div className="wa-root">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/chats"
            element={
              <RequireAuth>
                <ChatsPage />
              </RequireAuth>
            }
          />

          <Route
            path="/profile"
            element={
              <RequireAuth>
                <EditProfilePage />
              </RequireAuth>
            }
          />

          <Route
            path="/"
            element={<Navigate to="/chats" replace />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;