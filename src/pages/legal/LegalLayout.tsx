import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LegalLayoutProps {
  title: string;
  children: ReactNode;
}

export const LegalLayout = ({ title, children }: LegalLayoutProps) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#FFF1DD]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="sticky top-0 z-20 flex items-center gap-3 px-5 py-4 bg-[#FFF1DD] border-b border-[#EADFC9]">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label="Back"
          className="w-10 h-10 rounded-full flex items-center justify-center border border-[#2C1309]/20 text-[#2C1309]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-[#2C1309]">{title}</h1>
      </header>
      <div className="px-5 py-6 pb-24 text-[#2C1309] text-[15px] leading-relaxed space-y-4 legal-content">
        {children}
      </div>
    </div>
  );
};
