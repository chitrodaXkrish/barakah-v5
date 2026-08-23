import { Layout } from '@/components/Layout';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, MapPin, Rotate3D } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
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

const KAABA = { lat: 21.4224779, lng: 39.8251832 };
const HEADING_SMOOTHING_GOOD = 0.2;
const HEADING_SMOOTHING_LOW_CONFIDENCE = 0.1;
const HEADING_DEADBAND_DEGREES = 1.25;
const IOS_MAX_COMPASS_ACCURACY = 45;
const LOW_CONFIDENCE_COMPASS_ACCURACY = 35;
const SPIKE_REJECTION_DEGREES = 95;
const SPIKE_REJECTION_MS = 350;
const MECCA = KAABA;
const COMPASS_CALIBRATION_MESSAGE = 'Move your phone in a figure-8 to calibrate the compass.';

const normalizeDegrees = (deg: number) => ((deg % 360) + 360) % 360;
const shortestAngleDelta = (from: number, to: number) => ((to - from + 540) % 360) - 180;

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

const toRad = (deg: number) => (deg * Math.PI) / 180;

function accurateQiblaBearing(lat: number, lng: number) {
  const fromLat = toRad(lat);
  const toLat = toRad(KAABA.lat);
  const deltaLng = toRad(KAABA.lng - lng);
  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);
  return normalizeDegrees((Math.atan2(y, x) * 180) / Math.PI);
}

function accurateGreatCircleKm(lat: number, lng: number) {
  const earthRadiusKm = 6371.0088;
  const fromLat = toRad(lat);
  const toLat = toRad(KAABA.lat);
  const deltaLat = toRad(KAABA.lat - lat);
  const deltaLng = toRad(KAABA.lng - lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;
  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function screenOrientationAngle() {
  const screenAngle = window.screen?.orientation?.angle;
  if (typeof screenAngle === 'number') return screenAngle;
  const legacyOrientation = (window as any).orientation;
  return typeof legacyOrientation === 'number' ? legacyOrientation : 0;
}

function cardinal(deg: number) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export const Qibla = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { location, loading: locLoading } = useGlobalLocation();
  const [heading, setHeading] = useState<number | null>(null);
  const [headingAccuracy, setHeadingAccuracy] = useState<number | null>(null);
  const [orientationGranted, setOrientationGranted] = useState(false);
  const [showCalibrationPopup, setShowCalibrationPopup] = useState(true);
  const cleanupOrientationRef = useRef<(() => void) | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);
  const lastHeadingAtRef = useRef(0);

  const qibla = useMemo(
    () => (location ? accurateQiblaBearing(location.latitude, location.longitude) : 0),
    [location]
  );
  const distanceKm = useMemo(
    () => (location ? accurateGreatCircleKm(location.latitude, location.longitude) : 0),
    [location]
  );

  const shouldShowCalibration = typeof headingAccuracy !== 'number' || headingAccuracy < 0 || headingAccuracy > IOS_MAX_COMPASS_ACCURACY;
  const relativeQibla = normalizeDegrees(qibla - (heading ?? 0));
  const dialAngle = relativeQibla;

  const getTrueNorthHeading = useCallback((event: DeviceOrientationEvent) => {
    const anyEvent = event as any;

    if (typeof anyEvent.webkitCompassHeading === 'number') {
      return {
        heading: normalizeDegrees(anyEvent.webkitCompassHeading),
        accuracy: typeof anyEvent.webkitCompassAccuracy === 'number' ? anyEvent.webkitCompassAccuracy : null,
      };
    }

    const hasAbsoluteHeading = event.type === 'deviceorientationabsolute' || event.absolute !== false;
    if (typeof event.alpha === 'number' && hasAbsoluteHeading) {
      return {
        heading: normalizeDegrees(360 - event.alpha + screenOrientationAngle()),
        accuracy: typeof anyEvent.webkitCompassAccuracy === 'number' ? anyEvent.webkitCompassAccuracy : null,
      };
    }

    return null;
  }, []);

  const attachOrientation = useCallback(() => {
    cleanupOrientationRef.current?.();

    const handler = (event: DeviceOrientationEvent) => {
      const reading = getTrueNorthHeading(event);
      if (!reading) return;

      const { heading, accuracy } = reading;
      const previous = smoothedHeadingRef.current;
      const now = Date.now();

      if (previous === null) {
        smoothedHeadingRef.current = heading;
        lastHeadingAtRef.current = now;
        setHeading(heading);
        setHeadingAccuracy(accuracy);
        return;
      }

      const rawDelta = shortestAngleDelta(previous, heading);
      const lowConfidence =
        typeof accuracy === 'number' &&
        (accuracy < 0 || accuracy > LOW_CONFIDENCE_COMPASS_ACCURACY);

      if (
        lowConfidence &&
        Math.abs(rawDelta) > SPIKE_REJECTION_DEGREES &&
        now - lastHeadingAtRef.current < SPIKE_REJECTION_MS
      ) {
        setHeading(previous);
        setHeadingAccuracy(accuracy);
        return;
      }

      if (Math.abs(rawDelta) < HEADING_DEADBAND_DEGREES) {
        setHeading(previous);
        setHeadingAccuracy(accuracy);
        return;
      }

      const smoothing = lowConfidence ? HEADING_SMOOTHING_LOW_CONFIDENCE : HEADING_SMOOTHING_GOOD;
      const smoothed = normalizeDegrees(previous + rawDelta * smoothing);
      smoothedHeadingRef.current = smoothed;
      lastHeadingAtRef.current = now;
      setHeading(smoothed);
      setHeadingAccuracy(accuracy);
    };

    window.addEventListener('deviceorientationabsolute', handler, true);
    window.addEventListener('deviceorientation', handler, true);

    const cleanup = () => {
      window.removeEventListener('deviceorientationabsolute', handler, true);
      window.removeEventListener('deviceorientation', handler, true);
    };

    cleanupOrientationRef.current = cleanup;
    return cleanup;
  }, [getTrueNorthHeading]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowCalibrationPopup(false), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const DOE: any = (window as any).DeviceOrientationEvent;
    if (!DOE) {
      setOrientationGranted(false);
      return;
    }

    if (typeof DOE.requestPermission === 'function') {
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
        if (res !== 'granted') {
          toast.error('Motion access denied');
          return;
        }
      }

      setOrientationGranted(true);
      smoothedHeadingRef.current = null;
      lastHeadingAtRef.current = 0;
      setHeading(null);
      setHeadingAccuracy(null);
      attachOrientation();
      toast.success('Compass enabled');
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
        {showCalibrationPopup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-8 pointer-events-none">
            <div
              className="flex max-w-[280px] flex-col items-center gap-3 rounded-2xl px-5 py-4 text-center shadow-2xl"
              style={{ background: 'rgba(92, 42, 18, 0.94)', color: '#FFF7E8' }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: 'rgba(255, 245, 229, 0.16)' }}
              >
                <Rotate3D className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold leading-snug">
                Move your phone in a figure-8 to calibrate the compass.
              </div>
            </div>
          </div>
        )}

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
              className="absolute inset-0 transition-transform duration-200 ease-out"
              style={{ transform: `rotate(${dialAngle}deg)` }}
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
              {t('qibla.distance')}:{' '}
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
                {t('qibla.current_location')}:{' '}
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

          {shouldShowCalibration && (
            <p className="mt-3 text-xs text-center px-8" style={{ color: BROWN }}>
              {COMPASS_CALIBRATION_MESSAGE}
            </p>
          )}

          <p className="mt-4 mb-10 text-xs text-center px-8" style={{ color: '#9a7c63' }}>
            Hold your phone flat. Rotate until the mosque icon points straight up — that direction is the Qibla.
          </p>
        </div>
      </div>
    </Layout>
  );
};
