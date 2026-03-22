import { useTranslations } from 'next-intl';

export default function RiskAnalysis() {
  const t = useTranslations('risk');
  const tCommon = useTranslations('common');

  const riskMetrics = [
    { label: 'exposure', value: '65%' },
    { label: 'volatility', value: '32%' },
    { label: 'marketRisk', value: 'Medium' },
  ];

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">{t('title')}</h1>
        <p className="text-gray-400">{t('assessment')}</p>
      </div>

      {/* Risk Score */}
      <div className="bg-gradient-to-r from-orange-900 to-orange-800 rounded-lg p-8 mb-8 border border-orange-700">
        <h2 className="text-2xl font-bold text-white mb-4">{t('riskScore')}</h2>
        <div className="text-6xl font-bold text-orange-300 mb-4">42</div>
        <p className="text-orange-100 text-lg">{t('riskLevel')}: Medium</p>
      </div>

      {/* Risk Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {riskMetrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700"
          >
            <h3 className="text-gray-400 text-sm font-medium mb-2">
              {t(metric.label as any)}
            </h3>
            <p className="text-3xl font-bold text-blue-500">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Analysis Details */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-4">{t('metrics')}</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-gray-700">
            <span className="text-gray-300">{t('exposure')}</span>
            <span className="text-blue-400 font-semibold">65%</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-gray-700">
            <span className="text-gray-300">{t('volatility')}</span>
            <span className="text-orange-400 font-semibold">32%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">{t('marketRisk')}</span>
            <span className="text-yellow-400 font-semibold">Medium</span>
          </div>
        </div>
      </div>
    </main>
  );
}
