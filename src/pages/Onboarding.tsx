import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import onboarding1Full from '@/assets/onboarding-1-full.png';
import onboarding2Full from '@/assets/onboarding-2-full.png';
import onboarding3Full from '@/assets/onboarding-3-full.png';

const ONBOARDING_KEY = 'barakah_onboarding_completed';

type Slide = {
  image?: string;
  fullImage?: string;
  bg: string;
  title?: React.ReactNode;
  description?: string;
};

const slides: Slide[] = [
  {
    fullImage: onboarding1Full,
    bg: 'linear-gradient(180deg, #79351A 0%, #C94E1D 100%)',
  },
  {
    fullImage: onboarding2Full,
    bg: 'linear-gradient(180deg, #79351A 0%, #C94E1D 100%)',
  },
  {
    fullImage: onboarding3Full,
    bg: '#d9a23a',
  },
];

export const Onboarding = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const isLast = current === slides.length - 1;

  // Preload all onboarding images on mount for instant transitions
  useEffect(() => {
    slides.forEach((s) => {
      if (s.fullImage) {
        const img = new Image();
        img.src = s.fullImage;
      }
    });
  }, []);

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    navigate('/login', { replace: true });
  };

  const handleNext = () => {
    if (isLast) finish();
    else setCurrent((c) => c + 1);
  };

  const slide = slides[current];

  if (slide.fullImage) {
    return (
      <div
        className="min-h-screen max-w-md mx-auto relative flex flex-col overflow-hidden transition-[background] duration-500 ease-out"
        style={{ background: slide.bg }}
      >
        {slides.map((s, i) =>
          s.fullImage ? (
            <img
              key={i}
              src={s.fullImage}
              alt=""
              {...({ fetchpriority: i === 0 ? 'high' : 'low' } as any)}
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out"
              style={{ opacity: i === current ? 1 : 0 }}
            />
          ) : null
        )}
        <div className="flex justify-end px-6 pt-6 relative z-10">
          <button onClick={finish} className="text-white/95 text-base font-medium">
            Skip
          </button>
        </div>
        <div className="flex-1" />
        <div
          className="relative z-10 px-8 pt-6 pb-8"
          style={{ background: 'linear-gradient(180deg, rgba(251,241,221,0) 0%, #fbf1dd 30%, #fbf1dd 100%)' }}
        >
          <Button
            onClick={handleNext}
            className="w-full h-14 rounded-full text-white text-base font-semibold hover:opacity-90"
            style={{ backgroundColor: '#A35233' }}
          >
            {isLast ? 'Get Started' : 'Next'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen max-w-md mx-auto relative flex flex-col overflow-hidden transition-colors duration-500"
      style={{ background: slide.bg }}
    >
      {/* Skip */}
      <div className="flex justify-end px-6 pt-6 relative z-10">
        <button
          onClick={finish}
          className="text-white/95 text-base font-medium"
        >
          Skip
        </button>
      </div>

      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-6 pb-4">
        <img
          src={slide.image}
          alt=""
          className="w-full max-h-[55vh] object-contain"
        />
      </div>

      {/* Bottom cream sheet */}
      <div
        className="rounded-t-[32px] px-8 pt-10 pb-8 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]"
        style={{ backgroundColor: '#fbf1dd' }}
      >
        <h1
          className="text-center text-[28px] leading-tight font-bold mb-4"
          style={{ color: '#1a1a1a', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          {slide.title}
        </h1>
        <p
          className="text-center text-sm leading-relaxed mb-6"
          style={{ color: '#6b6b6b' }}
        >
          {slide.description}
        </p>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === current ? 24 : 16,
                backgroundColor: i === current ? '#5a6a3a' : '#d9c9a8',
              }}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          className="w-full h-14 rounded-full text-white text-base font-semibold hover:opacity-90"
          style={{ backgroundColor: '#A35233' }}
        >
          {isLast ? 'Get Started' : 'Next'}
        </Button>
      </div>
    </div>
  );
};