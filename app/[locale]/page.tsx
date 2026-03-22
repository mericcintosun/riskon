import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('dashboard');

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">
          {t('welcome')}
        </h1>
        <p className="text-gray-300 text-lg">
          {t('title')}
        </p>
      </div>
    </main>
  );
}
