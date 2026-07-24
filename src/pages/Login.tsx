import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import appleLogo from '@/assets/AppleLogo.png.asset.json';
import { assetUrl } from '@/lib/assetUrl';

export const Login = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { t, direction } = useLanguage();

  const handleLogin = () => {
    navigate('/');
  };

  return (
    <div 
      className="min-h-screen bg-cream flex items-center justify-center max-w-md mx-auto relative overflow-hidden"
      dir={direction}
    >
      {/* Islamic pattern background - exact match to image */}
      <div className="absolute inset-0 opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23B8A082' fill-opacity='0.4'%3E%3Cpath d='M30 30c0-16.569-13.431-30-30-30v30h30zM0 30v30h30c0-16.569-13.431-30-30-30z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}
        />
        {/* Additional decorative pattern overlay */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236B8E7A' fill-opacity='0.15'%3E%3Cpath d='M20 40c11.046 0 20-8.954 20-20s-8.954-20-20-20-20 8.954-20 20 8.954 20 20 20zm20 0c11.046 0 20-8.954 20-20s-8.954-20-20-20-20 8.954-20 20 8.954 20 20 20z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '80px 80px'
          }}
        />
      </div>

      {/* Language Selector - Top right */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      <div className="relative z-10 w-full px-6">
        {/* Logo and Branding */}
        <div className="text-center mb-12">
          {/* Prayer beads icon */}
          <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <svg width="80" height="100" viewBox="0 0 80 100" className="text-sage">
              {/* Prayer beads circle */}
              <g fill="currentColor">
                {/* Top bead */}
                <circle cx="40" cy="8" r="6" />
                {/* Main circle of beads */}
                <circle cx="60" cy="25" r="5" />
                <circle cx="68" cy="45" r="5" />
                <circle cx="60" cy="65" r="5" />
                <circle cx="40" cy="75" r="5" />
                <circle cx="20" cy="65" r="5" />
                <circle cx="12" cy="45" r="5" />
                <circle cx="20" cy="25" r="5" />
                <circle cx="40" cy="15" r="5" />
                <circle cx="45" cy="20" r="4" />
                <circle cx="50" cy="30" r="4" />
                <circle cx="50" cy="40" r="4" />
                <circle cx="50" cy="50" r="4" />
                <circle cx="45" cy="60" r="4" />
                <circle cx="35" cy="60" r="4" />
                <circle cx="30" cy="50" r="4" />
                <circle cx="30" cy="40" r="4" />
                <circle cx="30" cy="30" r="4" />
                <circle cx="35" cy="20" r="4" />
                {/* Hanging tassel bead */}
                <circle cx="40" cy="85" r="4" />
                <circle cx="40" cy="92" r="3" />
              </g>
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-sage mb-2">BARAKAH</h1>
          <p className="text-sm text-sage/80 font-medium tracking-wide">
            {t('login.tagline')}
          </p>
        </div>

        {/* Login Form */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-sage mb-2">{t('login.create_account')}</h2>
            <p className="text-sm text-sage/70">
              {t('login.enter_email')}
            </p>
          </div>

          <div className="space-y-4">
            <Input
              type="email"
              placeholder={t('login.email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/90 border-sage/30 rounded-xl h-12 text-center text-black caret-black placeholder:text-sage/50"
              dir="ltr"
            />

            <Button 
              onClick={handleLogin}
              className="w-full bg-black hover:bg-black/90 text-white rounded-xl h-12 font-medium"
            >
              {t('login.continue')}
            </Button>

            <div className="text-center relative">
              <div className="border-t border-sage/20 absolute inset-x-0 top-1/2" />
              <span className="text-sm text-sage/60 bg-cream px-3 relative z-10">{t('login.or')}</span>
            </div>

            <Button 
              variant="outline" 
              className="w-full rounded-xl h-12 bg-white/90 border-sage/30 hover:bg-white text-sage font-medium"
            >
              <svg className="w-5 h-5 mx-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('login.google')}
            </Button>

            <Button 
              variant="outline" 
              className="w-full rounded-xl h-12 bg-white/90 border-sage/30 hover:bg-white text-sage font-medium"
            >
              <img src={assetUrl(appleLogo)} alt="Apple" className="w-5 h-5 mx-3 object-contain" />
              {t('login.apple')}
            </Button>
          </div>

          <p className="text-xs text-sage/60 text-center px-4 leading-relaxed">
            {t('login.terms')}{' '}
            <span className="underline">{t('login.terms_of_service')}</span> {t('login.and')}{' '}
            <span className="underline">{t('login.privacy_policy')}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
