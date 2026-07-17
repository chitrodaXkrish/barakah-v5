import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { ArrowLeft, Flashlight, ScanLine, Check, Shield, Sparkles, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import scannerProduct from '@/assets/scanner-product.jpg';
import scannerAlt1 from '@/assets/scanner-alt-1.jpg';
import scannerAlt2 from '@/assets/scanner-alt-2.jpg';

const CREAM_BG = '#FFF5E5';
const CARD_CREAM = '#FBE6C8';
const BROWN = '#2C1309';
const BROWN_BTN = '#6B3520';
const MUTED = '#8A6A55';

const SERIF = "'Plus Jakarta Sans', sans-serif";

type Ingredient = { name: string; ok: boolean };

const PRODUCT = {
  name: 'Golden Saffron Tea Biscuits',
  image: scannerProduct,
  keyIngredient: 'Pure Iranian Saffron',
  totalScanned: 12,
  ingredients: [
    { name: 'Organic Wheat Flour', ok: true },
    { name: 'Cane Sugar', ok: true },
    { name: 'Vegetable Shortening', ok: true },
    { name: 'Whole Milk Powder', ok: true },
    { name: 'Pure Vanilla Extract', ok: true },
    { name: 'Sea Salt', ok: true },
    { name: 'Baking Soda', ok: true },
    { name: 'Lecithin', ok: true },
  ] as Ingredient[],
};

const ALTERNATIVES = [
  { brand: 'MEDINA ORGANICS', name: 'Medina Date Crisps', price: '$12.50', rating: '4.9', image: scannerAlt1 },
  { brand: 'PERSIAN HOUSE', name: 'Saffron Shortbread', price: '$14.00', rating: '4.8', image: scannerAlt2 },
];

export const HalalScanner = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'scan' | 'result'>('scan');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const scannerIdRef = useRef(`halal-scanner-${Date.now()}`);
  const mountedRef = useRef(true);

  const cleanupScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const state = scanner.getState();
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // ignore
    }
    scannerRef.current = null;
  }, []);

  const startScanning = async () => {
    setError(null);
    await cleanupScanner();
    const el = scannerDivRef.current;
    if (!el) return;
    el.innerHTML = '';
    const container = document.createElement('div');
    container.id = scannerIdRef.current;
    container.style.width = '100%';
    container.style.height = '100%';
    el.appendChild(container);
    try {
      const scanner = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 180 } },
        () => {
          if (!mountedRef.current) return;
          cleanupScanner();
          setScanning(false);
          setView('result');
        },
        () => {}
      );
      if (mountedRef.current) setScanning(true);
    } catch {
      if (mountedRef.current) {
        setError('Camera access denied. Please allow camera permissions.');
        setScanning(false);
      }
    }
  };

  const stopScanning = async () => {
    await cleanupScanner();
    setScanning(false);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupScanner();
    };
  }, [cleanupScanner]);

  const handleScanAnother = () => {
    setView('scan');
  };

  // Demo: tapping "Enter barcode manually" jumps to result
  const handleManual = () => setView('result');

  return (
    <div className="min-h-screen max-w-md mx-auto font-arabic" style={{ backgroundColor: CREAM_BG, color: BROWN }}>
      {view === 'scan' ? (
        <ScanView
          onBack={() => navigate('/')}
          scannerDivRef={scannerDivRef}
          scanning={scanning}
          error={error}
          startScanning={startScanning}
          stopScanning={stopScanning}
          onManual={handleManual}
        />
      ) : (
        <ResultView onBack={() => navigate('/')} onScanAnother={handleScanAnother} />
      )}

      <style>{`
        #${scannerIdRef.current},
        #${scannerIdRef.current} > div {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          padding: 0 !important;
        }
        #${scannerIdRef.current} video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 0 !important;
        }
        #${scannerIdRef.current} img { display: none !important; }
        #${scannerIdRef.current} #qr-shaded-region { display: none !important; }
      `}</style>
    </div>
  );
};

/* ---------------- Scan View ---------------- */

const ScanView = ({
  onBack,
  scannerDivRef,
  scanning,
  error,
  startScanning,
  stopScanning,
  onManual,
}: {
  onBack: () => void;
  scannerDivRef: React.RefObject<HTMLDivElement>;
  scanning: boolean;
  error: string | null;
  startScanning: () => void;
  stopScanning: () => void;
  onManual: () => void;
}) => {
  useEffect(() => {
    startScanning();
  }, []);

  return (
    <div className="px-5 pt-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="h-9 w-9 flex items-center justify-center -ml-1" aria-label="Back">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} style={{ color: BROWN }} />
        </button>
        <h1 className="italic text-[17px] tracking-tight" style={{ fontFamily: SERIF, color: BROWN }}>
          Ingredient Scanner
        </h1>
        <button className="h-9 w-9 flex items-center justify-center" aria-label="Flashlight">
          <Flashlight className="h-5 w-5" strokeWidth={1.75} style={{ color: BROWN }} />
        </button>
      </div>

      {/* Camera feed container */}
      <div
        className="relative w-full rounded-[28px] overflow-hidden mb-6"
        style={{ aspectRatio: '4 / 5', backgroundColor: '#E9D6B5' }}
      >
        {/* Corner brackets */}
        <Corner pos="tl" />
        <Corner pos="tr" />
        <Corner pos="bl" />
        <Corner pos="br" />

        {/* Camera feed */}
        <div ref={scannerDivRef} className="absolute inset-0" />

        {/* Scanning line */}
        {scanning && (
          <div
            className="absolute left-6 right-6 h-[2px] z-10 animate-[scanline_2s_ease-in-out_infinite]"
            style={{ background: 'rgba(220,38,38,0.9)' }}
          />
        )}
      </div>

      {/* Captions */}
      <p className="text-center text-[15px] leading-snug" style={{ color: BROWN }}>
        Point camera at any barcode or ingredient list
      </p>
      <p className="text-center text-[13px] mt-1" style={{ color: MUTED }}>
        Processing requires a clear, steady view
      </p>

      {/* Scan button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={scanning ? stopScanning : startScanning}
          className="h-14 w-14 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
          style={{ backgroundColor: BROWN_BTN }}
          aria-label="Start scan"
        >
          <Flashlight className="h-6 w-6 text-white" strokeWidth={1.75} />
        </button>
      </div>

      <button
        onClick={onManual}
        className="block mx-auto mt-3 text-[14px] font-medium"
        style={{ color: BROWN_BTN }}
      >
        Enter barcode manually
      </button>

      {error && (
        <p className="text-center text-sm mt-3" style={{ color: '#B22' }}>{error}</p>
      )}

      {/* How it works */}
      <div
        className="mt-7 rounded-2xl px-5 py-5"
        style={{ backgroundColor: CARD_CREAM }}
      >
        <h3 className="italic text-[15px] mb-4" style={{ fontFamily: SERIF, color: BROWN }}>
          How it works
        </h3>
        <div className="flex items-start justify-between gap-2">
          <Step n={1} label="Point" />
          <Dashes />
          <Step n={2} label="Scan" />
          <Dashes />
          <Step n={3} label={'See\nresult'} />
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-6 flex items-center justify-center gap-3 text-[13px]" style={{ color: MUTED }}>
        <button>Report an issue</button>
        <span className="opacity-50">•</span>
        <button>Help Center</button>
      </div>
    </div>
  );
};

const Corner = ({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const base = 'absolute w-6 h-6 z-20 border-[#B5662C]';
  const map = {
    tl: 'top-3 left-3 border-t-2 border-l-2 rounded-tl-md',
    tr: 'top-3 right-3 border-t-2 border-r-2 rounded-tr-md',
    bl: 'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-md',
    br: 'bottom-3 right-3 border-b-2 border-r-2 rounded-br-md',
  };
  return <div className={`${base} ${map[pos]}`} />;
};

const Step = ({ n, label }: { n: number; label: string }) => (
  <div className="flex flex-col items-center gap-2 w-[64px]">
    <div className="relative">
      <div
        className="h-12 w-12 rounded-full flex items-center justify-center"
        style={{ backgroundColor: '#EAD3AE' }}
      >
        {n === 1 && <ScanLine className="h-5 w-5" style={{ color: BROWN }} strokeWidth={1.75} />}
        {n === 2 && <Flashlight className="h-5 w-5" style={{ color: BROWN }} strokeWidth={1.75} />}
        {n === 3 && <Check className="h-5 w-5" style={{ color: BROWN }} strokeWidth={2} />}
      </div>
      <div
        className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-[11px] font-semibold flex items-center justify-center"
        style={{ backgroundColor: BROWN_BTN }}
      >
        {n}
      </div>
    </div>
    <span className="text-[12px] text-center leading-tight whitespace-pre-line" style={{ color: BROWN }}>
      {label}
    </span>
  </div>
);

const Dashes = () => (
  <div className="flex-1 mt-6 border-t border-dashed" style={{ borderColor: '#C9A77A' }} />
);

/* ---------------- Result View ---------------- */

const ResultView = ({ onBack, onScanAnother }: { onBack: () => void; onScanAnother: () => void }) => {
  return (
    <div className="pb-12">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={onBack} className="h-9 w-9 flex items-center justify-center -ml-1" aria-label="Back">
          <ArrowLeft className="h-5 w-5" style={{ color: BROWN }} strokeWidth={1.75} />
        </button>
        <h1 className="italic text-[17px]" style={{ fontFamily: SERIF, color: BROWN }}>
          Barakah
        </h1>
        <div className="h-9 w-9 rounded-full border flex items-center justify-center" style={{ borderColor: '#C9A77A' }}>
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: BROWN }} />
        </div>
      </div>

      {/* Halal verified card */}
      <div className="px-5">
        <div
          className="rounded-2xl px-6 py-5 flex flex-col items-center text-center"
          style={{ backgroundColor: '#F5E6D0' }}
        >
          <div className="h-12 w-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#A35233' }}>
            <Check className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-[19px] font-semibold" style={{ color: '#5C2A14', fontFamily: SERIF }}>
            Halal Verified
          </div>
          <div className="text-[10px] tracking-[0.18em] mt-1" style={{ color: '#8B6E4A' }}>
            COMPLIANT WITH ISLAMIC STANDARDS
          </div>
        </div>
      </div>

      {/* Product image */}
      <div className="px-5 mt-5 flex justify-center">
        <img
          src={PRODUCT.image}
          alt={PRODUCT.name}
          className="w-[170px] h-[170px] rounded-2xl object-cover"
          loading="lazy"
        />
      </div>

      {/* Scan another */}
      <div className="px-5 mt-5">
        <button
          onClick={onScanAnother}
          className="w-full rounded-full py-3.5 text-white text-[13px] font-semibold tracking-[0.14em] flex items-center justify-center gap-2 shadow-sm"
          style={{ backgroundColor: BROWN_BTN }}
        >
          <ScanLine className="h-4 w-4" strokeWidth={2} />
          SCAN ANOTHER PRODUCT
        </button>
      </div>

      {/* Product name */}
      <h2
        className="px-5 mt-5 text-center italic text-[28px] leading-tight"
        style={{ fontFamily: SERIF, color: BROWN }}
      >
        {PRODUCT.name}
      </h2>

      {/* Verified by Barakah pill */}
      <div className="flex justify-center mt-3">
        <div
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium"
          style={{ backgroundColor: '#F2E2A6', color: '#5C4710' }}
        >
          <Shield className="h-3.5 w-3.5" strokeWidth={2} />
          Verified by Barakah
        </div>
      </div>

      {/* Detailed ingredients header */}
      <div className="px-5 mt-7 flex items-end justify-between">
        <h3 className="italic text-[22px] leading-tight" style={{ fontFamily: SERIF, color: BROWN }}>
          Detailed<br />Ingredients
        </h3>
        <div className="text-right">
          <div className="text-[18px] font-semibold" style={{ color: BROWN }}>{PRODUCT.totalScanned}</div>
          <div className="text-[10px] tracking-[0.2em]" style={{ color: MUTED }}>INGREDIENTS<br />SCANNED</div>
        </div>
      </div>

      {/* Ingredients card */}
      <div className="px-5 mt-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: CARD_CREAM }}>
          {/* Key ingredient */}
          <div
            className="rounded-xl px-4 py-3 mb-3 flex items-center gap-3 border-l-4"
            style={{ backgroundColor: '#FFF4DA', borderColor: BROWN_BTN }}
          >
            <Sparkles className="h-4 w-4" style={{ color: BROWN_BTN }} strokeWidth={2} />
            <div className="flex-1">
              <div className="text-[10px] tracking-[0.18em] font-semibold" style={{ color: BROWN_BTN }}>
                KEY INGREDIENT
              </div>
              <div className="italic text-[15px]" style={{ fontFamily: SERIF, color: BROWN }}>
                {PRODUCT.keyIngredient}
              </div>
            </div>
            <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#A35233' }}>
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
          </div>

          {/* List */}
          <ul className="divide-y" style={{ borderColor: 'rgba(139,90,43,0.15)' }}>
            {PRODUCT.ingredients.map((ing) => (
              <li key={ing.name} className="flex items-center justify-between py-3">
                <span className="text-[14px] font-medium" style={{ color: BROWN }}>{ing.name}</span>
                <Check className="h-4 w-4" style={{ color: '#A35233' }} strokeWidth={2.5} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Halal Alternatives */}
      <div className="px-5 mt-10 flex items-start justify-between">
        <h3 className="italic text-[24px] leading-tight" style={{ fontFamily: SERIF, color: BROWN }}>
          Halal<br />Alternatives
        </h3>
        <div className="flex gap-1.5 mt-2">
          <button className="h-8 w-8 rounded-full border flex items-center justify-center" style={{ borderColor: '#C9A77A', color: BROWN }}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="h-8 w-8 rounded-full border flex items-center justify-center" style={{ borderColor: '#C9A77A', color: BROWN }}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="px-5 mt-2 text-[13px]" style={{ color: MUTED }}>
        Recommended similar items from verified brands.
      </p>

      <div className="mt-4 flex gap-3 overflow-x-auto px-5 pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        {ALTERNATIVES.map((a) => (
          <div
            key={a.name}
            className="min-w-[78%] snap-start rounded-2xl overflow-hidden"
            style={{ backgroundColor: CARD_CREAM }}
          >
            <div className="relative">
              <img src={a.image} alt={a.name} className="w-full h-44 object-cover" loading="lazy" />
              <div
                className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] font-semibold text-white px-2 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(46,125,78,0.92)' }}
              >
                On Marketplace <ExternalLink className="h-3 w-3" />
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[10px] tracking-[0.18em] font-semibold" style={{ color: BROWN_BTN }}>
                {a.brand}
              </div>
              <div className="text-[15px] font-semibold mt-1" style={{ color: BROWN }}>{a.name}</div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-[15px] font-bold" style={{ color: BROWN }}>{a.price}</div>
                <div className="text-[12px]" style={{ color: BROWN }}>★ {a.rating}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// scanline keyframes
const styleTag = document.getElementById('halal-scanner-keyframes');
if (!styleTag && typeof document !== 'undefined') {
  const s = document.createElement('style');
  s.id = 'halal-scanner-keyframes';
  s.innerHTML = `@keyframes scanline { 0%,100% { top: 18%; } 50% { top: 78%; } }`;
  document.head.appendChild(s);
}