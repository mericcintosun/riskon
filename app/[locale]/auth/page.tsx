import { LoginForm } from '@/components/LoginForm';
import { useTranslations } from 'next-intl';

export default function AuthPage() {
  const t = useTranslations('auth');

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">{t('login_title')}</h1>
          <p className="text-gray-400">{t('login')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Login Form */}
          <div>
            <LoginForm />
          </div>

          {/* Information Section */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">
              {t('signup_title')}
            </h3>
            <p className="text-gray-400 mb-6">
              {t('noAccount')} {t('createAccount')}
            </p>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-blue-400 font-bold mt-1">✓</span>
                <span>Advanced risk analysis tools</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 font-bold mt-1">✓</span>
                <span>Real-time portfolio monitoring</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 font-bold mt-1">✓</span>
                <span>AI-powered recommendations</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 font-bold mt-1">✓</span>
                <span>Multi-language support</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
