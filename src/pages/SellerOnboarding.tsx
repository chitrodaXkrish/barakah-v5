import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, CameraIcon, Shield, Check, Store, ChevronDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CALLING_CODES, COUNTRIES } from '@/lib/countries';

type StepNum = 1 | 2 | 3 | 4;

interface FormState {
  business_name: string;
  seller_display_name: string;
  contact_person: string;
  email: string;
  phone_country_code: string;
  phone_number: string;
  country_of_operations: string;
  halal_compliant: boolean;
  no_prohibited_categories: boolean;
  understands_review: boolean;
  agreed_to_terms: boolean;
  banner_url: string;
  logo_url: string;
  about_us: string;
  bank_account_name: string;
  bank_account_number: string;
  stripe_connected: boolean;
}

const initial: FormState = {
  business_name: '',
  seller_display_name: '',
  contact_person: '',
  email: '',
  phone_country_code: '+971',
  phone_number: '',
  country_of_operations: 'United Arab Emirates',
  halal_compliant: false,
  no_prohibited_categories: false,
  understands_review: false,
  agreed_to_terms: false,
  banner_url: '',
  logo_url: '',
  about_us: '',
  bank_account_name: '',
  bank_account_number: '',
  stripe_connected: false,
};

export const SellerOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<StepNum>(1);
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);

  // Prefill from existing seller_profiles row if any
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      const { data } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('user_id', user.uid)
        .maybeSingle();
      if (data) {
        setForm({ ...initial, ...data });
        if (data.onboarding_completed) navigate('/seller-dashboard', { replace: true });
      }
    })();
  }, [user?.uid, navigate]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const persist = async (extra: Partial<FormState> = {}, completed = false) => {
    if (!user?.uid) {
      toast.error('You must be signed in');
      return false;
    }
    setSaving(true);
    const payload: any = {
      user_id: user.uid,
      ...form,
      ...extra,
      onboarding_completed: completed,
    };
    const { error } = await supabase
      .from('seller_profiles')
      .upsert(payload, { onConflict: 'user_id' });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  };

  const step1Valid =
    form.business_name.trim().length > 0 &&
    form.halal_compliant &&
    form.no_prohibited_categories &&
    form.understands_review &&
    form.agreed_to_terms;

  const step2Valid = true; // optional fields
  const step3Valid =
    form.bank_account_name.trim().length > 0 &&
    form.bank_account_number.trim().length > 0;

  const handleNext = async () => {
    if (step === 1 && !step1Valid) return;
    if (step === 3 && !step3Valid) return;
    const ok = await persist({}, false);
    if (!ok) return;
    setStep((s) => (s + 1) as StepNum);
  };

  const handleFinish = async () => {
    const ok = await persist({}, true);
    if (!ok) return;
    toast.success('Seller account set up!');
    navigate('/seller-dashboard', { replace: true });
  };

  const handleBack = () => {
    if (step === 1) navigate(-1);
    else setStep((s) => (s - 1) as StepNum);
  };

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col" style={{ backgroundColor: '#FFF1DD' }}>
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={handleBack} aria-label="Back">
          <ArrowLeft className="h-6 w-6 text-[#1a1a1a]" />
        </button>
        <h1 className="text-lg font-bold text-[#1a1a1a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Become a Seller
        </h1>
      </div>
      {/* Progress bar */}
      {step < 4 && (
        <div className="bg-[#EADFC9] h-1 w-full">
          <div
            className="h-1 bg-[#6B7E2C] transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      )}

      <div className="flex-1 px-6 pt-6 pb-28 overflow-y-auto">
        {step === 1 && <Step1 form={form} update={update} />}
        {step === 2 && <Step2 form={form} update={update} />}
        {step === 3 && <Step3 form={form} update={update} />}
        {step === 4 && <Step4 />}
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-6 pb-6 pt-3" style={{ backgroundColor: '#FFF1DD' }}>
        {step < 4 ? (
          <Button
            onClick={handleNext}
            disabled={saving || (step === 1 && !step1Valid) || (step === 3 && !step3Valid)}
            className="w-full h-14 rounded-full text-base font-medium"
            style={{
              backgroundColor:
                (step === 1 && step1Valid) || step === 2 || (step === 3 && step3Valid)
                  ? '#A35334'
                  : '#C9BEA8',
              color: '#fff',
            }}
          >
            {saving ? 'Saving…' : 'Next'}
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={saving}
            className="w-full h-14 rounded-full text-base font-medium text-white"
            style={{ backgroundColor: '#A35334' }}
          >
            Go to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
};

/* ---------------- Step 1 ---------------- */
const Step1 = ({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) => {
  const [phoneCodeOpen, setPhoneCodeOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const selectedCountryCode = CALLING_CODES.find((option) => option.code === form.phone_country_code);

  return (
  <div className="space-y-5">
    <div>
      <h2 className="text-3xl font-bold text-[#1a1a1a] leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Tell us about your<br />Business
      </h2>
      <p className="text-sm text-[#5a4a35] mt-2">This helps us personalise your experience</p>
    </div>

    <h3 className="text-sm font-bold tracking-widest text-[#A35334] uppercase pt-2">Basic Information</h3>

    <Field label="Business Name*">
      <RoundInput
        placeholder="Legal entity name"
        value={form.business_name}
        onChange={(e) => update('business_name', e.target.value)}
      />
    </Field>

    <Field label="Seller Display Name" hint="This name is shown to buyers on the platform.">
      <RoundInput
        placeholder="e.g. Heritage Silks"
        value={form.seller_display_name}
        onChange={(e) => update('seller_display_name', e.target.value)}
      />
    </Field>

    <Field label="Contact Person">
      <RoundInput
        placeholder="Full name"
        value={form.contact_person}
        onChange={(e) => update('contact_person', e.target.value)}
      />
    </Field>

    <Field label="Email Address">
      <RoundInput
        type="email"
        placeholder="contact@business.com"
        value={form.email}
        onChange={(e) => update('email', e.target.value)}
      />
    </Field>

    <Field label="Phone Number">
      <div className="flex gap-2">
        <PickerButton
          label={form.phone_country_code}
          sublabel={selectedCountryCode?.label.replace(`${selectedCountryCode.code} `, '')}
          onClick={() => setPhoneCodeOpen(true)}
          className="w-[106px] shrink-0 px-3"
        />
        <RoundInput
          type="tel"
          inputMode="tel"
          placeholder="Write phone number"
          value={form.phone_number}
          onChange={(e) => update('phone_number', e.target.value)}
          className="min-w-0 flex-1 px-4"
        />
      </div>
    </Field>

    <Field label="Country of Operations">
      <PickerButton
        label={form.country_of_operations || 'Select country'}
        onClick={() => setCountryOpen(true)}
        className="w-full px-5"
      />
    </Field>

    {/* Islamic compliance */}
    <div className="rounded-2xl p-5 mt-4" style={{ backgroundColor: '#F5EBB8' }}>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5" style={{ color: '#6B7E2C' }} />
        <span className="italic font-semibold text-lg" style={{ color: '#6B7E2C', fontFamily: 'Reem Kufi, serif' }}>
          Islamic Compliance
        </span>
      </div>
      <Checkbox
        checked={form.halal_compliant}
        onChange={(v) => update('halal_compliant', v)}
        label="My products are strictly halal-compliant and ethically sourced"
      />
      <Checkbox
        checked={form.no_prohibited_categories}
        onChange={(v) => update('no_prohibited_categories', v)}
        label="I will not list prohibited categories (Alcohol, Pork, Riba-based assets)"
      />
      <Checkbox
        checked={form.understands_review}
        onChange={(v) => update('understands_review', v)}
        label="I understand all products may be reviewed for compliance"
      />
    </div>

    <div className="flex items-start gap-2 pt-2">
      <button
        onClick={() => update('agreed_to_terms', !form.agreed_to_terms)}
        className="mt-1 h-5 w-5 rounded-full border-2 border-[#A35334] flex items-center justify-center flex-shrink-0"
      >
        {form.agreed_to_terms && <div className="h-2.5 w-2.5 rounded-full bg-[#A35334]" />}
      </button>
      <p className="text-sm text-[#1a1a1a]">
        I agree to Barakah Seller{' '}
        <span className="text-[#3B6FA0] underline">Terms & Conditions</span>
      </p>
    </div>

    {phoneCodeOpen && (
      <OptionSheet
        title="Phone country code"
        searchPlaceholder="Search country or code"
        options={CALLING_CODES.map((option) => ({
          value: option.code,
          label: option.code,
          meta: option.label.replace(`${option.code} `, ''),
          searchText: option.label,
        }))}
        selectedValue={form.phone_country_code}
        onClose={() => setPhoneCodeOpen(false)}
        onSelect={(value) => update('phone_country_code', value)}
      />
    )}

    {countryOpen && (
      <OptionSheet
        title="Country of Operations"
        searchPlaceholder="Search country"
        options={COUNTRIES.map((country) => ({
          value: country.name,
          label: country.name,
          meta: country.callingCode,
          searchText: `${country.name} ${country.callingCode}`,
        }))}
        selectedValue={form.country_of_operations}
        onClose={() => setCountryOpen(false)}
        onSelect={(value) => update('country_of_operations', value)}
      />
    )}
  </div>
  );
};

/* ---------------- Step 2 ---------------- */
const Step2 = ({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) => {
  const bannerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'banner' | 'logo' | null>(null);

  const upload = async (file: File, kind: 'banner' | 'logo') => {
    setUploading(kind);
    try {
      const ext = file.name.split('.').pop();
      const path = `seller-${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      update(kind === 'banner' ? 'banner_url' : 'logo_url', data.publicUrl);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold text-[#1a1a1a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Store profile setup
        </h2>
        <p className="text-sm text-[#5a4a35] mt-2">This helps us personalise your experience</p>
      </div>
      <p className="text-base text-[#1a1a1a] leading-relaxed">
        You can update this anytime. Personalizing your shop helps build trust with buyers.
      </p>

      {/* Banner */}
      <button
        onClick={() => bannerRef.current?.click()}
        className="w-full h-32 rounded-2xl border-2 border-dashed border-[#C9A89A] flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: '#FBE3DA' }}
      >
        {form.banner_url ? (
          <img src={form.banner_url} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center text-[#8B6F5E]">
            <Camera className="h-6 w-6 mb-1" />
            <span className="text-sm font-medium tracking-wider">
              {uploading === 'banner' ? 'UPLOADING…' : 'ADD BANNER'}
            </span>
          </div>
        )}
        <span className="absolute top-2 right-3 text-xs text-[#8B6F5E]">120pt x Full</span>
        <input
          ref={bannerRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'banner')}
        />
      </button>

      {/* Logo */}
      <div className="flex justify-center">
        <button
          onClick={() => logoRef.current?.click()}
          className="h-28 w-28 rounded-full border-2 border-dashed border-[#C9A89A] flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: '#FBE3DA' }}
        >
          {form.logo_url ? (
            <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-[#A35334]">
              <CameraIcon className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-semibold tracking-wider">
                {uploading === 'logo' ? '…' : 'ADD LOGO'}
              </span>
            </div>
          )}
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'logo')}
          />
        </button>
      </div>

      <div>
        <h3 className="text-sm font-bold tracking-widest text-[#1a1a1a] uppercase mb-3">About Us</h3>
        <div className="relative">
          <Textarea
            placeholder="Tell buyers about your store, your values, and what makes your products unique..."
            value={form.about_us}
            maxLength={300}
            onChange={(e) => update('about_us', e.target.value.slice(0, 300))}
            className="min-h-[140px] rounded-2xl bg-white border border-[#EADFC9] p-4 text-[#1a1a1a] caret-[#A35334] placeholder:text-[#9a8a70] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <span className="absolute bottom-3 right-4 text-xs text-[#C9A89A]">
            {form.about_us.length}/300
          </span>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Step 3 ---------------- */
const Step3 = ({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-3xl font-bold text-[#1a1a1a]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Add Bank Details
      </h2>
      <p className="text-sm text-[#5a4a35] mt-2 leading-relaxed">
        Required before your first withdrawal to ensure a seamless transfer of your earnings.
      </p>
    </div>

    <div className="flex items-center gap-3 pt-2">
      <span
        className="text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full"
        style={{ backgroundColor: '#F5D9B8', color: '#5a3a20' }}
      >
        Bank Details
      </span>
      <div className="flex-1 h-px bg-[#E5C9A8]" />
    </div>

    <Field label="Bank Account Name">
      <RoundInput
        placeholder="e.g. Sarah J. Al-Farsi"
        value={form.bank_account_name}
        onChange={(e) => update('bank_account_name', e.target.value)}
      />
    </Field>

    <Field label="Bank Account Number">
      <RoundInput
        placeholder="•••• •••• •••• ••••"
        value={form.bank_account_number}
        onChange={(e) => update('bank_account_number', e.target.value)}
      />
    </Field>

    <div className="flex items-center gap-3 pt-4">
      <span
        className="text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full"
        style={{ backgroundColor: '#F5D9B8', color: '#5a3a20' }}
      >
        Payment Provider
      </span>
      <div className="flex-1 h-px bg-[#E5C9A8]" />
    </div>

    <div className="rounded-2xl bg-white p-4 flex items-center gap-3 shadow-sm">
      <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: '#635BFF' }}>
        S
      </div>
      <div className="flex-1">
        <div className="font-bold text-[#1a1a1a]">Connect with Stripe</div>
        <div className="text-xs text-[#7c6a4f]">Secure payments via Stripe</div>
      </div>
      <Button
        onClick={() => {
          update('stripe_connected', !form.stripe_connected);
          toast.success(form.stripe_connected ? 'Stripe disconnected' : 'Stripe connected');
        }}
        className="rounded-full px-5 h-9 text-white font-medium"
        style={{ backgroundColor: form.stripe_connected ? '#7c6a4f' : '#2A8049' }}
      >
        {form.stripe_connected ? 'Connected' : 'Connect'}
      </Button>
    </div>
  </div>
);

/* ---------------- Step 4 ---------------- */
const Step4 = () => (
  <div className="flex flex-col items-center text-center pt-16">
    <div className="relative">
      <div className="h-44 w-44 rounded-full border-2 border-dashed border-[#D9C9A8] flex items-center justify-center" style={{ backgroundColor: '#EDE2C9' }}>
        <Store className="h-16 w-16" style={{ color: '#A35334' }} />
      </div>
      <div className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-[#2A8049] flex items-center justify-center border-4" style={{ borderColor: '#FFF1DD' }}>
        <Check className="h-5 w-5 text-white" strokeWidth={3} />
      </div>
    </div>
    <h2 className="text-4xl italic font-bold mt-10 text-[#3a1e12]" style={{ fontFamily: 'Reem Kufi, serif' }}>
      You're ready to sell!
    </h2>
    <p className="text-base text-[#1a1a1a] mt-4 leading-relaxed max-w-xs">
      Your Barakah seller account is live. Start listing products and reach Muslim buyers worldwide.
    </p>
  </div>
);

/* ---------------- helpers ---------------- */
const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-base font-semibold text-[#1a1a1a] mb-2">{label}</label>
    {children}
    {hint && <p className="text-xs italic text-[#7c6a4f] mt-1.5">{hint}</p>}
  </div>
);

const PickerButton = ({
  label,
  sublabel,
  onClick,
  className = '',
}: {
  label: string;
  sublabel?: string;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`h-12 rounded-full bg-white border border-[#EADFC9] text-left shadow-sm flex items-center justify-between gap-2 active:scale-[0.99] transition-transform ${className}`}
  >
    <span className="min-w-0">
      <span className="block text-sm font-semibold truncate text-[#1a1a1a]">{label}</span>
      {sublabel && (
        <span className="block text-[10px] leading-tight truncate text-[#8B6F5E]">
          {sublabel}
        </span>
      )}
    </span>
    <ChevronDown className="h-4 w-4 shrink-0 text-[#A35334]" strokeWidth={2} />
  </button>
);

type PickerOption = {
  value: string;
  label: string;
  meta?: string;
  searchText: string;
};

const OptionSheet = ({
  title,
  searchPlaceholder,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  title: string;
  searchPlaceholder: string;
  options: PickerOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
        option.searchText.toLowerCase().includes(normalizedQuery),
      )
    : options;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-4">
      <div
        className="w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl border"
        style={{ backgroundColor: '#FFF5E5', borderColor: '#E4C49B' }}
      >
        <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3" style={{ backgroundColor: '#F5E6D0' }}>
          <div>
            <h3 className="text-[17px] font-bold text-[#2C1309]">{title}</h3>
            <p className="text-[12px] text-[#8B6F5E]">{options.length} options available</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{ color: '#A35334', backgroundColor: '#FFF5E5' }}
            aria-label={`Close ${title}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A35334]" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-12 rounded-full bg-white border-[#EADFC9] pl-11 pr-4 text-[#1a1a1a] caret-[#A35334] placeholder:text-[#C9A89A] focus-visible:ring-1 focus-visible:ring-[#A35334]/30 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        <div className="max-h-[380px] overflow-y-auto px-3 py-3">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#8B6F5E]">
              No matching option found.
            </div>
          ) : (
            filteredOptions.map((option) => {
              const selected = option.value === selectedValue;
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  className="w-full rounded-2xl px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors"
                  style={{
                    backgroundColor: selected ? '#F5EBB8' : 'transparent',
                    color: '#2C1309',
                  }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{option.label}</span>
                    {option.meta && (
                      <span className="block text-[12px] mt-0.5 truncate text-[#8B6F5E]">
                        {option.meta}
                      </span>
                    )}
                  </span>
                  {selected && (
                    <span className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#A35334' }}>
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const RoundInput = (props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
  <Input
    {...props}
    className={`h-12 rounded-full bg-white border border-[#EADFC9] px-5 text-[#1a1a1a] caret-[#A35334] placeholder:text-[#C9A89A] focus-visible:ring-0 focus-visible:ring-offset-0 ${props.className || ''}`}
  />
);

const Checkbox = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) => (
  <button onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left w-full mb-3 last:mb-0">
    <span className="mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: '#6B7E2C' }}>
      {checked && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#6B7E2C' }} />}
    </span>
    <span className="text-sm text-[#3a3a3a] leading-snug">{label}</span>
  </button>
);

export default SellerOnboarding;
