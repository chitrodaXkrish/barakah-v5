import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Radio } from 'lucide-react';
import { openExternalUrl } from '@/lib/externalUrl';
import { useLanguage } from '@/contexts/LanguageContext';

export const MakkahLive = () => {
  const { t } = useLanguage();
  
  const handleStreamClick = () => {
    void openExternalUrl('https://www.youtube.com/@AlQuran4KOfficial/streams');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-2">{t('makkah_live.title')}</h1>
          <p className="text-muted-foreground">{t('makkah_live.subtitle')}</p>
        </div>

        {/* Main clickable stream card */}
        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 border-primary bg-card"
          onClick={handleStreamClick}
        >
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse bg-primary/20 rounded-full blur-xl"></div>
                <Radio className="h-16 w-16 text-primary relative z-10" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  {t('makkah_live.watch_now')}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {t('makkah_live.desc')}
                </p>
                <div className="flex items-center justify-center gap-2 text-primary font-medium">
                  <span>{t('makkah_live.open_stream')}</span>
                  <ExternalLink className="h-4 w-4" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information about Makkah */}
        <Card className="bg-card">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-xl font-semibold text-primary">{t('makkah_live.about_title')}</h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                {t('makkah_live.about_p1')}
              </p>
              <p>
                {t('makkah_live.about_p2')}
              </p>
              <p>
                {t('makkah_live.about_p3')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

