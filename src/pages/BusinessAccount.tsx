import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  ShoppingBag, 
  TrendingUp, 
  Users, 
  Star,
  Check,
  Crown,
  Zap,
  Shield
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const businessPerks = [
  { icon: ShoppingBag, key: 1 },
  { icon: TrendingUp, key: 2 },
  { icon: Users, key: 3 },
  { icon: Star, key: 4 },
  { icon: Shield, key: 5 },
  { icon: Zap, key: 6 }
];

const plans = [
  {
    key: 'starter',
    price: '$19',
    featuresCount: 4,
    popular: false
  },
  {
    key: 'pro',
    price: '$49',
    featuresCount: 5,
    popular: true
  },
  {
    key: 'ent',
    price: '$99',
    featuresCount: 5,
    popular: false
  }
];

export const BusinessAccount = () => {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-2">{t('business.title')}</h1>
          <p className="text-muted-foreground">
            {t('business.subtitle')}
          </p>
        </div>

        {/* Hero Section */}
        <Card className="bg-primary text-primary-foreground p-6 rounded-2xl text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('business.transform')}</h2>
          <p className="opacity-90 mb-4">
            {t('business.join_entrepreneurs')}
          </p>
          <div className="flex justify-center space-x-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold">1000+</div>
              <div className="opacity-80">{t('business.active_sellers')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">50K+</div>
              <div className="opacity-80">{t('business.products')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">100K+</div>
              <div className="opacity-80">{t('business.customers')}</div>
            </div>
          </div>
        </Card>

        {/* Business Perks */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-primary">{t('business.benefits')}</h3>
          <div className="grid grid-cols-1 gap-3">
            {businessPerks.map(({ icon: Icon, key }, index) => (
              <Card key={index} className="p-4 rounded-2xl bg-card">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{t(`business.benefit${key}_title`)}</h4>
                    <p className="text-sm text-muted-foreground">{t(`business.benefit${key}_desc`)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-primary">{t('business.choose_plan')}</h3>
          <div className="space-y-4">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`p-4 rounded-2xl relative bg-card ${plan.popular ? 'border-2 border-primary' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-2 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                    <Crown className="h-3 w-3" />
                    <span>{t('business.popular')}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-foreground">{t(`business.plan_${plan.key}`)}</h4>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-bold text-primary">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{t('business.per_month')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {Array.from({ length: plan.featuresCount }).map((_, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground">{t(`business.feat_${plan.key}_${featureIndex + 1}`)}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                      : 'bg-primary/10 hover:bg-primary/20 text-primary'
                  }`}
                >
                  {plan.popular ? t('onboarding.get_started') : t('business.choose_plan_btn')}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-primary text-primary-foreground p-6 rounded-2xl text-center">
          <h3 className="text-xl font-bold mb-2">{t('business.ready')}</h3>
          <p className="opacity-90 mb-4">
            {t('business.join_today')}
          </p>
          <Button className="bg-card text-primary hover:bg-card/90">
            {t('business.upgrade')}
          </Button>
        </Card>
      </div>
    </Layout>
  );
};
