import { Layout } from '@/components/Layout';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  loadAddresses,
  upsertAddress,
  setSelectedAddressId,
  getSelectedAddressId,
  ShippingAddress,
} from '@/lib/addresses';

const CREAM = '#FFF5E5';
const BROWN = '#A35233';
const BROWN_DARK = '#5C2A14';

const schema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  address: z.string().trim().min(1, 'Address is required').max(200),
  city: z.string().trim().min(1, 'City is required').max(80),
  state: z.string().trim().min(1, 'State is required').max(80),
  zip: z.string().trim().min(1, 'Zip code is required').max(20),
  country: z.string().trim().min(1, 'Country is required').max(80),
});

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates',
  'Saudi Arabia', 'India', 'Pakistan', 'Bangladesh', 'Indonesia', 'Malaysia',
  'Turkey', 'Egypt', 'Morocco', 'Nigeria', 'France', 'Germany', 'Netherlands',
];

type Field = { label: string; key: keyof ShippingAddress; placeholder?: string };

const FIELDS: Field[] = [
  { label: 'Full name', key: 'fullName' },
  { label: 'Address', key: 'address' },
  { label: 'City', key: 'city' },
  { label: 'State/Province/Region', key: 'state' },
  { label: 'Zip Code (Postal Code)', key: 'zip' },
];

export const AddShippingAddress = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<Omit<ShippingAddress, 'id'>>({
    fullName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
  });
  const [countryOpen, setCountryOpen] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const existing = loadAddresses().find(a => a.id === id);
      if (existing) {
        const { id: _id, ...rest } = existing;
        setForm(rest);
      }
    }
  }, [id, isEdit]);

  const update = (key: keyof ShippingAddress, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid address');
      return;
    }
    const addr: ShippingAddress = { id: id ?? crypto.randomUUID(), ...form };
    upsertAddress(addr);
    if (!getSelectedAddressId()) setSelectedAddressId(addr.id);
    toast.success(isEdit ? 'Address updated' : 'Address saved');
    navigate(-1);
  };

  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM }}>
        <div className="px-4 pt-5 pb-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full border flex items-center justify-center"
            style={{ borderColor: BROWN, color: BROWN }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold" style={{ color: BROWN }}>
            {isEdit ? 'Edit Shipping Address' : 'Add Shipping Address'}
          </h1>
        </div>

        <div className="flex-1 px-4 pb-32 space-y-3">
          {FIELDS.map(f => (
            <div key={f.key} className="bg-white rounded-2xl px-4 pt-2 pb-2">
              <label className="text-xs" style={{ color: BROWN_DARK, opacity: 0.55 }}>{f.label}</label>
              <input
                value={(form[f.key] as string) ?? ''}
                onChange={e => update(f.key, e.target.value)}
                placeholder={f.label}
                className="w-full bg-transparent outline-none text-base font-medium"
                style={{ color: BROWN_DARK }}
              />
            </div>
          ))}

          {/* Country */}
          <div className="bg-white rounded-2xl px-4 pt-2 pb-2 relative">
            <label className="text-xs" style={{ color: BROWN_DARK, opacity: 0.55 }}>Country</label>
            <button
              type="button"
              onClick={() => setCountryOpen(v => !v)}
              className="w-full flex items-center justify-between text-base font-medium"
              style={{ color: BROWN_DARK }}
            >
              <span>{form.country}</span>
              <ChevronRight className={`h-5 w-5 transition-transform ${countryOpen ? 'rotate-90' : ''}`} style={{ opacity: 0.5 }} />
            </button>
            {countryOpen && (
              <div className="mt-2 max-h-60 overflow-y-auto border-t pt-2 -mx-2" style={{ borderColor: `${BROWN_DARK}15` }}>
                {COUNTRIES.map(c => (
                  <button
                    key={c}
                    onClick={() => { update('country', c); setCountryOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[#F5E6D0]"
                    style={{ color: BROWN_DARK }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 pt-3">
          <button
            onClick={handleSave}
            className="w-full h-14 rounded-full text-white text-lg font-bold shadow-lg"
            style={{ backgroundColor: BROWN }}
          >
            Save Address
          </button>
        </div>
      </div>
    </Layout>
  );
};