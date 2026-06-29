import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Film, UserCircle, LogOut, Settings } from 'lucide-react';

export function Navbar() {
  const { user, isAdminEmail, isAdminVerified, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-500 transition-colors">
              <Film className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              MovieSync
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {isAdminEmail && isAdminVerified && (
                  <Link 
                    to="/admin/dashboard"
                    className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-800"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin Panel</span>
                  </Link>
                )}
                {isAdminEmail && !isAdminVerified && (
                  <Link 
                    to="/admin/pin"
                    className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-800"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin Access</span>
                  </Link>
                )}
                <div className="hidden md:block text-sm text-slate-400 mr-2">
                  {user.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors px-3 py-2 rounded-md hover:bg-red-950/30"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="text-white hover:text-blue-400 transition-colors bg-slate-800 px-4 py-2 rounded-lg font-medium text-sm border border-slate-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
