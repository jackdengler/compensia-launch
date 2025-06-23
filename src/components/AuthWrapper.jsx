import { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import ClientManager from './ClientManager';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function AuthWrapper() {
  const [activeUser, setActiveUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('mona_active_user');
    if (stored) setActiveUser(stored);
  }, []);

  const handleLogin = async (username, password) => {
    try {
      const loginRes = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!loginRes.ok) {
        const data = await loginRes.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await loginRes.json();
      localStorage.setItem('mona_active_user', username);
      localStorage.setItem(`ClientList_${username}`, JSON.stringify(data.clients || {}));
      setActiveUser(username);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mona_active_user');
    setActiveUser(null);
  };

  return activeUser
    ? <ClientManager username={activeUser} onLogout={handleLogout} />
    : <LoginPage onLogin={handleLogin} />;
}
