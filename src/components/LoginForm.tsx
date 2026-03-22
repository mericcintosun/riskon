'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function LoginForm() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login attempt:', { email, password });
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-6">{t('login_title')}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            {t('email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            {t('password')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            placeholder="••••••••"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="w-4 h-4 bg-gray-700 border border-gray-600 rounded"
            />
            <span className="text-gray-300 text-sm">{t('rememberMe')}</span>
          </label>
          <a href="#" className="text-blue-400 hover:text-blue-300 text-sm">
            {t('forgotPassword')}
          </a>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {t('signIn')}
        </button>
      </form>

      <p className="text-gray-400 text-sm text-center mt-4">
        {t('noAccount')}{' '}
        <a href="#" className="text-blue-400 hover:text-blue-300 font-semibold">
          {t('createAccount')}
        </a>
      </p>
    </div>
  );
}
