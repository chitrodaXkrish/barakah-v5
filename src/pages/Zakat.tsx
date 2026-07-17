import { useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { ArrowLeft, ArrowRight, ChevronDown, Info, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CREAM = '#FFF5E5';
const CARD_CREAM = '#FFF8F0';
const BROWN_DARK = '#2C1309';
const BROWN = '#A35233';
const BROWN_DEEP = '#78351A';
const ORANGE = '#CE5728';

type CurrencyCode = 'GBP' | 'USD' | 'EUR';

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string; flag: string; country: string; nisab: number }[] = [
  { code: 'GBP', label: 'GBP (£)', symbol: '£', flag: '🇬🇧', country: 'UK', nisab: 3842.15 },
  { code: 'USD', label: 'USD ($)', symbol: '$', flag: '🇺🇸', country: 'US', nisab: 4850.0 },
  { code: 'EUR', label: 'EUR (€)', symbol: '€', flag: '🇪🇺', country: 'EU', nisab: 4490.5 },
];

const fmt = (n: number, symbol: string) =>
  `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const GOLD_PRICE_PER_GRAM: Record<CurrencyCode, number> = { GBP: 62.5, USD: 79.0, EUR: 73.0 };

type GoldMode = 'GRAMS' | 'VALUE';

const FieldRow = ({
  label,
  symbol,
  value,
  onChange,
  trailing,
  suffix,
}: {
  label: string;
  symbol?: string;
  value: string;
  onChange: (v: string) => void;
  trailing?: React.ReactNode;
  suffix?: string;
}) => (
  <div className="pt-1">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-[15px]" style={{ color: BROWN_DARK }}>{label}</span>
        <Info className="h-3.5 w-3.5" style={{ color: BROWN_DARK, opacity: 0.45 }} />
      </div>
      {trailing}
    </div>
    <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: `${BROWN_DARK}25` }}>
      {symbol && <span className="text-2xl font-light" style={{ color: ORANGE }}>{symbol}</span>}
      <input
        type="number"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-2xl font-light placeholder:opacity-40"
        style={{ color: BROWN_DARK }}
      />
      {suffix && <span className="text-base font-bold" style={{ color: BROWN_DARK }}>{suffix}</span>}
    </div>
  </div>
);

export const Zakat = () => {
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<CurrencyCode>('GBP');
  const [showCountry, setShowCountry] = useState(false);

  const [cash, setCash] = useState('');
  const [goldMode, setGoldMode] = useState<GoldMode>('GRAMS');
  const [gold, setGold] = useState('');
  const [silver, setSilver] = useState('');
  const [business, setBusiness] = useState('');
  const [moneyOwed, setMoneyOwed] = useState('');
  const [investments, setInvestments] = useState('');

  const active = CURRENCIES.find((c) => c.code === currency)!;

  const goldValue = useMemo(() => {
    const n = parseFloat(gold || '0');
    if (goldMode === 'GRAMS') return n * GOLD_PRICE_PER_GRAM[currency];
    return n;
  }, [gold, goldMode, currency]);

  const total = useMemo(() => {
    return (
      parseFloat(cash || '0') +
      goldValue +
      parseFloat(silver || '0') +
      parseFloat(business || '0') +
      parseFloat(moneyOwed || '0') +
      parseFloat(investments || '0')
    );
  }, [cash, goldValue, silver, business, moneyOwed, investments]);

  const zakatable = total >= active.nisab ? total : 0;

  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between" style={{ backgroundColor: CREAM }}>
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center"
            style={{ color: BROWN_DARK }}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-serif italic text-xl font-bold" style={{ color: BROWN_DARK, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Checkout
          </h1>
          <span className="text-sm" style={{ color: BROWN_DARK, opacity: 0.75 }}>Step 1 of 2</span>
        </div>

        <div className="flex-1 px-5 pb-40 overflow-y-auto">
          {/* Nisab Card */}
          <div
            className="rounded-[28px] p-6 text-center relative overflow-hidden"
            style={{ background: `linear-gradient(160deg, ${BROWN_DEEP} 0%, ${ORANGE} 100%)` }}
          >
            <button
              onClick={() => setShowCountry((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
            >
              {active.country} <span>{active.flag}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <p className="mt-5 text-white/85 text-xs tracking-[0.18em] font-semibold">CURRENT NISAB VALUE</p>
            <p
              className="mt-2 text-white text-5xl font-bold italic"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {fmt(active.nisab, active.symbol)}
            </p>
            <p className="mt-3 text-white/80 text-sm">Based on gold price today</p>
          </div>

          {/* Currency switch */}
          <div className="mt-5 rounded-full p-1.5 flex" style={{ backgroundColor: CARD_CREAM }}>
            {CURRENCIES.map((c) => {
              const selected = currency === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className="flex-1 py-2.5 rounded-full text-sm font-bold transition-colors"
                  style={{
                    backgroundColor: selected ? BROWN_DEEP : 'transparent',
                    color: selected ? '#fff' : BROWN_DARK,
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Title */}
          <h2
            className="text-center mt-8 mb-5 italic text-3xl"
            style={{ color: BROWN_DEEP, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Your Wealth
          </h2>

          <div className="space-y-5">
            <FieldRow label="Cash & Savings" symbol={active.symbol} value={cash} onChange={setCash} />

            <FieldRow
              label="Gold Value"
              symbol={goldMode === 'VALUE' ? active.symbol : undefined}
              value={gold}
              onChange={setGold}
              suffix={goldMode === 'GRAMS' ? 'g' : undefined}
              trailing={
                <div className="rounded-full p-1 flex text-[11px] font-bold" style={{ backgroundColor: CARD_CREAM }}>
                  {(['GRAMS', 'VALUE'] as GoldMode[]).map((m) => {
                    const sel = goldMode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setGoldMode(m)}
                        className="px-3 py-1 rounded-full tracking-wider"
                        style={{
                          backgroundColor: sel ? BROWN_DARK : 'transparent',
                          color: sel ? '#fff' : BROWN_DARK,
                        }}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              }
            />

            <FieldRow label="Silver Value" symbol={active.symbol} value={silver} onChange={setSilver} />
            <FieldRow label="Business Assets" symbol={active.symbol} value={business} onChange={setBusiness} />
            <FieldRow label="Money Owed to You" symbol={active.symbol} value={moneyOwed} onChange={setMoneyOwed} />
            <FieldRow label="Investments & Stocks" symbol={active.symbol} value={investments} onChange={setInvestments} />
          </div>

          {/* Did you know */}
          <div className="mt-7 rounded-3xl p-5 flex items-start gap-4" style={{ backgroundColor: CARD_CREAM }}>
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#B6E2B6' }}
            >
              <Lightbulb className="h-5 w-5" style={{ color: '#2B5E2B' }} />
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: BROWN_DARK }}>Did you know?</p>
              <p className="text-sm leading-relaxed" style={{ color: BROWN_DARK, opacity: 0.85 }}>
                Zakat is 2.5% of your total zakatable wealth, provided it remains above the Nisab threshold for a full lunar year (Hawl).
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-5 pt-5 pb-7 rounded-t-[28px]"
          style={{ backgroundColor: '#FFF5E5', boxShadow: '0 -8px 30px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-[0.18em]" style={{ color: BROWN_DARK }}>
              ZAKATABLE WEALTH
            </span>
            <span
              className="text-xl italic font-bold"
              style={{ color: BROWN_DEEP, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {fmt(zakatable, active.symbol)}
            </span>
          </div>
          <button
            onClick={() => navigate('/zakat-result', {
              state: {
                cash,
                goldValue,
                silver,
                business,
                moneyOwed,
                investments,
                total,
                zakatable,
                zakatPayable: zakatable * 0.025,
                nisab: active.nisab,
                symbol: active.symbol,
                currency: active.code,
                goldMode,
                goldRaw: gold,
                goldPricePerGram: GOLD_PRICE_PER_GRAM[currency],
              }
            })}
            className="w-full h-14 rounded-full text-white font-bold tracking-wider flex items-center justify-center gap-3"
            style={{ backgroundColor: BROWN_DEEP }}
          >
            CALCULATE ZAKAT <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </Layout>
  );
};
