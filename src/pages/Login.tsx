import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle, User as UserIcon, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function Login() {
  const { user, isAdminEmail } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (isAdminEmail) {
        navigate('/admin/pin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, isAdminEmail, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password authentication is not enabled. Please go to the Firebase Console, navigate to Authentication -> Sign-in method, and enable "Email/Password".');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600/10 p-3 rounded-full mb-4">
            <UserIcon className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-slate-400 mt-2 text-center text-sm">
            {isLogin 
              ? 'Sign in to access movies and features.' 
              : 'Join to start downloading and tracking movies.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-900/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl leading-5 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors"
                placeholder="you@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl leading-5 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-500 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
