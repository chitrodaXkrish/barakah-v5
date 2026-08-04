import { useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Info, Lightbulb, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CREAM = '#FFF5E5';
const CARD_CREAM = '#FFF8F0';
const BROWN_DARK = '#2C1309';
const BROWN_DEEP = '#78351A';
const ORANGE = '#CE5728';

type CurrencyCode = string;

type Currency = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  usdRate: number;
};

const USD_NISAB = 4850;
const USD_GOLD_PRICE_PER_GRAM = 79;
const FEATURED_CURRENCY_CODES = ['GBP', 'USD', 'EUR', 'MYR'];

const CURRENCY_RATES: Record<string, number> = {
  AED: 3.67, AFN: 71.5, ALL: 91.2, AMD: 388, ANG: 1.79, AOA: 912, ARS: 1015,
  AUD: 1.52, AWG: 1.79, AZN: 1.7, BAM: 1.8, BBD: 2, BDT: 119, BGN: 1.8,
  BHD: 0.376, BIF: 2880, BMD: 1, BND: 1.34, BOB: 6.9, BRL: 5.55, BSD: 1,
  BTN: 84, BWP: 13.5, BYN: 3.27, BZD: 2, CAD: 1.37, CDF: 2850, CHF: 0.89,
  CLP: 940, CNY: 7.25, COP: 4100, CRC: 505, CUP: 24, CVE: 101, CZK: 23.1,
  DJF: 178, DKK: 6.85, DOP: 59, DZD: 134, EGP: 49, ERN: 15, ETB: 121,
  EUR: 0.92, FJD: 2.25, FKP: 0.79, GBP: 0.79, GEL: 2.7, GHS: 15.1,
  GIP: 0.79, GMD: 68, GNF: 8600, GTQ: 7.75, GYD: 209, HKD: 7.8, HNL: 24.8,
  HTG: 132, HUF: 365, IDR: 16250, ILS: 3.65, INR: 84, IQD: 1310, IRR: 42000,
  ISK: 138, JMD: 156, JOD: 0.709, JPY: 153, KES: 129, KGS: 87, KHR: 4100,
  KMF: 453, KPW: 900, KRW: 1375, KWD: 0.307, KYD: 0.833, KZT: 490, LAK: 21900,
  LBP: 89500, LKR: 295, LRD: 193, LSL: 18.1, LYD: 4.8, MAD: 9.9, MDL: 17.8,
  MGA: 4600, MKD: 56.5, MMK: 2100, MNT: 3390, MOP: 8.04, MRU: 39.7,
  MUR: 46.5, MVR: 15.4, MWK: 1735, MXN: 20.1, MYR: 4.71, MZN: 63.9,
  NAD: 18.1, NGN: 1630, NIO: 36.8, NOK: 10.9, NPR: 134, NZD: 1.68,
  OMR: 0.385, PAB: 1, PEN: 3.75, PGK: 3.95, PHP: 58.5, PKR: 278, PLN: 4.02,
  PYG: 7800, QAR: 3.64, RON: 4.58, RSD: 107, RUB: 98, RWF: 1360, SAR: 3.75,
  SBD: 8.45, SCR: 13.7, SDG: 601, SEK: 10.6, SGD: 1.34, SHP: 0.79, SLE: 22.7,
  SOS: 571, SRD: 35, SSP: 130, STN: 22.5, SYP: 13000, SZL: 18.1, THB: 34.5,
  TJS: 10.65, TMT: 3.5, TND: 3.12, TOP: 2.34, TRY: 34.3, TTD: 6.78,
  TWD: 32.2, TZS: 2700, UAH: 41.2, UGX: 3680, USD: 1, UYU: 41, UZS: 12800,
  VES: 42, VND: 25300, VUV: 119, WST: 2.8, XAF: 602, XCD: 2.7, XOF: 602,
  XPF: 110, YER: 250, ZAR: 18.1, ZMW: 27,
};

const getCurrencyName = (code: string) => {
  try {
    const DisplayNames = (Intl as any).DisplayNames;
    return DisplayNames ? new DisplayNames(['en'], { type: 'currency' }).of(code) || code : code;
  } catch {
    return code;
  }
};

const getCurrencySymbol = (code: string) => {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    const symbol = parts.find((part) => part.type === 'currency')?.value;
    return symbol && symbol !== code ? symbol : `${code} `;
  } catch {
    return `${code} `;
  }
};

const getCurrencyCodes = () => {
  const supportedValuesOf = (Intl as any).supportedValuesOf as ((key: string) => string[]) | undefined;
  const supportedCodes = supportedValuesOf ? supportedValuesOf('currency') : [];
  return Array.from(new Set([...FEATURED_CURRENCY_CODES, ...supportedCodes])).sort();
};

const CURRENCIES: Currency[] = getCurrencyCodes().map((code) => ({
  code,
  name: getCurrencyName(code),
  symbol: getCurrencySymbol(code),
  usdRate: CURRENCY_RATES[code] ?? 1,
}));

const fmt = (n: number, symbol: string) =>
  `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const [cash, setCash] = useState('');
  const [goldMode, setGoldMode] = useState<GoldMode>('GRAMS');
  const [gold, setGold] = useState('');
  const [silver, setSilver] = useState('');
  const [business, setBusiness] = useState('');
  const [moneyOwed, setMoneyOwed] = useState('');
  const [investments, setInvestments] = useState('');

  const active = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const filteredCurrencies = useMemo(() => {
    const query = currencySearch.trim().toLowerCase();
    if (!query) return CURRENCIES;
    return CURRENCIES.filter((c) =>
      c.code.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      c.symbol.toLowerCase().includes(query)
    );
  }, [currencySearch]);
  const activeNisab = USD_NISAB * active.usdRate;
  const activeGoldPricePerGram = USD_GOLD_PRICE_PER_GRAM * active.usdRate;

  const goldValue = useMemo(() => {
    const n = parseFloat(gold || '0');
    if (goldMode === 'GRAMS') return n * activeGoldPricePerGram;
    return n;
  }, [gold, goldMode, activeGoldPricePerGram]);

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

  const zakatable = total >= activeNisab ? total : 0;

  return (
    <Layout showHeader={false} showNavigation={false}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM }}>
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
          <div
            className="rounded-[28px] p-6 text-center relative overflow-visible"
            style={{ background: `linear-gradient(160deg, ${BROWN_DEEP} 0%, ${ORANGE} 100%)` }}
          >
            <button
              type="button"
              onClick={() => setCurrencyPickerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full py-2 pl-4 pr-3 text-sm font-bold text-white outline-none active:scale-[0.98] transition-transform"
              style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
              aria-label="Select currency"
            >
              <span>{active.symbol}</span>
              <span>{active.code}</span>
              <ChevronDown className="h-3.5 w-3.5 text-white" />
            </button>
            <p className="mt-5 text-white/85 text-xs tracking-[0.18em] font-semibold">CURRENT NISAB VALUE</p>
            <p
              className="mt-2 text-white text-5xl font-bold italic"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {fmt(activeNisab, active.symbol)}
            </p>
            <p className="mt-3 text-white/80 text-sm">Based on Today's Gold Price</p>
          </div>

          <div className="mt-5 rounded-full p-1.5 flex" style={{ backgroundColor: CARD_CREAM }}>
            {FEATURED_CURRENCY_CODES.map((code) => {
              const selected = currency === code;
              return (
                <button
                  key={code}
                  onClick={() => setCurrency(code)}
                  className="flex-1 py-2.5 rounded-full text-sm font-bold transition-colors"
                  style={{
                    backgroundColor: selected ? BROWN_DEEP : 'transparent',
                    color: selected ? '#fff' : BROWN_DARK,
                  }}
                >
                  {code}
                </button>
              );
            })}
          </div>

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
                nisab: activeNisab,
                symbol: active.symbol,
                currency: active.code,
                goldMode,
                goldRaw: gold,
                goldPricePerGram: activeGoldPricePerGram,
              }
            })}
            className="w-full h-14 rounded-full text-white font-bold tracking-wider flex items-center justify-center gap-3"
            style={{ backgroundColor: BROWN_DEEP }}
          >
            CALCULATE ZAKAT <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {currencyPickerOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4"
            onClick={() => setCurrencyPickerOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-t-[28px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-xl"
              style={{ backgroundColor: CREAM, border: '1px solid #E4C49B' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-12 rounded-full" style={{ backgroundColor: '#D8B991' }} />
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: BROWN_DARK }}>Select currency</h2>
                  <p className="text-xs mt-0.5" style={{ color: BROWN_DARK, opacity: 0.62 }}>
                    {active.code} - {active.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrencyPickerOpen(false)}
                  className="h-9 w-9 rounded-full flex items-center justify-center"
                  style={{ color: BROWN_DEEP, backgroundColor: CARD_CREAM }}
                  aria-label="Close currency picker"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div
                className="flex items-center gap-2 rounded-2xl border px-4 mb-3"
                style={{ backgroundColor: '#FFFDF7', borderColor: '#D8B991' }}
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: BROWN_DEEP, opacity: 0.7 }} />
                <input
                  autoFocus
                  value={currencySearch}
                  onChange={(event) => setCurrencySearch(event.target.value)}
                  placeholder="Search currency"
                  className="h-12 flex-1 bg-transparent outline-none text-sm font-medium placeholder:opacity-50"
                  style={{ color: BROWN_DARK }}
                />
              </div>

              <div className="max-h-[48vh] overflow-y-auto rounded-2xl" style={{ backgroundColor: CARD_CREAM }}>
                {filteredCurrencies.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm" style={{ color: BROWN_DARK, opacity: 0.65 }}>
                    No currencies found
                  </div>
                ) : (
                  filteredCurrencies.map((c) => {
                    const selected = c.code === currency;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCurrency(c.code);
                          setCurrencyPickerOpen(false);
                          setCurrencySearch('');
                        }}
                        className="w-full min-h-14 px-4 flex items-center gap-3 text-left border-b last:border-b-0"
                        style={{
                          borderColor: `${BROWN_DARK}14`,
                          backgroundColor: selected ? '#F4DEC3' : 'transparent',
                        }}
                      >
                        <span className="w-12 shrink-0 text-base font-bold" style={{ color: BROWN_DEEP }}>
                          {c.code}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold truncate" style={{ color: BROWN_DARK }}>
                            {c.name}
                          </span>
                          <span className="block text-xs" style={{ color: BROWN_DARK, opacity: 0.58 }}>
                            Symbol: {c.symbol}
                          </span>
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0" style={{ color: BROWN_DEEP }} />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
