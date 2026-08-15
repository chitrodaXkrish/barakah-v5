import { useEffect, useState } from 'react';
import splashLastFrame from '@/assets/splash-last-frame.png';
import desertBottom from '@/assets/desert-bottom.png.asset.json';
import { assetUrl } from '@/lib/assetUrl';

const splashGif = 'https://ik.imagekit.io/i9qun1svg/30%20fps%20.gif';

export const LoadingScreen: React.FC = () => {
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    const freezeTimer = window.setTimeout(() => setFrozen(true), 1850);
    return () => window.clearTimeout(freezeTimer);
  }, []);

  return (
    <div
      className="min-h-screen max-w-md mx-auto relative overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: '#fff5e7' }}
    >
      <img
        src={frozen ? splashLastFrame : splashGif}
        alt="Barakah"
        className="w-40 h-40 object-contain relative z-10"
      />
      <img
        src={assetUrl(desertBottom)}
        alt=""
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-full pointer-events-none select-none"
      />
    </div>
  );
};

export default LoadingScreen;
