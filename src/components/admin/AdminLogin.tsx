import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { Lock, ArrowRight, User } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export const AdminLogin: React.FC = () => {
  const { loginAdmin, setCurrentView } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await loginAdmin(username, password);
    if (!success) {
      setError('Invalid operator credentials. Please check your username and password.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#2F5233]/20 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <BrandLogo size="xl" variant="full" theme="light-bg" showSubtitle={false} />
          </div>
          <div>
            <h1 className="font-serif-brand font-bold text-xl text-[#2F5233]">
              Admin Portal
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Sign in to manage orders, catalog inventory, and store CMS.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#2A2A28] mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                id="admin-login-user-input"
                type="text"
                required
                autoComplete="off"
                placeholder="Enter operator username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#2F5233]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#2A2A28] mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                id="admin-login-pass-input"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#2F5233]"
              />
            </div>
          </div>

          <button
            id="admin-login-submit-btn"
            type="submit"
            className="w-full py-3 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            <span>Sign In to Operator Panel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center">
          <Link
            to="/"
            onClick={() => setCurrentView('home')}
            className="text-xs text-neutral-500 hover:text-neutral-800 underline"
          >
            ← Back to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
};
