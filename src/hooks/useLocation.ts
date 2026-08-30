import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position as NativePosition } from '@capacitor/geolocation';

interface LocationData {
  latitude: number;
  longitude: number;
  area?: string;
  city: string;
  country: string;
  fullAddress: string;
  accuracy?: number;
}

interface UseLocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const LOCATION_CACHE_KEY = 'barakah_cached_location';
const LOCATION_CACHE_VERSION = 2;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 0,
};
const isNativeGeolocation = () => Capacitor.isNativePlatform();

const normalizePlaceName = (value?: string | null) =>
  value
    ?.replace(/\s+(district|county|province|state|division|region)$/i, '')
    .trim();

const getAdministrativeName = (data: any, preferredDescriptions: string[]) => {
  const administrative = Array.isArray(data?.localityInfo?.administrative)
    ? data.localityInfo.administrative
    : [];

  return administrative.find((item: any) => {
    const description = String(item.description || '').toLowerCase();
    return preferredDescriptions.includes(description) && item.name;
  })?.name;
};

const resolveReverseGeocodeLocation = (data: any): Pick<LocationData, 'area' | 'city' | 'country' | 'fullAddress'> => {
  const area = normalizePlaceName(
    data.locality ||
    getAdministrativeName(data, ['neighbourhood', 'suburb', 'quarter'])
  );
  const city = normalizePlaceName(
    data.city ||
    getAdministrativeName(data, ['city', 'town', 'municipality']) ||
    data.locality
  ) || 'Unknown';
  const country = data.countryName || 'Unknown';

  return {
    area,
    city,
    country,
    fullAddress: [
      area && area !== city ? area : null,
      city,
      country,
    ].filter(Boolean).join(', '),
  };
};

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCachedLocation = (): LocationData | null => {
    try {
      const cached = localStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        const { data, timestamp, version } = JSON.parse(cached);
        if (version !== LOCATION_CACHE_VERSION) {
          localStorage.removeItem(LOCATION_CACHE_KEY);
          return null;
        }
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch {
      // Ignore cache errors
    }
    return null;
  };

  const cacheLocation = (data: LocationData) => {
    try {
      localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
        version: LOCATION_CACHE_VERSION,
      }));
    } catch {
      // Ignore cache errors
    }
  };

  const buildLocationFromPosition = async (position: GeolocationPosition | NativePosition) => {
    const { latitude, longitude, accuracy } = position.coords;

    try {
      // Use BigDataCloud for reverse geocoding (free, no API key needed)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location details');
      }

      const data = await response.json();
      const geoData = resolveReverseGeocodeLocation(data);

      return {
        latitude,
        longitude,
        ...geoData,
        accuracy,
      };
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      return {
        latitude,
        longitude,
        city: 'Unknown',
        country: 'Unknown',
        fullAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        accuracy,
      };
    }
  };

  const applyPosition = async (position: GeolocationPosition | NativePosition) => {
    const locationData = await buildLocationFromPosition(position);
    setLocation(locationData);
    cacheLocation(locationData);
    setError(null);
    setLoading(false);
  };

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check cache first
    const cached = getCachedLocation();
    if (cached) {
      setLocation(cached);
      setLoading(false);
      return;
    }

    if (isNativeGeolocation()) {
      try {
        const permission = await Geolocation.checkPermissions();
        const finalPermission =
          permission.location === 'granted'
            ? permission
            : await Geolocation.requestPermissions();

        if (finalPermission.location !== 'granted') {
          throw new Error('Location access denied. Please enable location permissions.');
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: POSITION_OPTIONS.timeout,
          maximumAge: POSITION_OPTIONS.maximumAge,
        });
        await applyPosition(position);
      } catch (err) {
        const errorMessage = err instanceof Error && err.message
          ? err.message
          : 'Unable to get your location';
        setError(errorMessage);
        setLoading(false);

        const cached = getCachedLocation();
        if (cached) {
          setLocation(cached);
        }
      }
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyPosition(position);
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
        
        // Try to use cached location as fallback
        const cached = getCachedLocation();
        if (cached) {
          setLocation(cached);
        }
      },
      POSITION_OPTIONS
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    location,
    loading,
    error,
    refresh: fetchLocation
  };
};
