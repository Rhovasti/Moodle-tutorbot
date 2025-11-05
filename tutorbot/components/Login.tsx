
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg dark:bg-gray-800">
        <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/><path d="M12 7c-2.757 0-5 2.243-5 5s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 8.001c-1.654 0-3-1.346-3-3s1.346-3 3-3 3 1.346 3 3-1.346 3-3 3z"/><path d="M12 10.499c-.275 0-.5.225-.5.5v2c0 .275.225.5.5.5s.5-.225.5-.5v-2c0-.275-.225-.5-.5-.5zM11 11.499h2v1h-2z"/></svg>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Moodle Tutorbot</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Your Personal Learning Assistant</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="relative">
             <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 text-gray-900 bg-gray-100 border-2 border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter your Moodle Username"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-center transition duration-200 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:focus:ring-blue-800"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
