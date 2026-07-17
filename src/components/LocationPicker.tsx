import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, X, Loader2, Navigation } from 'lucide-react';
import { useGlobalLocation } from '@/contexts/LocationContext';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationPicker = ({ isOpen, onClose }: LocationPickerProps) => {
  const { setManualLocation, clearManualLocation, location } = useGlobalLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = (await res.json()) as NominatimResult[];
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (!isOpen) return null;

  const pick = async (r: NominatimResult) => {
    await setManualLocation(parseFloat(r.lat), parseFloat(r.lon));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(44,19,9,0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FFF5E5] rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-bold" style={{ color: '#2C1309', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Change Location
          </h2>
          <button onClick={onClose} className="p-1 rounded-full" aria-label="Close">
            <X className="h-5 w-5" style={{ color: '#2C1309' }} />
          </button>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
          style={{ background: '#fff', borderColor: '#E8D5C4' }}
        >
          <Search className="h-4 w-4" style={{ color: '#8B5A3C' }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, country..."
            className="flex-1 bg-transparent outline-none text-[14px]"
            style={{ color: '#2C1309' }}
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#8B5A3C' }} />}
        </div>

        <div className="mt-3 overflow-y-auto flex-1">
          {query.trim().length < 2 && (
            <>
              {location?.isManual && (
                <button
                  onClick={() => {
                    clearManualLocation();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-2"
                  style={{ background: '#FFE8CA' }}
                >
                  <Navigation className="h-4 w-4" style={{ color: '#B0431E' }} />
                  <span className="text-[13px] font-semibold" style={{ color: '#2C1309' }}>
                    Use my current location (GPS)
                  </span>
                </button>
              )}
              <p className="text-[12px] px-1" style={{ color: '#8B5A3C' }}>
                Type at least 2 characters to search for a city or country.
              </p>
            </>
          )}

          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <p className="text-[13px] px-1 py-3" style={{ color: '#8B5A3C' }}>
              No results found. Try a different search.
            </p>
          )}

          <ul className="space-y-1.5">
            {results.map((r) => {
              const city = r.address?.city || r.address?.town || r.address?.village || r.address?.state || '';
              const country = r.address?.country || '';
              return (
                <li key={r.place_id}>
                  <button
                    onClick={() => pick(r)}
                    className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-transform active:scale-[0.99]"
                    style={{ background: '#fff', borderColor: 'rgba(232,213,196,0.86)' }}
                  >
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#B0431E' }} />
                    <div className="min-w-0">
                      {(city || country) && (
                        <p className="text-[14px] font-semibold truncate" style={{ color: '#2C1309' }}>
                          {[city, country].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <p className="text-[11px] leading-snug" style={{ color: '#8B5A3C' }}>
                        {r.display_name}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};