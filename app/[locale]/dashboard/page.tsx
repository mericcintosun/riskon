import { useTranslations } from 'next-intl';

export default function Dashboard() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">{t('title')}</h1>
        <p className="text-gray-400">{t('overview')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Assets Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium mb-2">
            {t('totalAssets')}
          </h3>
          <p className="text-3xl font-bold text-blue-500">$50,000</p>
          <p className="text-green-400 text-sm mt-2">+5.2% {tCommon('success')}</p>
        </div>

        {/* Risk Score Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium mb-2">
            {t('riskScore')}
          </h3>
          <p className="text-3xl font-bold text-orange-500">42</p>
          <p className="text-gray-400 text-sm mt-2">Medium Risk</p>
        </div>

        {/* Assets Count Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium mb-2">
            {t('assets')}
          </h3>
          <p className="text-3xl font-bold text-purple-500">12</p>
          <p className="text-gray-400 text-sm mt-2">{t('portfolio')}</p>
        </div>
      </div>

      <div className="mt-12">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">{t('portfolio')}</h2>
          <p className="text-gray-400">{t('noData')}</p>
        </div>
      </div>
    </main>
  );
}
