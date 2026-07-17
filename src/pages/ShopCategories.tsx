import { Layout } from '@/components/Layout';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import rugs from '@/assets/cat-prayer-rugs.jpg';
import fashion from '@/assets/cat-fashion.jpg';
import abaya from '@/assets/cat-abaya.jpg';
import mens from '@/assets/cat-mens.jpg';
import ladies from '@/assets/cat-ladies.jpg';
import accessories from '@/assets/cat-accessories.jpg';

const CREAM = '#FFF5E5';
const BROWN_DARK = '#5C2A14';

export const CATEGORIES = [
  { key: 'rugs', label: 'Prayer Rugs', image: rugs },
  { key: 'fashion', label: 'Fashion', image: fashion },
  { key: 'abaya', label: 'Abaya', image: abaya },
  { key: 'mens', label: "Men's Wear", image: mens },
  { key: 'ladies', label: 'Ladies Wear', image: ladies },
  { key: 'accessories', label: 'Accessories', image: accessories },
];

export const ShopCategories = () => {
  const navigate = useNavigate();
  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="min-h-screen" style={{ backgroundColor: CREAM }}>
        <div className="bg-white px-4 pt-4 pb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full border flex items-center justify-center"
            style={{ borderColor: BROWN_DARK, color: BROWN_DARK }}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: BROWN_DARK }}>
            Shop by Categories
          </h1>
        </div>

        <div className="px-4 py-6 space-y-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => navigate(`/shop?category=${c.key}`)}
              className="w-full bg-white rounded-2xl flex items-center gap-4 p-2.5 pr-5 text-left"
              style={{ boxShadow: '0 1px 3px rgba(92,42,20,0.06)' }}
            >
              <div className="h-14 w-14 rounded-full overflow-hidden shrink-0 bg-neutral-100">
                <img src={c.image} alt={c.label} loading="lazy" width={56} height={56} className="h-full w-full object-cover" />
              </div>
              <span className="text-lg font-semibold" style={{ color: BROWN_DARK }}>
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default ShopCategories;