import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

const BROWN = '#78351A';
const ACCENT = '#CE5728';

export const FeedbackForm = ({ open, onClose }: Props) => {
  const { user } = useAuth();
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
      toast({ title: 'Please rate Barakah overall', variant: 'destructive' });
      return;
    }
    if (form.user_email && !/^\S+@\S+\.\S+$/.test(form.user_email)) {
      toast({ title: 'Please enter a valid email', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('app_feedback').insert({
      ...form,
      user_id: user?.uid ?? null,
      ease_of_use: form.ease_of_use || null,
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not submit', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'JazakAllah khair!', description: 'Thanks for your feedback.' });
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
          <h2 className="text-[17px] font-bold" style={{ color: BROWN }}>Share your feedback</h2>
          <button onClick={onClose} aria-label="Close" className="p-1"><X className="h-5 w-5" style={{ color: BROWN }} /></button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <Field label="Enter your E-mail to get access to perks!">
            <input
              type="email"
              value={form.user_email}
              onChange={(e) => set('user_email', e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border px-3 py-2.5 text-[14px] bg-white outline-none focus:border-[#CE5728]"
              style={{ borderColor: '#E8D5C4', color: '#2C1309' }}
            />
          </Field>

          <Field label="Overall, how would you rate Barakah?" required>
            <Stars value={form.overall_rating} onChange={(v) => set('overall_rating', v)} />
          </Field>

          <Field label="How easy is the app to use?">
            <Stars value={form.ease_of_use} onChange={(v) => set('ease_of_use', v)} />
          </Field>

          <TextField label="Which feature do you use the most?" placeholder="e.g., Prayer Times, Quran, Qibla…"
            value={form.most_used_feature} onChange={(v) => set('most_used_feature', v)} />

          <TextField label="What do you mainly use Barakah for?" placeholder="e.g., Prayer Times, Quran, Qibla…"
            value={form.main_use} onChange={(v) => set('main_use', v)} />

          <TextField label="What is the one thing you would improve about Barakah?"
            value={form.one_improvement} onChange={(v) => set('one_improvement', v)} multiline />

          <TextField label="Was anything confusing when you first opened the app?"
            value={form.first_open_confusion} onChange={(v) => set('first_open_confusion', v)} multiline />

          <Field label="Are notifications arriving at the correct time?">
            <Radio
              value={form.notifications_timing}
              onChange={(v) => set('notifications_timing', v)}
              options={[
                { v: 'yes', l: 'Yes' },
                { v: 'a_bit_late', l: 'A bit late' },
                { v: 'no', l: 'No' },
                { v: 'not_tested', l: 'Not tested' },
              ]}
            />
          </Field>

          <TextField label="Which state and country are you from?" placeholder="e.g., Maharashtra, India"
            value={form.state_country} onChange={(v) => set('state_country', v)} />

          <TextField label="What features would you like us to add?"
            value={form.missing_features} onChange={(v) => set('missing_features', v)} multiline />

          <TextField label="Have you encountered any bugs or issues?"
            value={form.bugs_encountered} onChange={(v) => set('bugs_encountered', v)} multiline />

          <Field label="Would you recommend Barakah to friends or family?">
            <Radio
              value={form.would_recommend}
              onChange={(v) => set('would_recommend', v)}
              options={[
                { v: 'yes', l: 'Yes' },
                { v: 'maybe', l: 'Maybe' },
                { v: 'no', l: 'No' },
              ]}
            />
          </Field>

          <TextField label="Anything else you'd like to share?"
            value={form.additional_comments} onChange={(v) => set('additional_comments', v)} multiline />

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-xl py-3 text-white text-[15px] font-semibold disabled:opacity-60"
            style={{ background: `linear-gradient(90deg, ${BROWN}, ${ACCENT})` }}
          >
            {submitting ? 'Submitting…' : 'Submit feedback'}
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