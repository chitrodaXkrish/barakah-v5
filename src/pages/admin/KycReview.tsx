import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type KycRow = {
  id?: string;
  seller_id: string;
  status: string;
  submitted_at?: string;
  rejection_reason?: string | null;
  additional_info_reason?: string | null;
};

export const KycReview: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRows();
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('seller_kyc').select('id, seller_id, status, submitted_at, rejection_reason, additional_info_reason').order('submitted_at', { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  const takeAction = async (row: KycRow, action: 'approve' | 'reject' | 'require_info') => {
    const reason = action === 'approve' ? null : prompt('Please provide a reason for this action:') ?? '';
    const updates: any = { status: action === 'approve' ? 'VERIFIED' : action === 'reject' ? 'REJECTED' : 'ADDITIONAL_INFO_REQUIRED' };
    if (reason && action !== 'approve') updates.rejection_reason = reason;
    if (reason && action === 'require_info') updates.additional_info_reason = reason;
    const { error } = await supabase.from('seller_kyc').update(updates).eq('id', row.id);
    if (error) {
      alert('Failed to update KYC: ' + error.message);
    } else {
      fetchRows();
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Seller KYC Review</h2>
        <button onClick={() => navigate('/')}>Home</button>
      </div>
      <div className="border rounded-md p-4 bg-white">
        {loading && <div>Loading...</div>}
        {!loading && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Seller ID</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Submitted</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2 pr-4">{r.seller_id}</td>
                  <td className="py-2 pr-4">{r.status}</td>
                  <td className="py-2 pr-4">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ''}</td>
                  <td className="py-2 pr-4">{r.rejection_reason || r.additional_info_reason || '-'}</td>
                  <td className="py-2">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => takeAction(r, 'approve')}>Approve</Button>
                      <Button variant="outline" size="sm" onClick={() => takeAction(r, 'reject')}>Reject</Button>
                      <Button variant="outline" size="sm" onClick={() => takeAction(r, 'require_info')}>Request Info</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center">No KYC records found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default KycReview;
