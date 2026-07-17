import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ArrowLeft, CheckCircle2, XCircle, TrendingUp, Wallet, Gem, Briefcase, Landmark, BarChart3, ArrowRight, RotateCcw } from 'lucide-react';

const CREAM = '#FFF5E5';
const CARD_CREAM = '#FFF8F0';
const BROWN_DARK = '#2C1309';
const BROWN = '#A35233';
const BROWN_DEEP = '#78351A';
const ORANGE = '#CE5728';

const fmt = (n: number, symbol: string) =>
  `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ResultState {
  cash: string;
  goldValue: number;
  silver: string;
  business: string;
  moneyOwed: string;
  investments: string;
  total: number;
  zakatable: number;
  zakatPayable: number;
  nisab: number;
  symbol: string;
  currency: string;
  goldMode: string;
  goldRaw: string;
  goldPricePerGram: number;
}

const StatCard = ({ label, value, icon, color, bg }: { label: string; value: string; icon: React.ReactNode; color: string; bg: string }) => (
  <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: bg }}>
    <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-semibold tracking-wider opacity-70" style={{ color: BROWN_DARK }}>{label}</p>
      <p className="text-lg font-bold italic" style={{ color: BROWN_DARK, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{value}</p>
    </div>
  </div>
);

const BreakdownRow = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: `${BROWN_DARK}15` }}>
    <div className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: CARD_CREAM }}>
        {icon}
      </div>
      <span className="text-sm font-semibold" style={{ color: BROWN_DARK }}>{label}</span>
    </div>
    <span className="text-sm font-bold" style={{ color: BROWN_DARK }}>{value}</span>
  </div>
);

export const ZakatResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const data = (location.state as ResultState | null);

  const symbol = data?.symbol || '£';
  const currency = data?.currency || 'GBP';
  const nisab = data?.nisab || 3842.15;
  const total = data?.total || 0;
  const zakatable = data?.zakatable || 0;
  const zakatPayable = data?.zakatPayable || 0;
  const cash = parseFloat(data?.cash || '0');
  const goldValue = data?.goldValue || 0;
  const silver = parseFloat(data?.silver || '0');
  const business = parseFloat(data?.business || '0');
  const moneyOwed = parseFloat(data?.moneyOwed || '0');
  const investments = parseFloat(data?.investments || '0');

  const isNisabMet = total >= nisab;
  const percentageOfNisab = useMemo(() => ((total / nisab) * 100).toFixed(1), [total, nisab]);

  const breakdown = [
    { label: 'Cash & Savings', value: fmt(cash, symbol), icon: <Wallet className="h-4 w-4" style={{ color: BROWN_DEEP }} /> },
    { label: 'Gold Value', value: fmt(goldValue, symbol), icon: <Gem className="h-4 w-4" style={{ color: BROWN_DEEP }} /> },
    { label: 'Silver Value', value: fmt(silver, symbol), icon: <Gem className="h-4 w-4" style={{ color: BROWN_DEEP }} /> },
    { label: 'Business Assets', value: fmt(business, symbol), icon: <Briefcase className="h-4 w-4" style={{ color: BROWN_DEEP }} /> },
    { label: 'Money Owed to You', value: fmt(moneyOwed, symbol), icon: <Landmark className="h-4 w-4" style={{ color: BROWN_DEEP }} /> },
    { label: 'Investments & Stocks', value: fmt(investments, symbol), icon: <BarChart3 className="h-4 w-4" style={{ color: BROWN_DEEP }} /> },
  ];

  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between" style={{ backgroundColor: CREAM }}>
          <button
            onClick={() => navigate('/zakat')}
            className="h-9 w-9 flex items-center justify-center"
            style={{ color: BROWN_DARK }}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-serif italic text-xl font-bold" style={{ color: BROWN_DARK, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Zakat Result
          </h1>
          <div className="w-9" />
        </div>

        <div className="flex-1 px-5 pb-40 overflow-y-auto">
          {/* Status Banner */}
          <div
            className="rounded-[28px] p-6 text-center relative overflow-hidden"
            style={{
              background: isNisabMet
                ? `linear-gradient(160deg, ${BROWN_DEEP} 0%, ${ORANGE} 100%)`
                : `linear-gradient(160deg, #5a3a2a 0%, #8a6a5a 100%)`,
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              {isNisabMet ? (
                <CheckCircle2 className="h-5 w-5 text-white/90" />
              ) : (
                <XCircle className="h-5 w-5 text-white/90" />
              )}
              <span className="text-white/90 text-sm font-semibold tracking-wider">
                {isNisabMet ? 'NISAB THRESHOLD MET' : 'BELOW NISAB THRESHOLD'}
              </span>
            </div>
            <p className="mt-2 text-white text-5xl font-bold italic" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {fmt(zakatPayable, symbol)}
            </p>
            <p className="mt-2 text-white/80 text-sm">
              {isNisabMet ? 'Zakat payable (2.5% of zakatable wealth)' : 'No zakat due this year'}
            </p>
          </div>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <StatCard
              label="TOTAL WEALTH"
              value={fmt(total, symbol)}
              icon={<TrendingUp className="h-5 w-5 text-white" />}
              color={BROWN_DEEP}
              bg={CARD_CREAM}
            />
            <StatCard
              label="ZAKATABLE"
              value={fmt(zakatable, symbol)}
              icon={<Wallet className="h-5 w-5 text-white" />}
              color={ORANGE}
              bg={CARD_CREAM}
            />
            <StatCard
              label="NISAB VALUE"
              value={fmt(nisab, symbol)}
              icon={<CheckCircle2 className="h-5 w-5 text-white" />}
              color={isNisabMet ? '#2B5E2B' : '#8a4a3a'}
              bg={CARD_CREAM}
            />
            <StatCard
              label="% OF NISAB"
              value={`${percentageOfNisab}%`}
              icon={<BarChart3 className="h-5 w-5 text-white" />}
              color={BROWN}
              bg={CARD_CREAM}
            />
          </div>

          {/* Breakdown Card */}
          <div className="mt-5 rounded-[24px] p-5" style={{ backgroundColor: '#FFF5E5' }}>
            <h3 className="text-sm font-bold tracking-wider mb-3" style={{ color: BROWN_DARK }}>
              WEALTH BREAKDOWN
            </h3>
            {breakdown.map((item) => (
              <BreakdownRow key={item.label} {...item} />
            ))}
            <div className="flex items-center justify-between pt-4 mt-1">
              <span className="text-sm font-bold" style={{ color: BROWN_DARK }}>Total Wealth</span>
              <span className="text-lg font-bold italic" style={{ color: BROWN_DEEP, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {fmt(total, symbol)}
              </span>
            </div>
          </div>

          {/* Educational Note */}
          <div className="mt-5 rounded-[24px] p-5" style={{ backgroundColor: '#F5E6D0' }}>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#A35233' }}>
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold mb-1" style={{ color: '#5C2A14' }}>Understanding Your Zakat</p>
                <p className="text-sm leading-relaxed" style={{ color: '#5C2A14', opacity: 0.9 }}>
                  {isNisabMet
                    ? `Your total wealth of ${fmt(total, symbol)} exceeds the Nisab threshold of ${fmt(nisab, symbol)}. You are required to pay 2.5% of your zakatable wealth (${fmt(zakatable, symbol)}) as Zakat, which equals ${fmt(zakatPayable, symbol)}.`
                    : `Your total wealth of ${fmt(total, symbol)} is below the Nisab threshold of ${fmt(nisab, symbol)}. You are not required to pay Zakat this year. Consider revisiting when your wealth grows.`}
                </p>
              </div>
            </div>
          </div>

          {/* Calculation Formula */}
          <div className="mt-5 rounded-[24px] p-5" style={{ backgroundColor: CARD_CREAM }}>
            <h3 className="text-sm font-bold tracking-wider mb-3" style={{ color: BROWN_DARK }}>
              CALCULATION
            </h3>
            <div className="space-y-2 text-sm" style={{ color: BROWN_DARK }}>
              <div className="flex justify-between">
                <span>Zakatable Wealth</span>
                <span className="font-bold">{fmt(zakatable, symbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>Zakat Rate</span>
                <span className="font-bold">2.5%</span>
              </div>
              <div className="pt-2 border-t flex justify-between" style={{ borderColor: `${BROWN_DARK}20` }}>
                <span className="font-bold">Zakat Payable</span>
                <span className="font-bold italic text-lg" style={{ color: BROWN_DEEP, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {fmt(zakatPayable, symbol)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-5 pt-5 pb-7 rounded-t-[28px]"
          style={{ backgroundColor: '#FFF5E5', boxShadow: '0 -8px 30px rgba(0,0,0,0.06)' }}
        >
          <button
            onClick={() => navigate('/zakat')}
            className="w-full h-14 rounded-full text-white font-bold tracking-wider flex items-center justify-center gap-3 mb-3"
            style={{ backgroundColor: BROWN_DEEP }}
          >
            <RotateCcw className="h-4 w-4" /> RECALCULATE ZAKAT
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full h-12 rounded-full font-bold tracking-wider flex items-center justify-center gap-2"
            style={{ backgroundColor: 'transparent', border: `2px solid ${BROWN_DEEP}`, color: BROWN_DEEP }}
          >
            BACK TO HOME <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
};
