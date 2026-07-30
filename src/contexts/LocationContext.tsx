import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  fullAddress: string;
  accuracy?: number;
  updatedAt?: number;
  isManual?: boolean;
}

interface LocationContextType {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setManualLocation: (lat: number, lon: number) => Promise<void>;
  clearManualLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LOCATION_CACHE_KEY = 'barakah_cached_location';
const MANUAL_LOCATION_KEY = 'barakah_manual_location';
const CACHE_DURATION = 10 * 60 * 1000;
const LOCATION_CHANGE_THRESHOLD_KM = 0.15;
const WATCH_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 30000,
};

const normalizeLocation = (value: unknown): LocationData | null => {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Partial<LocationData> & {
    lat?: number | string;
    lon?: number | string;
    lng?: number | string;
  };
  const latitude = Number(raw.latitude ?? raw.lat);
  const longitude = Number(raw.longitude ?? raw.lon ?? raw.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    city: raw.city || 'Unknown',
    country: raw.country || 'Unknown',
    fullAddress: raw.fullAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    accuracy: typeof raw.accuracy === 'number' ? raw.accuracy : undefined,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : undefined,
    isManual: raw.isManual,
  };
};

const parseStoredLocation = (key: string): LocationData | null => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? normalizeLocation(JSON.parse(stored)) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationRef = useRef<LocationData | null>(null);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const getCachedLocation = (): LocationData | null => {
    try {
      // First check for manual location
      const manual = parseStoredLocation(MANUAL_LOCATION_KEY);
      if (manual) return manual;
      
      const cached = localStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const parsed = normalizeLocation(data);
        if (parsed && Date.now() - timestamp < CACHE_DURATION) {
          return parsed;
        }
        localStorage.removeItem(LOCATION_CACHE_KEY);
      }
    } catch {
      // Ignore cache errors
    }
    return null;
  };

  const cacheLocation = (data: LocationData) => {
    try {
      if (data.isManual) {
        localStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify(data));
      } else {
        localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    } catch {
      // Ignore cache errors
    }
  };

  const buildLocationData = useCallback(async (
    latitude: number,
    longitude: number,
    accuracy?: number,
    isManual = false
  ): Promise<LocationData> => {
    const geoData = await reverseGeocode(latitude, longitude);

    return {
      latitude,
      longitude,
      city: geoData.city || 'Unknown',
      country: geoData.country || 'Unknown',
      fullAddress: geoData.fullAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      accuracy,
      updatedAt: Date.now(),
      isManual,
    };
  }, []);

  const shouldUpdateLocation = (current: LocationData | null, next: LocationData) => {
    if (!current || current.isManual) return true;

    const movedKm = calculateDistanceKm(
      current.latitude,
      current.longitude,
      next.latitude,
      next.longitude
    );
    const currentAccuracy = current.accuracy ?? Number.POSITIVE_INFINITY;
    const nextAccuracy = next.accuracy ?? Number.POSITIVE_INFINITY;

    return movedKm >= LOCATION_CHANGE_THRESHOLD_KM || nextAccuracy + 25 < currentAccuracy;
  };

  const applyPosition = useCallback(async (position: GeolocationPosition, source: 'initial' | 'watch') => {
    const { latitude, longitude, accuracy } = position.coords;
    const locationData = await buildLocationData(latitude, longitude, accuracy, false);

    if (source === 'initial' || shouldUpdateLocation(locationRef.current, locationData)) {
      setLocation(locationData);
      cacheLocation(locationData);
    }

    setError(null);
    setLoading(false);
  }, [buildLocationData]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        applyPosition(position, 'watch').catch(() => {
          // Keep the last known location if a background refresh fails.
        });
      },
      () => {
        // watchPosition can fail intermittently; the visible error is handled by refresh.
      },
      WATCH_POSITION_OPTIONS
    );
  }, [applyPosition]);

  const reverseGeocode = async (latitude: number, longitude: number): Promise<Partial<LocationData>> => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location details');
      }

      const data = await response.json();
      
      return {
        city: data.city || data.locality || data.principalSubdivision || 'Unknown',
        country: data.countryName || 'Unknown',
        fullAddress: [
          data.locality,
          data.city,
          data.principalSubdivision,
          data.countryName
        ].filter(Boolean).join(', ')
      };
    } catch {
      return {
        city: 'Unknown',
        country: 'Unknown',
        fullAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      };
    }
  };

  const setManualLocation = async (lat: number, lon: number) => {
    stopTracking();
    setLoading(true);
    const locationData = await buildLocationData(lat, lon, undefined, true);

    setLocation(locationData);
    cacheLocation(locationData);
    setLoading(false);
    toast.success(`Location set to ${locationData.city}, ${locationData.country}`);
  };

  const clearManualLocation = () => {
    localStorage.removeItem(MANUAL_LOCATION_KEY);
    setLocation(null);
    fetchLocation();
  };

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check for manual location first
    const manualLocation = parseStoredLocation(MANUAL_LOCATION_KEY);
    if (manualLocation) {
      stopTracking();
      setLocation(manualLocation);
      setLoading(false);
      return;
    }

    // Check cache
    const cached = getCachedLocation();
    if (cached && !cached.isManual) {
      setLocation(cached);
      setLoading(false);
      startTracking();
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyPosition(position, 'initial')
          .then(startTracking)
          .catch(() => {
            setError('Location found, but details could not be loaded. Please try again.');
            setLoading(false);
          });
      },
      (err) => {
        let errorMessage = 'Unable to get your location';
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please try again.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }

        setError(errorMessage);
        setLoading(false);
        
        // Try to use any cached location as fallback
        const cached = getCachedLocation();
        if (cached) {
          setLocation(cached);
          startTracking();
        }
      },
      WATCH_POSITION_OPTIONS
    );
  }, [applyPosition, startTracking, stopTracking]);

  useEffect(() => {
    fetchLocation();
    return stopTracking;
  }, [fetchLocation, stopTracking]);

  return (
    <LocationContext.Provider value={{
      location,
      loading,
      error,
      refresh: fetchLocation,
      setManualLocation,
      clearManualLocation
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useGlobalLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useGlobalLocation must be used within a LocationProvider');
  }
  return context;
};
