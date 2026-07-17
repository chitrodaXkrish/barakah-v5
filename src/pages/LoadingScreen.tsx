import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import splashLastFrame from '@/assets/splash-last-frame.png';
import desertBottom from '@/assets/desert-bottom.png.asset.json';
import { assetUrl } from '@/lib/assetUrl';

export const LoadingScreen = () => {
  const navigate = useNavigate();
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    // GIF duration ~1850ms — freeze on last frame after one play
    const freezeTimer = setTimeout(() => setFrozen(true), 1850);
    const navTimer = setTimeout(() => {
      navigate('/onboarding');
    }, 2600);
    return () => {
      clearTimeout(freezeTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen max-w-md mx-auto relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#fff5e7' }}>
      {/* Centered animated logo */}
      <img
        src={frozen ? splashLastFrame : 'https://ik.imagekit.io/i9qun1svg/30%20fps%20.gif'}
        alt="Barakah"
        className="w-40 h-40 object-contain relative z-10"
      />

      {/* Bottom desert with palms */}
      <img
        src={assetUrl(desertBottom)}
        alt=""
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-full pointer-events-none select-none"
      />
    </div>
  );
};
