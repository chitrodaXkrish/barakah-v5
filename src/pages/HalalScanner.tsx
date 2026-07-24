import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { ArrowLeft, Flashlight, ScanLine, Check, Shield, Sparkles, ChevronLeft, ChevronRight, ExternalLink, X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGlobalLocation } from '@/contexts/LocationContext';
import scannerProduct from '@/assets/scanner-product.jpg';
import scannerAlt1 from '@/assets/scanner-alt-1.jpg';
import scannerAlt2 from '@/assets/scanner-alt-2.jpg';
import { supabase } from '@/integrations/supabase/client';

const CREAM_BG = '#FFF5E5';
const CARD_CREAM = '#FBE6C8';
const BROWN = '#2C1309';
const BROWN_BTN = '#6B3520';
const MUTED = '#8A6A55';

const SERIF = "'Plus Jakarta Sans', sans-serif";

type Ingredient = { name: string; ok: boolean };

type HalalStatus = 'halal' | 'haram' | 'mushbooh' | 'unknown';

type ScanResult = {
  product_name: string;
  brand: string | null;
  status: HalalStatus;
  confidence: number | null;
  verdict: string | null;
  category: string | null;
  region: string | null;
  ingredients: Array<{ name: string; ok: boolean; note?: string | null }>;
  source?: string | null;
};

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
  const { location } = useGlobalLocation();
  const [view, setView] = useState<'scan' | 'result'>('scan');
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const scannerIdRef = useRef(`halal-scanner-${Date.now()}`);
  const mountedRef = useRef(true);
  const handlingScanRef = useRef(false);

  const captureScannerFrame = useCallback(() => {
    const video = scannerDivRef.current?.querySelector('video') as HTMLVideoElement | null;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  }, []);

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

  const analyzeBarcode = useCallback(async (barcode: string) => {
    if (!barcode || handlingScanRef.current) return;

    handlingScanRef.current = true;
    setError(null);
    setAnalyzing(true);
    setLastBarcode(barcode);
    setScanResult(null);
    const imageBase64 = captureScannerFrame();
    await cleanupScanner();
    setScanning(false);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('scan-halal', {
        body: {
          barcode,
          ...(location
            ? { region: [location.city, location.country].filter(Boolean).join(', ') }
            : {}),
          ...(imageBase64
            ? { imageBase64, imageMimeType: 'image/jpeg' }
            : {}),
        },
      });

      if (invokeError) throw invokeError;
      const result = data?.result;
      if (!result) throw new Error('No scan result returned');
      if (result.source === 'barcode_lookup_miss') {
        throw new Error('This barcode was scanned, but no product details were found. Please scan the ingredient label or try another barcode.');
      }

      if (!mountedRef.current) return;
      setScanResult({
        product_name: result.product_name || 'Unknown Product',
        brand: result.brand ?? null,
        status: result.status || 'unknown',
        confidence: typeof result.confidence === 'number' ? result.confidence : null,
        verdict: result.verdict ?? null,
        category: result.category ?? null,
        region: result.region ?? null,
        ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
        source: result.source ?? null,
      });
      setView('result');
    } catch (scanError: any) {
      if (!mountedRef.current) return;
      setError(scanError?.message || 'Could not analyze this barcode. Please try again.');
      setView('scan');
    } finally {
      handlingScanRef.current = false;
      if (mountedRef.current) setAnalyzing(false);
    }
  }, [captureScannerFrame, cleanupScanner, location]);

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
        (decodedText) => {
          if (!mountedRef.current) return;
          analyzeBarcode(decodedText);
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
    setScanResult(null);
    setLastBarcode(null);
    setError(null);
    setView('scan');
  };

  const handleManualSubmit = () => {
    const barcode = manualBarcode.replace(/\D/g, '').trim();
    if (!barcode) {
      setError('Please enter a valid barcode number.');
      return;
    }
    setManualOpen(false);
    setManualBarcode('');
    analyzeBarcode(barcode);
  };

  return (
    <div className="min-h-screen max-w-md mx-auto font-arabic" style={{ backgroundColor: CREAM_BG, color: BROWN }}>
      {view === 'scan' ? (
        <ScanView
          onBack={() => navigate('/')}
          scannerDivRef={scannerDivRef}
          scanning={scanning}
          error={error}
          analyzing={analyzing}
          startScanning={startScanning}
          stopScanning={stopScanning}
          manualOpen={manualOpen}
          manualBarcode={manualBarcode}
          setManualOpen={setManualOpen}
          setManualBarcode={setManualBarcode}
          onManualSubmit={handleManualSubmit}
        />
      ) : (
        <ResultView
          onBack={() => navigate('/')}
          onScanAnother={handleScanAnother}
          result={scanResult}
          barcode={lastBarcode}
        />
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
  analyzing,
  startScanning,
  stopScanning,
  manualOpen,
  manualBarcode,
  setManualOpen,
  setManualBarcode,
  onManualSubmit,
}: {
  onBack: () => void;
  scannerDivRef: React.RefObject<HTMLDivElement>;
  scanning: boolean;
  error: string | null;
  analyzing: boolean;
  startScanning: () => void;
  stopScanning: () => void;
  manualOpen: boolean;
  manualBarcode: string;
  setManualOpen: (open: boolean) => void;
  setManualBarcode: (barcode: string) => void;
  onManualSubmit: () => void;
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
        {analyzing ? 'Analyzing barcode with Barakah AI...' : 'Processing requires a clear, steady view'}
      </p>

      {/* Scan button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={scanning ? stopScanning : startScanning}
          disabled={analyzing}
          className="h-14 w-14 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
          style={{ backgroundColor: BROWN_BTN }}
          aria-label="Start scan"
        >
          {analyzing ? (
            <Sparkles className="h-6 w-6 text-white animate-pulse" strokeWidth={1.75} />
          ) : (
            <Flashlight className="h-6 w-6 text-white" strokeWidth={1.75} />
          )}
        </button>
      </div>

      <button
        onClick={() => setManualOpen(true)}
        disabled={analyzing}
        className="mx-auto mt-4 min-h-11 px-5 rounded-full text-[14px] font-semibold inline-flex items-center justify-center gap-2 border shadow-sm disabled:opacity-60"
        style={{ color: BROWN_BTN, backgroundColor: '#FFF8EC', borderColor: '#D8B991' }}
      >
        <Keyboard className="h-4 w-4" strokeWidth={1.9} />
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

      {manualOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4"
          onClick={() => setManualOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[28px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-xl"
            style={{ backgroundColor: '#FFF5E5', border: '1px solid #E4C49B' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full" style={{ backgroundColor: '#D8B991' }} />
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#F1D8B7' }}>
                  <Keyboard className="h-5 w-5" style={{ color: BROWN_BTN }} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[18px] font-semibold" style={{ color: BROWN }}>Enter barcode number</h2>
                  <p className="text-[12px] leading-tight mt-0.5" style={{ color: MUTED }}>Use the digits printed below the barcode.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                style={{ color: BROWN_BTN, backgroundColor: '#F6E4CC' }}
                aria-label="Close manual barcode entry"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-[12px] font-semibold mb-2 px-1" style={{ color: BROWN }}>
              Barcode
            </label>
            <div
              className="flex items-center gap-2 rounded-2xl border px-4"
              style={{ backgroundColor: '#FFFDF7', borderColor: '#D8B991' }}
            >
              <Input
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                value={manualBarcode}
                onChange={(event) => setManualBarcode(event.target.value.replace(/\D/g, ''))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onManualSubmit();
                }}
                placeholder="8901234567890"
                className="h-16 flex-1 border-0 bg-transparent px-0 text-[20px] font-semibold tracking-wide text-[#2C1309] caret-[#6B3520] placeholder:text-[#B9A286] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {manualBarcode && (
                <button
                  type="button"
                  onClick={() => setManualBarcode('')}
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#F6E4CC', color: BROWN_BTN }}
                  aria-label="Clear barcode"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-2 px-1 text-[11px]" style={{ color: MUTED }}>
              Usually 8 to 14 digits.
            </div>
            <Button
              type="button"
              onClick={onManualSubmit}
              disabled={!manualBarcode || analyzing}
              className="mt-5 h-14 w-full rounded-full text-white font-semibold disabled:opacity-60"
              style={{ backgroundColor: BROWN_BTN }}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Barcode'}
            </Button>
          </div>
        </div>
      )}
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

const statusCopy: Record<HalalStatus, { title: string; subtitle: string; color: string }> = {
  halal: {
    title: 'Halal Verified',
    subtitle: 'COMPLIANT WITH ISLAMIC STANDARDS',
    color: '#2A8049',
  },
  haram: {
    title: 'Not Halal',
    subtitle: 'CONTAINS PROHIBITED OR HIGH-RISK INGREDIENTS',
    color: '#B3261E',
  },
  mushbooh: {
    title: 'Needs Review',
    subtitle: 'SOME INGREDIENTS REQUIRE VERIFICATION',
    color: '#B07A00',
  },
  unknown: {
    title: 'Unknown Status',
    subtitle: 'BARAKAH AI COULD NOT VERIFY THIS PRODUCT',
    color: '#7C6A4F',
  },
};

const ResultView = ({
  onBack,
  onScanAnother,
  result,
  barcode,
}: {
  onBack: () => void;
  onScanAnother: () => void;
  result: ScanResult | null;
  barcode: string | null;
}) => {
  const status = result?.status || 'unknown';
  const copy = statusCopy[status] || statusCopy.unknown;
  const ingredients = result?.ingredients ?? [];

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
          <div className="text-[19px] font-semibold" style={{ color: copy.color, fontFamily: SERIF }}>
            {copy.title}
          </div>
          <div className="text-[10px] tracking-[0.18em] mt-1" style={{ color: '#8B6E4A' }}>
            {copy.subtitle}
          </div>
          {typeof result?.confidence === 'number' && (
            <div className="text-[12px] mt-2" style={{ color: MUTED }}>
              Confidence {result.confidence}%
            </div>
          )}
        </div>
      </div>

      {/* Product image */}
      <div className="px-5 mt-5 flex justify-center">
        <img
          src={PRODUCT.image}
          alt={result?.product_name || 'Scanned product'}
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
        {result?.product_name || 'Unknown Product'}
      </h2>
      {(result?.brand || barcode) && (
        <p className="px-5 mt-2 text-center text-[13px]" style={{ color: MUTED }}>
          {[result?.brand, barcode ? `Barcode ${barcode}` : null].filter(Boolean).join(' - ')}
        </p>
      )}

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

      {result?.verdict && (
        <p className="px-7 mt-4 text-center text-[14px] leading-relaxed" style={{ color: BROWN }}>
          {result.verdict}
        </p>
      )}

      {/* Detailed ingredients header */}
      <div className="px-5 mt-7 flex items-end justify-between">
        <h3 className="italic text-[22px] leading-tight" style={{ fontFamily: SERIF, color: BROWN }}>
          Detailed<br />Ingredients
        </h3>
        <div className="text-right">
          <div className="text-[18px] font-semibold" style={{ color: BROWN }}>{ingredients.length}</div>
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
                {ingredients[0]?.name || 'Barcode analysis'}
              </div>
            </div>
            <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#A35233' }}>
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
          </div>

          {/* List */}
          <ul className="divide-y" style={{ borderColor: 'rgba(139,90,43,0.15)' }}>
            {ingredients.length === 0 && (
              <li className="py-3 text-[14px]" style={{ color: MUTED }}>
                No ingredient list was returned for this barcode.
              </li>
            )}
            {ingredients.map((ing) => (
              <li key={ing.name} className="flex items-center justify-between py-3">
                <div className="min-w-0 pr-3">
                  <span className="text-[14px] font-medium" style={{ color: BROWN }}>{ing.name}</span>
                  {ing.note && (
                    <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{ing.note}</p>
                  )}
                </div>
                <Check className="h-4 w-4 flex-shrink-0" style={{ color: ing.ok ? '#A35233' : '#B3261E' }} strokeWidth={2.5} />
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
