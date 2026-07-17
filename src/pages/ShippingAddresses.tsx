import { Layout } from '@/components/Layout';
import { ArrowLeft, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  loadAddresses,
  getSelectedAddressId,
  setSelectedAddressId,
  ShippingAddress,
} from '@/lib/addresses';

const CREAM = '#FFF5E5';
const BROWN = '#A35233';
const BROWN_DARK = '#5C2A14';
const OLIVE = '#7A8B3E';

export const ShippingAddresses = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setAddresses(loadAddresses());
    setSelectedId(getSelectedAddressId());
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedAddressId(id);
    setSelectedId(id);
  };

  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM }}>
        {/* Header */}
        <div className="px-4 pt-5 pb-4 flex items-center gap-3" style={{ backgroundColor: CREAM }}>
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full border flex items-center justify-center"
            style={{ borderColor: BROWN, color: BROWN }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold" style={{ color: BROWN }}>Shipping Address</h1>
        </div>

        <div className="flex-1 px-4 pb-28 space-y-4">
          {addresses.length === 0 && (
            <div className="bg-white rounded-2xl p-6 text-center" style={{ color: BROWN_DARK }}>
              <p className="font-medium">No shipping addresses yet.</p>
              <p className="text-sm mt-1" style={{ opacity: 0.7 }}>Tap the + button to add one.</p>
            </div>
          )}

          {addresses.map(a => {
            const selected = a.id === selectedId;
            return (
              <div key={a.id} className="bg-white rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold" style={{ color: BROWN_DARK }}>{a.fullName}</p>
                  <button
                    onClick={() => navigate(`/shipping-address/edit/${a.id}`)}
                    className="font-semibold text-sm"
                    style={{ color: BROWN }}
                  >
                    Edit
                  </button>
                </div>
                <p className="text-sm mt-1" style={{ color: BROWN_DARK }}>{a.address}</p>
                <p className="text-sm" style={{ color: BROWN_DARK }}>
                  {a.city}, {a.state} {a.zip}, {a.country}
                </p>

                <button
                  onClick={() => toggleSelect(a.id)}
                  className="mt-3 pt-3 border-t w-full flex items-center justify-center gap-3"
                  style={{ borderColor: `${BROWN_DARK}15` }}
                >
                  <span
                    className="h-6 w-6 rounded-md flex items-center justify-center border-2"
                    style={{
                      backgroundColor: selected ? OLIVE : 'transparent',
                      borderColor: selected ? OLIVE : '#D9D9D9',
                    }}
                  >
                    {selected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                  </span>
                  <span className="font-medium" style={{ color: BROWN_DARK }}>
                    Use as the shipping address
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* FAB */}
        <button
          onClick={() => navigate('/shipping-address/new')}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full shadow-lg flex items-center justify-center"
          style={{ backgroundColor: OLIVE, color: 'white' }}
          aria-label="Add address"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>
    </Layout>
  );
};