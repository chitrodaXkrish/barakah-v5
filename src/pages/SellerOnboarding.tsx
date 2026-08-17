import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Store,
  CreditCard,
  FileCheck,
  CheckCircle2,
  Upload,
  AlertCircle,
  Loader2,
  Edit3,
  Check,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export type StepNum = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1: Business, 2: KYC, 3: Store, 4: Bank, 5: Agreements, 6: Review, 7: Submitted

export interface SellerFormData {
  // Step 1: Business
  business_name: string;
  legal_name: string;
  business_type: string;
  business_category: string;
  contact_person: string;
  email: string;
  phone_number: string;
  business_address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;

  // Step 2: KYC Documents (URLs / Storage Paths)
  id_doc_url: string;
  address_proof_url: string;

  // Step 3: Store Profile
  store_name: string;
  logo_url: string;
  banner_url: string;
  about_us: string;

  // Step 4: Bank Account
  bank_account_name: string;
  bank_name: string;
  bank_account_number: string;
  confirm_account_number: string;
  ifsc: string;
  account_type: string;

  // Step 5: Agreements
  agreed_terms: boolean;
  agreed_commission: boolean;
  agreed_refunds: boolean;
  agreed_accuracy: boolean;
}

const initialFormState: SellerFormData = {
  business_name: '',
  legal_name: '',
  business_type: 'Sole Proprietorship',
  business_category: 'Fashion & Apparel',
  contact_person: '',
  email: '',
  phone_number: '',
  business_address: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',

  id_doc_url: '',
  address_proof_url: '',

  store_name: '',
  logo_url: '',
  banner_url: '',
  about_us: '',

  bank_account_name: '',
  bank_name: '',
  bank_account_number: '',
  confirm_account_number: '',
  ifsc: '',
  account_type: 'Savings',

  agreed_terms: false,
  agreed_commission: false,
  agreed_refunds: false,
  agreed_accuracy: false,
};

const BUSINESS_TYPES = [
  'Individual',
  'Sole Proprietorship',
  'Partnership',
  'LLP',
  'Private Limited Company',
  'Other',
];

const BUSINESS_CATEGORIES = [
  'Fashion & Apparel',
  'Islamic Prayer & Books',
  'Halal Cosmetics & Personal Care',
  'Home & Living',
  'Accessories & Jewelry',
  'Food & Halal Grocery',
  'Other',
];

// Helper to mask bank account
const maskAccountNumber = (acc: string) => {
  if (!acc) return '';
  const clean = acc.trim();
  if (clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
};

// ==========================================
// SUB-COMPONENTS DECLARED OUTSIDE SELLERONBOARDING TO PREVENT FOCUS LOSS
// ==========================================

interface InputFieldProps {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  placeholder?: string;
  maxLength?: number;
}

const FormInputField: React.FC<InputFieldProps> = React.memo(({
  label,
  required = true,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  maxLength,
}) => {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[#1a1a1a] flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`bg-white border text-sm text-[#1a1a1a] h-11 rounded-xl focus:ring-2 focus:ring-[#A35233] ${
          error ? 'border-red-500' : 'border-[#E8D5C4]'
        }`}
      />
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
});

interface SelectFieldProps {
  label: string;
  required?: boolean;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  error?: string;
}

const FormSelectField: React.FC<SelectFieldProps> = React.memo(({
  label,
  required = true,
  value,
  options,
  onChange,
  error,
}) => {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[#1a1a1a] flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-white border text-sm text-[#1a1a1a] h-11 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-[#A35233] ${
          error ? 'border-red-500' : 'border-[#E8D5C4]'
        }`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
});

interface FileUploaderProps {
  label: string;
  required?: boolean;
  currentUrl: string;
  onUpload: (file: File) => Promise<void>;
  loading: boolean;
  error?: string;
  accept?: string;
  helperText?: string;
}

const FileUploaderCard: React.FC<FileUploaderProps> = React.memo(({
  label,
  required = true,
  currentUrl,
  onUpload,
  loading,
  error,
  accept = 'image/*,.pdf',
  helperText,
}) => {
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    await onUpload(file);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[#1a1a1a] flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        className={`bg-white border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${
          currentUrl ? 'border-green-600 bg-green-50/30' : error ? 'border-red-500' : 'border-[#D4BCA4]'
        }`}
      >
        {currentUrl ? (
          <div className="flex items-center gap-3 w-full">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-xs font-bold text-green-800 truncate">Document Uploaded</p>
              <p className="text-[11px] text-gray-500 truncate">{fileName || currentUrl}</p>
            </div>
            <label className="cursor-pointer text-xs font-semibold text-[#A35233] hover:underline flex-shrink-0">
              Replace
              <input type="file" accept={accept} onChange={handleFileChange} className="hidden" disabled={loading} />
            </label>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center gap-2 w-full py-2">
            {loading ? (
              <Loader2 className="h-6 w-6 text-[#A35233] animate-spin" />
            ) : (
              <Upload className="h-6 w-6 text-[#A35233]" />
            )}
            <span className="text-xs font-bold text-[#A35233]">
              {loading ? 'Uploading...' : 'Click to Upload File'}
            </span>
            {helperText && <span className="text-[10px] text-gray-500">{helperText}</span>}
            <input type="file" accept={accept} onChange={handleFileChange} className="hidden" disabled={loading} />
          </label>
        )}
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
});

// ==========================================
// MAIN SELLER ONBOARDING COMPONENT
// ==========================================

export const SellerOnboarding = () => {
  const { user, userRole, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [step, setStep] = useState<StepNum>(1);
  const [form, setForm] = useState<SellerFormData>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showMaskedAccount, setShowMaskedAccount] = useState<boolean>(true);

  // Load existing seller profile / state on mount for persistence
  useEffect(() => {
    let mounted = true;
    const fetchSellerState = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      try {
        const { data: prof, error } = await supabase
          .from('seller_profiles')
          .select('*')
          .eq('user_id', user.uid)
          .maybeSingle();

        if (error) console.warn('Seller profile fetch error:', error);

        if (prof && mounted) {
          // If already completed and verified/under review, check status
          if (prof.onboarding_completed && prof.status === 'UNDER_REVIEW') {
            setStep(7); // Show submitted status screen
          } else if (prof.onboarding_completed && (prof.status === 'ACTIVE' || prof.status === 'APPROVED')) {
            navigate('/seller-dashboard', { replace: true });
            return;
          } else if (prof.onboarding_step && prof.onboarding_step >= 1 && prof.onboarding_step <= 6) {
            setStep(prof.onboarding_step as StepNum);
          }

          // Populate form fields
          setForm((prev) => ({
            ...prev,
            business_name: prof.business_name || '',
            legal_name: prof.legal_name || prof.business_name || '',
            business_type: prof.business_type || 'Sole Proprietorship',
            business_category: prof.business_category || 'Fashion & Apparel',
            contact_person: prof.contact_person || '',
            email: prof.email || user.email || '',
            phone_number: prof.phone_number || '',
            business_address: prof.business_address || '',
            city: prof.city || '',
            state: prof.state || '',
            country: prof.country || '',
            postal_code: prof.postal_code || '',
            store_name: prof.seller_display_name || prof.business_name || '',
            logo_url: prof.logo_url || '',
            banner_url: prof.banner_url || '',
            about_us: prof.about_us || '',
            bank_account_name: prof.bank_account_name || '',
            bank_account_number: prof.bank_account_number || '',
            confirm_account_number: prof.bank_account_number || '',
            agreed_terms: prof.agreed_to_terms || false,
            agreed_commission: prof.agreed_to_terms || false,
            agreed_refunds: prof.agreed_to_terms || false,
            agreed_accuracy: prof.agreed_to_terms || false,
          }));
        } else if (user.email && mounted) {
          setForm((prev) => ({ ...prev, email: user.email || '' }));
        }

        // Fetch bank account if existing
        const { data: bankData } = await supabase
          .from('seller_bank_accounts')
          .select('*')
          .eq('seller_id', user.uid)
          .maybeSingle();

        if (bankData && mounted) {
          setForm((prev) => ({
            ...prev,
            bank_account_name: bankData.holder_name || prev.bank_account_name,
            bank_name: bankData.bank_name || prev.bank_name,
            bank_account_number: bankData.account_number || prev.bank_account_number,
            confirm_account_number: bankData.account_number || prev.confirm_account_number,
            ifsc: bankData.ifsc || prev.ifsc,
            account_type: bankData.account_type || prev.account_type,
          }));
        }

        // Fetch docs if existing
        const { data: docsData } = await supabase
          .from('seller_documents')
          .select('*')
          .eq('seller_id', user.uid);

        if (docsData && mounted) {
          docsData.forEach((doc: any) => {
            if (doc.document_type === 'id') setForm((p) => ({ ...p, id_doc_url: doc.doc_url }));
            if (doc.document_type === 'address') setForm((p) => ({ ...p, address_proof_url: doc.doc_url }));
          });
        }
      } catch (err) {
        console.error('Error fetching onboarding persistence:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSellerState();
    return () => {
      mounted = false;
    };
  }, [user?.uid, navigate, user?.email]);

  const updateField = (key: keyof SellerFormData, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Upload file helper
  const handleFileUpload = async (docType: string, file: File): Promise<string | null> => {
    if (!user?.uid) {
      toast.error('Authentication required');
      return null;
    }
    setUploadingDoc(docType);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.uid}/${docType}_${Date.now()}.${ext}`;
      const bucket = 'seller-documents';

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (uploadError) {
        // Fallback to product-images if seller-documents bucket is missing
        const { error: fallbackError } = await supabase.storage
          .from('product-images')
          .upload(`${user.uid}/kyc/${docType}_${Date.now()}.${ext}`, file, { upsert: true });

        if (fallbackError) {
          throw new Error(uploadError.message || fallbackError.message);
        }
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(`${user.uid}/kyc/${docType}_${Date.now()}.${ext}`);
        
        toast.success(`${docType.toUpperCase()} document uploaded!`);
        return publicUrlData.publicUrl;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      toast.success(`${docType.toUpperCase()} document uploaded!`);
      return publicUrlData.publicUrl || path;
    } catch (err: any) {
      toast.error(err.message || 'File upload failed');
      return null;
    } finally {
      setUploadingDoc(null);
    }
  };

  // Persist current state to database
  const saveProgressToDb = async (nextStep: StepNum, completed = false) => {
    if (!user?.uid) return false;
    setSaving(true);
    try {
      // 1. Ensure user role contains 'seller' or insert role
      await supabase
        .from('user_roles')
        .insert({ user_id: user.uid, role: 'seller' as any })
        .select()
        .maybeSingle();

      if (refreshRoles) await refreshRoles();

      // 2. Upsert seller_profiles
      const profilePayload = {
        user_id: user.uid,
        business_name: form.business_name || form.store_name || 'New Seller',
        legal_name: form.legal_name || form.business_name,
        business_type: form.business_type,
        business_category: form.business_category,
        contact_person: form.contact_person,
        email: form.email,
        phone_number: form.phone_number,
        business_address: form.business_address,
        city: form.city,
        state: form.state,
        country: form.country,
        postal_code: form.postal_code,
        seller_display_name: form.store_name || form.business_name,
        logo_url: form.logo_url,
        banner_url: form.banner_url,
        about_us: form.about_us,
        bank_account_name: form.bank_account_name,
        bank_account_number: form.bank_account_number,
        agreed_to_terms: form.agreed_terms,
        halal_compliant: true,
        no_prohibited_categories: true,
        understands_review: true,
        status: completed ? 'UNDER_REVIEW' : 'REGISTERED',
        onboarding_completed: completed,
        onboarding_step: nextStep,
      };

      const { error: profErr } = await supabase
        .from('seller_profiles')
        .upsert(profilePayload, { onConflict: 'user_id' });

      if (profErr) {
        console.error('Error saving profile:', profErr);
        toast.error(`Failed to save: ${profErr.message}`);
        return false;
      }

      // 3. Upsert bank account if in step 4 or beyond
      if (form.bank_account_name && form.bank_account_number) {
        await supabase
          .from('seller_bank_accounts')
          .upsert(
            {
              seller_id: user.uid,
              holder_name: form.bank_account_name,
              account_number: form.bank_account_number,
              bank_name: form.bank_name || 'Primary Bank',
              ifsc: form.ifsc || 'BARK0001',
              account_type: form.account_type || 'Savings',
              status: 'PENDING',
            },
            { onConflict: 'seller_id' }
          );
      }

      // 4. Save agreements if checked
      if (form.agreed_terms) {
        await supabase.from('seller_agreements').upsert([
          { seller_id: user.uid, agreement_type: 'SELLER_TERMS', version: '1.0' },
          { seller_id: user.uid, agreement_type: 'COMMISSION_POLICY', version: '1.0' },
          { seller_id: user.uid, agreement_type: 'REFUND_POLICY', version: '1.0' },
        ], { onConflict: 'seller_id, agreement_type' });
      }

      // 5. Save KYC entry
      if (step >= 2) {
        await supabase.from('seller_kyc').upsert(
          {
            seller_id: user.uid,
            status: completed ? 'UNDER_REVIEW' : 'PENDING',
            id_document_url: form.id_doc_url,
          },
          { onConflict: 'seller_id' }
        );
      }

      return true;
    } catch (err: any) {
      console.error('Error saving progress:', err);
      toast.error('An unexpected error occurred while saving.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // STEP VALIDATIONS
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.business_name.trim()) errs.business_name = 'Business name is required';
    if (!form.legal_name.trim()) errs.legal_name = 'Legal business name is required';
    if (!form.contact_person.trim()) errs.contact_person = 'Contact person is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.phone_number.trim()) errs.phone_number = 'Phone number is required';
    if (!form.business_address.trim()) errs.business_address = 'Business address is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.state.trim()) errs.state = 'State / Province is required';
    if (!form.postal_code.trim()) errs.postal_code = 'Postal code is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.id_doc_url) {
      errs.id_doc_url = 'Government / state-issued ID document is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.store_name.trim()) errs.store_name = 'Store name is required';
    if (!form.about_us.trim()) errs.about_us = 'Store description is required';
    if (!form.logo_url) errs.logo_url = 'Store logo is required';
    if (!form.banner_url) errs.banner_url = 'Store banner is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep4 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.bank_account_name.trim()) errs.bank_account_name = 'Account holder name is required';
    if (!form.bank_name.trim()) errs.bank_name = 'Bank name is required';
    if (!form.bank_account_number.trim()) errs.bank_account_number = 'Account number is required';
    if (!form.confirm_account_number.trim()) {
      errs.confirm_account_number = 'Confirm account number is required';
    } else if (form.bank_account_number.trim() !== form.confirm_account_number.trim()) {
      errs.confirm_account_number = 'Account numbers do not match';
    }
    if (!form.ifsc.trim()) errs.ifsc = 'IFSC / Swift code is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep5 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.agreed_terms) errs.agreed_terms = 'You must accept the Seller Terms';
    if (!form.agreed_commission) errs.agreed_commission = 'You must accept the Commission Policy';
    if (!form.agreed_refunds) errs.agreed_refunds = 'You must accept the Return & Refund Policy';
    if (!form.agreed_accuracy) errs.agreed_accuracy = 'You must confirm information accuracy';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    let valid = false;
    if (step === 1) valid = validateStep1();
    else if (step === 2) valid = validateStep2();
    else if (step === 3) valid = validateStep3();
    else if (step === 4) valid = validateStep4();
    else if (step === 5) valid = validateStep5();
    else if (step === 6) valid = true;

    if (!valid) {
      toast.error('Please fix the errors before continuing.');
      return;
    }

    const nextStep = (step + 1) as StepNum;
    const ok = await saveProgressToDb(nextStep, false);
    if (ok) {
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (step === 1) {
      navigate('/shop');
    } else if (step === 7) {
      navigate('/seller-dashboard');
    } else {
      setStep((s) => (s - 1) as StepNum);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitVerification = async () => {
    const ok = await saveProgressToDb(7, true);
    if (ok) {
      toast.success('Seller application submitted for review!');
      setStep(7);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF1DD]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#A35233] animate-spin" />
          <p className="text-sm font-semibold text-[#1a1a1a]">{t('seller.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col bg-[#FFF1DD]">
      {/* Header */}
      <div className="bg-white px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 flex items-center justify-between border-b border-[#E8D5C4] sticky top-0 z-20">
        <button
          onClick={handleBack}
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6 text-[#1a1a1a]" />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-base font-bold text-[#1a1a1a]">{t('seller.seller_onboarding')}</h1>
          <p className="text-[11px] text-[#1a1a1a]/60">
            {step === 7 ? t('seller.submitted_title') : `${t('seller.step')} ${step} ${t('seller.of')} 5 — ${
              step === 1 ? t('seller.business_info') :
              step === 2 ? t('seller.kyc_title') :
              step === 3 ? t('seller.store_profile') :
              step === 4 ? t('seller.bank_account') :
              step === 5 ? t('seller.agreements_title') : t('seller.review_title')
            }`}
          </p>
        </div>
        <div className="w-6" />
      </div>

      {/* Step Progress Bar */}
      {step >= 1 && step <= 5 && (
        <div className="bg-white px-4 py-3 border-b border-[#E8D5C4]">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#1a1a1a]/70 mb-1.5">
            <span className={step >= 1 ? 'text-[#A35233]' : ''}>{t('seller.progress_business')}</span>
            <span className={step >= 2 ? 'text-[#A35233]' : ''}>{t('seller.progress_kyc')}</span>
            <span className={step >= 3 ? 'text-[#A35233]' : ''}>{t('seller.progress_store')}</span>
            <span className={step >= 4 ? 'text-[#A35233]' : ''}>{t('seller.progress_bank')}</span>
            <span className={step >= 5 ? 'text-[#A35233]' : ''}>{t('seller.progress_review')}</span>
          </div>
          <div className="h-2 w-full bg-[#EADFC9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#A35233] transition-all duration-300 rounded-full"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-4 space-y-5 pb-24">
        {/* ==================================================== */}
        {/* STEP 1: BUSINESS INFORMATION */}
        {/* ==================================================== */}
        {step === 1 && (
          <div className="space-y-4 bg-white rounded-2xl p-4 border border-[#E8D5C4] shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF1DD] flex items-center justify-center text-[#A35233]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1a1a1a]">{t('seller.business_info')}</h2>
                <p className="text-xs text-gray-500">{t('seller.business_info_desc')}</p>
              </div>
            </div>

            <FormInputField
              label={t('seller.business_name')}
              value={form.business_name}
              onChange={(val) => updateField('business_name', val)}
              error={errors.business_name}
              placeholder="e.g. Barakah Boutique"
            />

            <FormInputField
              label={t('seller.legal_name')}
              value={form.legal_name}
              onChange={(val) => updateField('legal_name', val)}
              error={errors.legal_name}
              placeholder="Full legal registered name"
            />

            <FormSelectField
              label={t('seller.business_type')}
              value={form.business_type}
              options={BUSINESS_TYPES}
              onChange={(val) => updateField('business_type', val)}
              error={errors.business_type}
            />

            <FormSelectField
              label={t('seller.primary_category')}
              value={form.business_category}
              options={BUSINESS_CATEGORIES}
              onChange={(val) => updateField('business_category', val)}
              error={errors.business_category}
            />

            <FormInputField
              label={t('seller.owner_name')}
              value={form.contact_person}
              onChange={(val) => updateField('contact_person', val)}
              error={errors.contact_person}
              placeholder="Full name of owner"
            />

            <div className="grid grid-cols-2 gap-3">
              <FormInputField
                label={t('seller.email')}
                type="email"
                value={form.email}
                onChange={(val) => updateField('email', val)}
                error={errors.email}
                placeholder="seller@example.com"
              />
              <FormInputField
                label={t('seller.phone')}
                type="tel"
                value={form.phone_number}
                onChange={(val) => updateField('phone_number', val)}
                error={errors.phone_number}
                placeholder="+91 9876543210"
              />
            </div>

            <FormInputField
              label={t('seller.address')}
              value={form.business_address}
              onChange={(val) => updateField('business_address', val)}
              error={errors.business_address}
              placeholder="Street address, Suite / Shop No."
            />

            <div className="grid grid-cols-2 gap-3">
              <FormInputField
                label={t('seller.city')}
                value={form.city}
                onChange={(val) => updateField('city', val)}
                error={errors.city}
                placeholder="City"
              />
              <FormInputField
                label={t('seller.state')}
                value={form.state}
                onChange={(val) => updateField('state', val)}
                error={errors.state}
                placeholder="State / Province"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormInputField
                label={t('seller.country')}
                value={form.country}
                onChange={(val) => updateField('country', val)}
                error={errors.country}
                placeholder="India"
              />
              <FormInputField
                label={t('seller.postal_code')}
                value={form.postal_code}
                onChange={(val) => updateField('postal_code', val)}
                error={errors.postal_code}
                placeholder="201301"
              />
            </div>

          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 2: KYC VERIFICATION */}
        {/* ==================================================== */}
        {step === 2 && (
          <div className="space-y-4 bg-white rounded-2xl p-4 border border-[#E8D5C4] shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF1DD] flex items-center justify-center text-[#A35233]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1a1a1a]">{t('seller.kyc_title')}</h2>
                <p className="text-xs text-gray-500">{t('seller.kyc_desc')}</p>
              </div>
            </div>

            <FileUploaderCard
              label="Government / State-issued ID"
              currentUrl={form.id_doc_url}
              loading={uploadingDoc === 'id'}
              onUpload={async (file) => {
                const url = await handleFileUpload('id', file);
                if (url) updateField('id_doc_url', url);
              }}
              error={errors.id_doc_url}
              helperText="Upload a clear photo or PDF of a valid government, national, or state-issued ID"
            />

            <FileUploaderCard
              label="Address Proof"
              required={false}
              currentUrl={form.address_proof_url}
              loading={uploadingDoc === 'address'}
              onUpload={async (file) => {
                const url = await handleFileUpload('address', file);
                if (url) updateField('address_proof_url', url);
              }}
              helperText="Optional: upload a utility bill, bank statement, or official address document"
            />

            <div className="bg-[#FFF5E5] p-3 rounded-xl border border-[#E8D5C4] text-xs text-[#1a1a1a]/80 space-y-1">
              <p className="font-bold text-[#A35233]">🔒 Security & Privacy</p>
              <p>Your documents are stored securely in encrypted storage and accessible only by authorized compliance team members.</p>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 3: STORE PROFILE */}
        {/* ==================================================== */}
        {step === 3 && (
          <div className="space-y-4 bg-white rounded-2xl p-4 border border-[#E8D5C4] shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF1DD] flex items-center justify-center text-[#A35233]">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1a1a1a]">{t('seller.store_profile')}</h2>
                <p className="text-xs text-gray-500">{t('seller.store_profile_desc')}</p>
              </div>
            </div>

            <FormInputField
              label={t('seller.store_display_name')}
              value={form.store_name}
              onChange={(val) => updateField('store_name', val)}
              error={errors.store_name}
              placeholder="e.g. Al-Noor Halal Collections"
            />

            <FileUploaderCard
              label={t('seller.store_logo')}
              currentUrl={form.logo_url}
              loading={uploadingDoc === 'logo'}
              onUpload={async (file) => {
                const url = await handleFileUpload('logo', file);
                if (url) updateField('logo_url', url);
              }}
              error={errors.logo_url}
              accept="image/*"
              helperText="Square image (500x500px recommended)"
            />

            {form.logo_url && (
              <div className="flex items-center gap-3 p-2 bg-[#FFF1DD] rounded-xl">
                <img src={form.logo_url} alt="Logo preview" className="w-12 h-12 rounded-full object-cover border border-[#A35233]" />
                <span className="text-xs font-semibold text-[#1a1a1a]">{t('seller.logo_preview')}</span>
              </div>
            )}

            <FileUploaderCard
              label={t('seller.store_banner')}
              currentUrl={form.banner_url}
              loading={uploadingDoc === 'banner'}
              onUpload={async (file) => {
                const url = await handleFileUpload('banner', file);
                if (url) updateField('banner_url', url);
              }}
              error={errors.banner_url}
              accept="image/*"
              helperText="Landscape image (1200x400px recommended)"
            />

            {form.banner_url && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#1a1a1a]">{t('seller.banner_preview')}</p>
                <img src={form.banner_url} alt="Banner preview" className="w-full h-24 rounded-xl object-cover border border-[#E8D5C4]" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1a1a1a] flex items-center gap-1">
                {t('seller.store_bio')} <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={form.about_us}
                onChange={(e) => updateField('about_us', e.target.value)}
                placeholder="Describe your brand, heritage, and values..."
                className={`bg-white border text-sm text-[#1a1a1a] rounded-xl p-3 min-h-[90px] focus:ring-2 focus:ring-[#A35233] ${
                  errors.about_us ? 'border-red-500' : 'border-[#E8D5C4]'
                }`}
              />
              {errors.about_us && <p className="text-xs text-red-500 font-medium">{errors.about_us}</p>}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 4: BANK / PAYOUT ACCOUNT */}
        {/* ==================================================== */}
        {step === 4 && (
          <div className="space-y-4 bg-white rounded-2xl p-4 border border-[#E8D5C4] shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF1DD] flex items-center justify-center text-[#A35233]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1a1a1a]">{t('seller.bank_account')}</h2>
                <p className="text-xs text-gray-500">{t('seller.bank_account_desc')}</p>
              </div>
            </div>

            <FormInputField
              label={t('seller.account_holder')}
              value={form.bank_account_name}
              onChange={(val) => updateField('bank_account_name', val)}
              error={errors.bank_account_name}
              placeholder="Name as printed on bank statement"
            />

            <FormInputField
              label={t('seller.bank_name')}
              value={form.bank_name}
              onChange={(val) => updateField('bank_name', val)}
              error={errors.bank_name}
              placeholder="e.g. HDFC Bank / State Bank of India"
            />

            <div className="relative">
              <FormInputField
                label={t('seller.account_number')}
                type={showMaskedAccount ? 'password' : 'text'}
                value={form.bank_account_number}
                onChange={(val) => updateField('bank_account_number', val)}
                error={errors.bank_account_number}
                placeholder="Enter bank account number"
              />
              <button
                type="button"
                onClick={() => setShowMaskedAccount(!showMaskedAccount)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showMaskedAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <FormInputField
              label={t('seller.confirm_account')}
              type="text"
              value={form.confirm_account_number}
              onChange={(val) => updateField('confirm_account_number', val)}
              error={errors.confirm_account_number}
              placeholder="Re-enter bank account number"
            />

            <div className="grid grid-cols-2 gap-3">
              <FormInputField
                label={t('seller.ifsc')}
                value={form.ifsc}
                onChange={(val) => updateField('ifsc', val.toUpperCase())}
                error={errors.ifsc}
                placeholder="HDFC0001234"
              />

              <FormSelectField
                label={t('seller.account_type')}
                value={form.account_type}
                options={[t('seller.cat_savings'), t('seller.cat_current')]}
                onChange={(val) => updateField('account_type', val)}
              />
            </div>

            {form.bank_account_number && (
              <div className="bg-[#FFF5E5] p-3 rounded-xl border border-[#E8D5C4] text-xs flex items-center justify-between">
                <span className="font-semibold text-[#1a1a1a]/70">{t('seller.masked_display')}:</span>
                <span className="font-mono font-bold text-[#A35233]">
                  {maskAccountNumber(form.bank_account_number)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 5: SELLER AGREEMENTS */}
        {/* ==================================================== */}
        {step === 5 && (
          <div className="space-y-4 bg-white rounded-2xl p-4 border border-[#E8D5C4] shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF1DD] flex items-center justify-center text-[#A35233]">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1a1a1a]">Seller Agreements</h2>
                <p className="text-xs text-gray-500">Review and accept marketplace terms & policies</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#E8D5C4] hover:bg-[#FFF1DD]/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreed_terms}
                  onChange={(e) => updateField('agreed_terms', e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#A35233]"
                />
                <span className="text-xs font-semibold text-[#1a1a1a]">
                  I agree to the Barakah Seller Terms & Conditions <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.agreed_terms && <p className="text-xs text-red-500 pl-7">{errors.agreed_terms}</p>}

              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#E8D5C4] hover:bg-[#FFF1DD]/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreed_commission}
                  onChange={(e) => updateField('agreed_commission', e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#A35233]"
                />
                <span className="text-xs font-semibold text-[#1a1a1a]">
                  I agree to the Barakah Marketplace Commission Policy (12% commission per sale) <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.agreed_commission && <p className="text-xs text-red-500 pl-7">{errors.agreed_commission}</p>}

              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#E8D5C4] hover:bg-[#FFF1DD]/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreed_refunds}
                  onChange={(e) => updateField('agreed_refunds', e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#A35233]"
                />
                <span className="text-xs font-semibold text-[#1a1a1a]">
                  I agree to the Return & Refund Policy for Marketplace Sellers <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.agreed_refunds && <p className="text-xs text-red-500 pl-7">{errors.agreed_refunds}</p>}

              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#E8D5C4] hover:bg-[#FFF1DD]/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreed_accuracy}
                  onChange={(e) => updateField('agreed_accuracy', e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#A35233]"
                />
                <span className="text-xs font-semibold text-[#1a1a1a]">
                  I confirm that all information and documents provided are accurate and authentic <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.agreed_accuracy && <p className="text-xs text-red-500 pl-7">{errors.agreed_accuracy}</p>}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 6: REVIEW & SUBMIT */}
        {/* ==================================================== */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] shadow-sm space-y-3">
              <h2 className="text-base font-bold text-[#1a1a1a]">Review Your Application</h2>
              <p className="text-xs text-gray-500">Please review all submitted details before final submission.</p>
            </div>

            {/* Business Card */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A35233] flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-green-600" /> Business Information
                </span>
                <button onClick={() => setStep(1)} className="text-xs font-semibold text-[#A35233] underline flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="text-xs space-y-1 text-gray-700">
                <p><strong>Name:</strong> {form.business_name} ({form.legal_name})</p>
                <p><strong>Type:</strong> {form.business_type} | <strong>Category:</strong> {form.business_category}</p>
                <p><strong>Contact:</strong> {form.contact_person} ({form.email}, {form.phone_number})</p>
                <p><strong>Address:</strong> {form.business_address}, {form.city}, {form.state}, {form.country} - {form.postal_code}</p>
                <p><strong>ID Document:</strong> Uploaded</p>
              </div>
            </div>

            {/* KYC Card */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A35233] flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-green-600" /> KYC Verification Documents
                </span>
                <button onClick={() => setStep(2)} className="text-xs font-semibold text-[#A35233] underline flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
              </div>
              <p className="text-xs text-gray-700">
                Documents uploaded successfully for verification.
              </p>
            </div>

            {/* Store Profile Card */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A35233] flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-green-600" /> Store Profile
                </span>
                <button onClick={() => setStep(3)} className="text-xs font-semibold text-[#A35233] underline flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="flex items-center gap-3">
                {form.logo_url && <img src={form.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />}
                <div>
                  <p className="text-xs font-bold text-[#1a1a1a]">{form.store_name}</p>
                  <p className="text-[11px] text-gray-500 line-clamp-1">{form.about_us}</p>
                </div>
              </div>
            </div>

            {/* Bank Card */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A35233] flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-green-600" /> Payout Account
                </span>
                <button onClick={() => setStep(4)} className="text-xs font-semibold text-[#A35233] underline flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
              </div>
              <p className="text-xs text-gray-700">
                <strong>{form.bank_account_name}</strong> — {form.bank_name} ({maskAccountNumber(form.bank_account_number)})
              </p>
            </div>

            {/* Agreements Card */}
            <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A35233] flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-green-600" /> {t('seller.agreements_accepted')}
                </span>
                <button onClick={() => setStep(5)} className="text-xs font-semibold text-[#A35233] underline flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
              </div>
              <p className="text-xs text-gray-700">
                {t('seller.agreements_review_desc')}
              </p>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 7: SUBMITTED / UNDER REVIEW STATUS */}
        {/* ==================================================== */}
        {step === 7 && (
          <div className="bg-white rounded-2xl p-6 border border-[#E8D5C4] shadow-sm text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-[#A35233]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#1a1a1a]">{t('seller.submitted_title')}</h2>
              <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
                {t('seller.submitted_desc')}
              </p>
            </div>

            <div className="bg-[#FFF1DD] p-3 rounded-xl border border-[#E8D5C4] text-xs text-[#1a1a1a]/80 flex items-center justify-between">
              <span className="font-medium">{t('seller.verification_status')}:</span>
              <span className="font-bold px-2.5 py-1 rounded-full bg-amber-200 text-amber-900">
                {t('seller.under_review_badge')}
              </span>
            </div>

            <Button
              onClick={() => navigate('/seller-dashboard')}
              className="w-full h-12 bg-[#A35233] hover:bg-[#8B4226] text-white font-bold rounded-xl text-sm"
            >
              {t('seller.go_to_dashboard')}
            </Button>
          </div>
        )}
      </div>

      {/* Fixed Bottom Action Bar */}
      {step >= 1 && step <= 6 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-[#E8D5C4] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] px-3 pt-3 flex items-center gap-3 z-30 shadow-lg">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={saving}
              className="flex-1 h-12 border-[#E8D5C4] text-[#1a1a1a] font-semibold rounded-xl"
            >
              {t('seller.back')}
            </Button>
          )}

          {step < 6 ? (
            <Button
              onClick={handleNext}
              disabled={saving}
              className="flex-1 h-12 bg-[#A35233] hover:bg-[#8B4226] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('seller.next')}
              {!saving && <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <Button
              onClick={handleSubmitVerification}
              disabled={saving}
              className="w-full h-12 bg-[#A35233] hover:bg-[#8B4226] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('seller.submit_verification')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerOnboarding;
