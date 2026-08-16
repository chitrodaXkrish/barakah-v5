import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

const BROWN = '#78351A';
const ACCENT = '#CE5728';

export const FeedbackForm = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    user_email: '',
    overall_rating: 0,
    ease_of_use: 0,
    most_used_feature: '',
    main_use: '',
    one_improvement: '',
    first_open_confusion: '',
    notifications_timing: '',
    state_country: '',
    missing_features: '',
    bugs_encountered: '',
    would_recommend: '',
    additional_comments: '',
  });

  if (!open) return null;

  const set = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.overall_rating) {
      toast({ title: t('feedback.toast_rate'), variant: 'destructive' });
      return;
    }
    if (form.user_email && !/^\S+@\S+\.\S+$/.test(form.user_email)) {
      toast({ title: t('feedback.toast_email'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('app_feedback').insert({
      ...form,
      user_id: user?.uid ?? null,
      ease_of_use: form.ease_of_use || null,
    } as any);
    setSubmitting(true);
    if (error) {
      toast({ title: t('feedback.toast_fail'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('feedback.toast_success'), description: t('feedback.toast_success_desc') });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: '#FFF5E5' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b" style={{ background: '#FFF5E5', borderColor: '#E8D5C4' }}>
          <h2 className="text-[17px] font-bold" style={{ color: BROWN }}>{t('feedback.title')}</h2>
          <button onClick={onClose} aria-label={t('login.back')} className="p-1"><X className="h-5 w-5" style={{ color: BROWN }} /></button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <Field label={t('feedback.email_label')}>
            <input
              type="email"
              value={form.user_email}
              onChange={(e) => set('user_email', e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border px-3 py-2.5 text-[14px] bg-white outline-none focus:border-[#CE5728]"
              style={{ borderColor: '#E8D5C4', color: '#2C1309' }}
            />
          </Field>

          <Field label={t('feedback.rate_overall')} required>
            <Stars value={form.overall_rating} onChange={(v) => set('overall_rating', v)} />
          </Field>

          <Field label={t('feedback.ease_of_use')}>
            <Stars value={form.ease_of_use} onChange={(v) => set('ease_of_use', v)} />
          </Field>

          <TextField label={t('feedback.most_used')} placeholder={t('feedback.placeholder_features')}
            value={form.most_used_feature} onChange={(v) => set('most_used_feature', v)} />

          <TextField label={t('feedback.main_use')} placeholder={t('feedback.placeholder_features')}
            value={form.main_use} onChange={(v) => set('main_use', v)} />

          <TextField label={t('feedback.one_improvement')}
            value={form.one_improvement} onChange={(v) => set('one_improvement', v)} multiline />

          <TextField label={t('feedback.first_confusion')}
            value={form.first_open_confusion} onChange={(v) => set('first_open_confusion', v)} multiline />

          <Field label={t('feedback.notifications_timing')}>
            <Radio
              value={form.notifications_timing}
              onChange={(v) => set('notifications_timing', v)}
              options={[
                { v: 'yes', l: t('feedback.opt_yes') },
                { v: 'a_bit_late', l: t('feedback.opt_late') },
                { v: 'no', l: t('feedback.opt_no') },
                { v: 'not_tested', l: t('feedback.opt_not_tested') },
              ]}
            />
          </Field>

          <TextField label={t('feedback.location')} placeholder={t('feedback.placeholder_location')}
            value={form.state_country} onChange={(v) => set('state_country', v)} />

          <TextField label={t('feedback.missing_features')}
            value={form.missing_features} onChange={(v) => set('missing_features', v)} multiline />

          <TextField label={t('feedback.bugs')}
            value={form.bugs_encountered} onChange={(v) => set('bugs_encountered', v)} multiline />

          <Field label={t('feedback.recommend')}>
            <Radio
              value={form.would_recommend}
              onChange={(v) => set('would_recommend', v)}
              options={[
                { v: 'yes', l: t('feedback.opt_yes') },
                { v: 'maybe', l: t('feedback.opt_maybe') },
                { v: 'no', l: t('feedback.opt_no') },
              ]}
            />
          </Field>

          <TextField label={t('feedback.additional')}
            value={form.additional_comments} onChange={(v) => set('additional_comments', v)} multiline />

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-xl py-3 text-white text-[15px] font-semibold disabled:opacity-60"
            style={{ background: `linear-gradient(90deg, ${BROWN}, ${ACCENT})` }}
          >
            {submitting ? t('feedback.submitting') : t('feedback.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label className="block text-[13px] font-semibold mb-2" style={{ color: '#2C1309' }}>
      {label}{required && <span style={{ color: ACCENT }}> *</span>}
    </label>
    {children}
  </div>
);

const TextField = ({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) => (
  <Field label={label}>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-xl border px-3 py-2.5 text-[14px] bg-white outline-none focus:border-[#CE5728] resize-none"
        style={{ borderColor: '#E8D5C4', color: '#2C1309' }}
      />
    ) : (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2.5 text-[14px] bg-white outline-none focus:border-[#CE5728]"
        style={{ borderColor: '#E8D5C4', color: '#2C1309' }}
      />
    )}
  </Field>
);

const Stars = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-2">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star`}>
        <Star
          className="h-8 w-8 transition-transform active:scale-90"
          style={{ color: n <= value ? ACCENT : '#E8D5C4' }}
          fill={n <= value ? ACCENT : 'none'}
        />
      </button>
    ))}
  </div>
);

const Radio = ({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { v: string; l: string }[];
}) => (
  <div className="grid grid-cols-2 gap-2">
    {options.map((o) => {
      const active = value === o.v;
      return (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className="rounded-xl border px-3 py-2.5 text-[13px] font-medium text-left transition"
          style={{
            borderColor: active ? ACCENT : '#E8D5C4',
            background: active ? 'rgba(206,87,40,0.08)' : 'white',
            color: active ? ACCENT : '#2C1309',
          }}
        >
          {o.l}
        </button>
      );
    })}
  </div>
);