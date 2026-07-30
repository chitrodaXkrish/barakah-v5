import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

const CREAM = '#FFF1DD';
const CARD = '#FFF8F3';
const BORDER = '#E8D5C4';
const BROWN = '#A35233';
const BROWN_DARK = '#3A1E12';
const MUTED = '#7C6A4F';
const SOFT_ACCENT = '#F5E6D0';

export const ChangePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      toast.error(error.message || 'Could not change password');
      return;
    }

    toast.success('Password changed successfully');
    navigate('/account');
  };

  return (
    <Layout pageBackgroundColor={CREAM}>
      <div className="min-h-screen px-4 py-6 space-y-6" style={{ backgroundColor: CREAM }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ border: `1px solid ${BORDER}`, color: BROWN_DARK, backgroundColor: CARD }}
            aria-label="Back to account"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: BROWN_DARK }}>
            Change Password
          </h1>
        </div>

        <Card className="p-5 rounded-2xl shadow-sm" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-full" style={{ backgroundColor: SOFT_ACCENT }}>
              <Lock className="h-6 w-6" style={{ color: BROWN }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: BROWN_DARK }}>
                Secure your account
              </p>
              <p className="text-sm" style={{ color: MUTED }}>
                Use a new password with at least 6 characters.
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-semibold" style={{ color: BROWN_DARK }} htmlFor="new-password">
                New password
              </label>
              <div className="relative mt-2">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="pr-11"
                  style={{ backgroundColor: '#FFFFFF', borderColor: BORDER }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center"
                  style={{ color: MUTED }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold" style={{ color: BROWN_DARK }} htmlFor="confirm-password">
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="mt-2"
                style={{ backgroundColor: '#FFFFFF', borderColor: BORDER }}
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-full gap-2"
              style={{ backgroundColor: BROWN }}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Password'}
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
};
