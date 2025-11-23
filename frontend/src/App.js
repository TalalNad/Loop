// frontend/src/App.js
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import './styles/auth.css';

function App() {
  const token = localStorage.getItem('loop_token');

  return (
    <BrowserRouter>
      <div className="wa-root">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          {/* later /chats will be your main chat UI */}
          <Route
            path="/chats"
            element={token ? <div className="wa-placeholder">Chats go here</div> : <Navigate to="/login" />}
          />
          <Route
            path="/"
            element={<Navigate to={token ? '/chats' : '/login'} replace />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;