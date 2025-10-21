
import React, { useState, useCallback, useEffect } from 'react';
import Login from './components/Login';
import Chatbot from './components/Chatbot';
import type { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('moodle-tutorbot-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('moodle-tutorbot-user');
      }
    }
  }, []);

  const handleLogin = useCallback((username: string) => {
    const newUser: User = { username };
    setUser(newUser);
    localStorage.setItem('moodle-tutorbot-user', JSON.stringify(newUser));
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('moodle-tutorbot-user');
  }, []);

  return (
    <div className="min-h-screen font-sans">
      {user ? (
        <Chatbot user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
