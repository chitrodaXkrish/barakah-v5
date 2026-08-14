import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from './LoadingScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';

export const SellerOnboardingMinimal: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) return <LoadingScreen />;
  if (!user) return null;

  // Minimal Business Information view to unblock Phase 1 focus
  return (
    <div className="min-h-screen bg-[#FFF1DD] p-4">
      <div className="bg-white rounded-lg p-4" style={{ border: '1px solid #EADFC9' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Become a Seller</h2>
          <span className="text-sm text-[#6B3E1D]">Step 1 of 5: Business Information</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <Input placeholder="Store name" />
          <Input placeholder="Legal business name" />
          <Input placeholder="Owner name" />
          <Input placeholder="Email" type="email" />
          <Input placeholder="Phone" />
          <Input placeholder="Address" />
          <Input placeholder="PAN" />
          <Input placeholder="GSTIN (optional)" />
        </div>
        <div className="mt-4 flex justify-end">
          <Button className="px-6 py-2">Next</Button>
        </div>
      </div>
    </div>
  );
};

export default SellerOnboardingMinimal;
