import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldAlert } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const CREAM = '#FFF1DD';
const CARD = '#FFF8F3';
const BORDER = '#E8D5C4';
const BROWN = '#A35233';
const BROWN_DARK = '#3A1E12';
const MUTED = '#7C6A4F';
const SOFT_ACCENT = '#FDE8E3';
const DANGER = '#D63A1F';

const deletionEmail = 'info@barakah.services';

export const DeleteAccount = () => {
  const navigate = useNavigate();

  const openDeletionEmail = () => {
    const subject = encodeURIComponent('Account Deletion Request');
    const body = encodeURIComponent(
      'Hello Barakah Support,\n\nI would like to request deletion of my Barakah account.\n\nRegistered email address:\nFull name (optional):\n\nThank you.',
    );
    window.location.href = `mailto:${deletionEmail}?subject=${subject}&body=${body}`;
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
          <h1 className="text-2xl font-bold" style={{ color: BROWN_DARK }}>Delete Account</h1>
        </div>

        <Card className="p-5 rounded-2xl shadow-sm space-y-5" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-full shrink-0" style={{ backgroundColor: SOFT_ACCENT }}>
              <ShieldAlert className="h-6 w-6" style={{ color: DANGER }} />
            </div>
            <div>
              <h2 className="font-semibold text-lg" style={{ color: BROWN_DARK }}>Request account deletion</h2>
              <p className="text-sm mt-1" style={{ color: MUTED }}>
                We are sorry to see you go. To protect your account and personal information, account deletion requests are handled by our support team.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm" style={{ color: BROWN_DARK }}>
            <p>
              Please email <a className="font-semibold underline" href={`mailto:${deletionEmail}`}>{deletionEmail}</a> from the email address registered to your Barakah account. Use the subject line <strong>“Account Deletion Request”</strong> and include your registered email address in the message.
            </p>
            <p>
              For your security, our team may ask you to verify your identity before processing the request. Please do not send your password, one-time passcodes, card details, or other sensitive information by email.
            </p>
            <p>
              Once confirmed, deletion may permanently remove access to your account, profile information, saved preferences, and other account-related data. Any open orders, refunds, payments, or seller obligations may need to be completed before the request can be finalized. We may retain limited information where required by law or for legitimate business purposes, as described in our Privacy Policy.
            </p>
            <p>
              We will acknowledge your request and contact you if any additional information is needed.
            </p>
          </div>

          <Button type="button" onClick={openDeletionEmail} className="w-full rounded-full gap-2" style={{ backgroundColor: BROWN }}>
            <Mail className="h-4 w-4" />
            Email deletion request
          </Button>
        </Card>
      </div>
    </Layout>
  );
};
