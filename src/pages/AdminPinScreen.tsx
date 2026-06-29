import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function AdminPinScreen() {
  const { user, isAdminEmail, isAdminVerified, verifyAdminPin } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    } else if (!isAdminEmail) {
      navigate('/', { replace: true });
    } else if (isAdminVerified) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, isAdminEmail, isAdminVerified, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    const isValid = verifyAdminPin(pin);
    if (!isValid) {
      setError('Invalid PIN code');
      setPin('');
    } else {
      navigate('/admin/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 text-center"
      >
        <div className="inline-flex bg-red-900/20 p-4 rounded-full mb-6 mt-2">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Admin Verification</h1>
        <p className="text-slate-400 text-sm mb-6">
          Please enter your secure 4-digit master PIN.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-900/50 rounded-lg flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} // only digits
            className="block w-full text-center tracking-[1em] text-3xl py-4 border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono transition-colors"
            placeholder="••••"
            autoFocus
          />

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-red-500 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
          >
            Authenticate
          </button>
        </form>
      </motion.div>
    </div>
  );
}
