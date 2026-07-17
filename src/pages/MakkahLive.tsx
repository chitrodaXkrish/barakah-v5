import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Radio } from 'lucide-react';

export const MakkahLive = () => {
  const handleStreamClick = () => {
    window.open('https://www.youtube.com/@AlQuran4KOfficial/streams', '_blank');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-2">Makkah Live Stream</h1>
          <p className="text-muted-foreground">Watch the Holy Kaaba live 24/7</p>
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
                  Watch Live Now
                </h2>
                <p className="text-muted-foreground mb-4">
                  Experience the blessed view of Masjid al-Haram
                </p>
                <div className="flex items-center justify-center gap-2 text-primary font-medium">
                  <span>Open YouTube Stream</span>
                  <ExternalLink className="h-4 w-4" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information about Makkah */}
        <Card className="bg-card">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-xl font-semibold text-primary">About Makkah</h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Makkah (Mecca) is the holiest city in Islam and the birthplace of Prophet Muhammad (peace be upon him). 
                It is home to the Kaaba, the most sacred site in Islam, located within Masjid al-Haram (The Sacred Mosque).
              </p>
              <p>
                Muslims around the world face the direction of the Kaaba during their five daily prayers, 
                and it is the focal point of the annual Hajj pilgrimage, one of the Five Pillars of Islam.
              </p>
              <p>
                The live stream allows Muslims worldwide to connect with the holy site, 
                observe prayers, and feel spiritually closer to this blessed location at any time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};
