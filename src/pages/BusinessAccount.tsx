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

const businessPerks = [
  { icon: ShoppingBag, title: 'Sell in Islamic Store', description: 'List your products in our marketplace' },
  { icon: TrendingUp, title: 'Analytics Dashboard', description: 'Track your sales and customer insights' },
  { icon: Users, title: 'Customer Management', description: 'Manage orders and customer relationships' },
  { icon: Star, title: 'Featured Listings', description: 'Get priority placement in search results' },
  { icon: Shield, title: 'Verified Badge', description: 'Build trust with verified business status' },
  { icon: Zap, title: 'Priority Support', description: '24/7 dedicated business support' }
];

const plans = [
  {
    name: 'Starter Business',
    price: '$19',
    period: '/month',
    features: [
      'List up to 50 products',
      'Basic analytics',
      'Standard support',
      'Commission: 5%'
    ],
    popular: false
  },
  {
    name: 'Professional Business',
    price: '$49',
    period: '/month',
    features: [
      'List unlimited products',
      'Advanced analytics',
      'Priority support',
      'Featured listings',
      'Commission: 3%'
    ],
    popular: true
  },
  {
    name: 'Enterprise Business',
    price: '$99',
    period: '/month',
    features: [
      'Everything in Professional',
      'Custom branding',
      'Dedicated account manager',
      'API access',
      'Commission: 2%'
    ],
    popular: false
  }
];

export const BusinessAccount = () => {
  return (
    <Layout>
      <div className="px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-2">Business Account</h1>
          <p className="text-muted-foreground">
            Grow your Islamic business with our platform
          </p>
        </div>

        {/* Hero Section */}
        <Card className="bg-primary text-primary-foreground p-6 rounded-2xl text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Transform Your Business</h2>
          <p className="opacity-90 mb-4">
            Join thousands of Muslim entrepreneurs selling halal products
          </p>
          <div className="flex justify-center space-x-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold">1000+</div>
              <div className="opacity-80">Active Sellers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">50K+</div>
              <div className="opacity-80">Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">100K+</div>
              <div className="opacity-80">Customers</div>
            </div>
          </div>
        </Card>

        {/* Business Perks */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-primary">Business Account Benefits</h3>
          <div className="grid grid-cols-1 gap-3">
            {businessPerks.map(({ icon: Icon, title, description }, index) => (
              <Card key={index} className="p-4 rounded-2xl bg-card">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{title}</h4>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-primary">Choose Your Plan</h3>
          <div className="space-y-4">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`p-4 rounded-2xl relative bg-card ${plan.popular ? 'border-2 border-primary' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-2 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                    <Crown className="h-3 w-3" />
                    <span>Most Popular</span>
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-foreground">{plan.name}</h4>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-bold text-primary">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground">{feature}</span>
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
                  {plan.popular ? 'Get Started' : 'Choose Plan'}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-primary text-primary-foreground p-6 rounded-2xl text-center">
          <h3 className="text-xl font-bold mb-2">Ready to Start Selling?</h3>
          <p className="opacity-90 mb-4">
            Join our community of Muslim entrepreneurs today
          </p>
          <Button className="bg-card text-primary hover:bg-card/90">
            Upgrade to Business Account
          </Button>
        </Card>
      </div>
    </Layout>
  );
};
