import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-lg text-gray-600 mb-6">{t('not_found.title')}</p>
      <Link to="/" className="text-primary hover:underline font-medium">
        {t('not_found.go_home')}
      </Link>
    </div>
  );
}
