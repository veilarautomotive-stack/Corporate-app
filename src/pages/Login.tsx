import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'default' | 'success' | 'error' | 'loading'; message: string }>({
    type: 'default',
    message: 'Enter your credentials to access the system'
  });
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Validating credentials...' });
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setStatus({ type: 'error', message: data.error || 'Invalid username or password' });
        return;
      }
      
      setStatus({ type: 'success', message: 'Login successful. Redirecting...' });
      
      // Small delay to show success message
      setTimeout(() => {
        login(data);
        navigate('/');
      }, 1000);
      
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Server error. Please try again later.' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Retail OS
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Secure Database Login
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-10 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-transparent"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-10 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-transparent"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={status.type === 'loading' || status.type === 'success'}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status.type === 'loading' ? 'Verifying...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link to="/register" className="text-sm text-blue-600 hover:text-blue-500">
              Create new account
            </Link>
          </div>
        </form>
      </div>

      {/* Status Card */}
      <div className={clsx(
        "mt-6 w-full max-w-md p-4 rounded-lg border flex items-start transition-all duration-300",
        status.type === 'default' && "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400",
        status.type === 'success' && "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400",
        status.type === 'error' && "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
        status.type === 'loading' && "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
      )}>
        <div className="flex-shrink-0 mr-3">
          {status.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {status.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {(status.type === 'default' || status.type === 'loading') && <Info className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="text-sm font-medium">System Status</h3>
          <p className="text-sm mt-1 opacity-90">{status.message}</p>
        </div>
      </div>
    </div>
  );
}
