import { Layout } from '@/components/Layout';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalLocation } from '@/contexts/LocationContext';
import { toast } from 'sonner';
import mosqueIcon from '@/assets/qibla-mosque-icon.png.asset.json';
import { assetUrl } from '@/lib/assetUrl';

// Theme tokens
const CREAM = '#FFF5E5';
const DIAL = '#FBE7C7';
const RING = '#E7CFA8';
const BROWN_DEEP = '#5C2A12';
const BROWN = '#A35233';
const ORANGE = '#CE5728';

const MECCA = { lat: 21.422487, lng: 39.826206 };
const HEADING_SMOOTHING = 0.08;
const HEADING_DEADBAND_DEGREES = 2.5;
const MIN_HEADING_UPDATE_MS = 120;
const IOS_MAX_COMPASS_ACCURACY = 35;

const normalizeDegrees = (deg: number) => ((deg % 360) + 360) % 360;
const shortestAngleDelta = (from: number, to: number) => ((to - from + 540) % 360) - 180;
const circularMean = (values: number[]) => {
  const total = values.reduce(
    (acc, value) => {
      const rad = (value * Math.PI) / 180;
      return {
        sin: acc.sin + Math.sin(rad),
        cos: acc.cos + Math.cos(rad),
      };
    },
    { sin: 0, cos: 0 }
  );

  return normalizeDegrees((Math.atan2(total.sin, total.cos) * 180) / Math.PI);
};

function qiblaBearing(lat: number, lng: number) {
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (MECCA.lat * Math.PI) / 180;
  const Δλ = ((MECCA.lng - lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

function greatCircleKm(lat: number, lng: number) {
  const R = 6371;
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (MECCA.lat * Math.PI) / 180;
  const Δφ = ((MECCA.lat - lat) * Math.PI) / 180;
  const Δλ = ((MECCA.lng - lng) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function cardinal(deg: number) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export const Qibla = () => {
  const navigate = useNavigate();
  const { location, loading: locLoading } = useGlobalLocation();
  const [heading, setHeading] = useState<number | null>(null);
  const [displayAngle, setDisplayAngle] = useState(0);
  const [orientationGranted, setOrientationGranted] = useState(false);
  const cleanupOrientationRef = useRef<(() => void) | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);
  const headingSamplesRef = useRef<number[]>([]);
  const lastHeadingUpdateRef = useRef(0);
  const lastAbsoluteEventRef = useRef(0);

  const qibla = useMemo(
    () => (location ? qiblaBearing(location.latitude, location.longitude) : 0),
    [location]
  );
  const distanceKm = useMemo(
    () => (location ? greatCircleKm(location.latitude, location.longitude) : 0),
    [location]
  );

  // Bearing of mosque icon on dial: qibla relative to device north.
  const dialAngle = normalizeDegrees(heading !== null ? qibla - heading : qibla);

  useEffect(() => {
    setDisplayAngle((current) => current + shortestAngleDelta(normalizeDegrees(current), dialAngle));
  }, [dialAngle]);

  const attachOrientation = useCallback(() => {
    cleanupOrientationRef.current?.();
    const handler = (e: DeviceOrientationEvent) => {
      // webkitCompassHeading on iOS gives true compass heading (clockwise from N)
      const anyE = e as any;
      const now = performance.now();
      let h: number | null = null;
      if (typeof anyE.webkitCompassHeading === 'number' && (typeof anyE.webkitCompassAccuracy !== 'number' || anyE.webkitCompassAccuracy <= IOS_MAX_COMPASS_ACCURACY)) {
        h = anyE.webkitCompassHeading;
        lastAbsoluteEventRef.current = now;
      } else if (e.type === 'deviceorientationabsolute' && e.alpha !== null) {
        h = 360 - e.alpha;
        lastAbsoluteEventRef.current = now;
      } else if (e.alpha !== null && e.absolute !== false && now - lastAbsoluteEventRef.current > 1500) {
        // alpha: 0 when facing N if absolute; convert (counter-clockwise) to clockwise heading
        h = 360 - e.alpha;
      }
      if (h === null) return;

      const next = normalizeDegrees(h);
      const samples = [...headingSamplesRef.current, next].slice(-5);
      headingSamplesRef.current = samples;
      const averaged = circularMean(samples);
      const previous = smoothedHeadingRef.current;
      if (previous === null) {
        smoothedHeadingRef.current = averaged;
        lastHeadingUpdateRef.current = now;
        setHeading(averaged);
        return;
      }

      const rawDelta = shortestAngleDelta(previous, averaged);
      if (Math.abs(rawDelta) < HEADING_DEADBAND_DEGREES) return;

      const smoothed = normalizeDegrees(previous + rawDelta * HEADING_SMOOTHING);
      if (now - lastHeadingUpdateRef.current < MIN_HEADING_UPDATE_MS) {
        smoothedHeadingRef.current = smoothed;
        return;
      }

      smoothedHeadingRef.current = smoothed;
      lastHeadingUpdateRef.current = now;
      setHeading(smoothed);
    };
    window.addEventListener('deviceorientationabsolute' as any, handler, true);
    window.addEventListener('deviceorientation', handler, true);
    const cleanup = () => {
      window.removeEventListener('deviceorientationabsolute' as any, handler, true);
      window.removeEventListener('deviceorientation', handler, true);
    };
    cleanupOrientationRef.current = cleanup;
    return cleanup;
  }, []);

  useEffect(() => {
    const DOE: any = (window as any).DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      // iOS – wait for user gesture
      return;
    }
    setOrientationGranted(true);
    const cleanup = attachOrientation();
    return cleanup;
  }, [attachOrientation]);

  useEffect(() => {
    return () => cleanupOrientationRef.current?.();
  }, []);

  const requestOrientation = async () => {
    const DOE: any = (window as any).DeviceOrientationEvent;
    try {
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission();
        if (res === 'granted') {
          setOrientationGranted(true);
          smoothedHeadingRef.current = null;
          headingSamplesRef.current = [];
          lastHeadingUpdateRef.current = 0;
          lastAbsoluteEventRef.current = 0;
          attachOrientation();
          toast.success('Compass enabled');
        } else {
          toast.error('Motion access denied');
        }
      }
    } catch {
      toast.error('Compass unavailable on this device');
    }
  };

  const card = cardinal(qibla);

  // Compass dial ticks
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: CREAM }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <button
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="h-10 w-10 flex items-center justify-center"
          >
            <ArrowLeft className="h-6 w-6" style={{ color: BROWN }} />
          </button>
          <h1
            className="text-xl italic"
            style={{ color: BROWN, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Qibla Finder
          </h1>
          <div className="h-10 w-10" />
        </div>

        {/* Compass dial */}
        <div className="px-6 pt-6 flex flex-col items-center">
          <div
            className="relative"
            style={{
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: `radial-gradient(circle at 50% 45%, ${DIAL} 0%, ${DIAL} 70%, ${RING} 100%)`,
              boxShadow: `inset 0 0 0 6px ${RING}, 0 12px 30px -16px rgba(92,42,18,0.35)`,
            }}
          >
            {/* Ticks */}
            {ticks.map((angle) => {
              const isCardinal = angle % 90 === 0;
              return (
                <div
                  key={angle}
                  className="absolute left-1/2 top-0"
                  style={{
                    height: '100%',
                    transformOrigin: '50% 50%',
                    transform: `translateX(-50%) rotate(${angle}deg)`,
                  }}
                >
                  <div
                    style={{
                      width: isCardinal ? 3 : 2,
                      height: isCardinal ? 18 : 10,
                      marginTop: 14,
                      background: isCardinal ? BROWN : RING,
                      borderRadius: 2,
                    }}
                  />
                </div>
              );
            })}

            {/* Needle + Mosque icon rotated to Qibla */}
            <div
              className="absolute inset-0 transition-transform duration-500 ease-out"
              style={{ transform: `rotate(${displayAngle}deg)` }}
            >
              {/* Needle line from center up */}
              <div
                className="absolute left-1/2 top-1/2"
                style={{
                  width: 3,
                  height: 110,
                  background: `linear-gradient(to top, ${BROWN}, ${ORANGE})`,
                  borderRadius: 2,
                  transformOrigin: 'top center',
                  transform: 'translate(-50%, -100%)',
                }}
              />
              {/* Mosque marker at needle tip */}
              <div
                className="absolute left-1/2"
                style={{
                  top: 26,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <img
                  src={assetUrl(mosqueIcon)}
                  alt="Mosque"
                  className="block"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            </div>

            {/* Center hub */}
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: 18,
                height: 18,
                background: '#fff',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 0 3px ${RING}, 0 2px 4px rgba(0,0,0,0.15)`,
              }}
            />
          </div>

          {/* Degree + cardinal */}
          <div className="mt-12 text-center">
            <div
              className="font-bold"
              style={{ color: BROWN_DEEP, fontSize: 44, lineHeight: 1 }}
            >
              {qibla.toFixed(1)}° <span style={{ color: BROWN }}>{card}</span>
            </div>
            <div
              className="mx-auto mt-3"
              style={{ width: 48, height: 2, background: RING, borderRadius: 2 }}
            />
          </div>

          {/* Distance + location */}
          <div className="mt-6 text-center space-y-2">
            <div className="text-base" style={{ color: BROWN_DEEP }}>
              Distance:{' '}
              <span className="font-bold" style={{ color: BROWN }}>
                {locLoading ? '—' : `${distanceKm.toLocaleString()} km`}
              </span>
            </div>
            <div
              className="flex items-center justify-center gap-1.5 text-sm"
              style={{ color: '#7a5a44' }}
            >
              <MapPin className="h-4 w-4" />
              <span>
                Current Location:{' '}
                {location
                  ? `${location.area || location.city}${location.country ? ', ' + location.country : ''}`
                  : locLoading
                    ? 'Locating…'
                    : 'Unknown'}
              </span>
            </div>
          </div>

          {!orientationGranted && (
            <button
              onClick={requestOrientation}
              className="mt-8 text-xs underline"
              style={{ color: BROWN }}
            >
              Enable compass sensor
            </button>
          )}

          <p className="mt-4 mb-10 text-xs text-center px-8" style={{ color: '#9a7c63' }}>
            Hold your phone flat. Rotate until the mosque icon points straight up — that direction is the Qibla.
          </p>
        </div>
      </div>
    </Layout>
  );
};
