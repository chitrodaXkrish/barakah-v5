import { useState, useEffect, useCallback } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  fullAddress: string;
}

interface UseLocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const LOCATION_CACHE_KEY = 'barakah_cached_location';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCachedLocation = (): LocationData | null => {
    try {
      const cached = localStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
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
        timestamp: Date.now()
      }));
    } catch {
      // Ignore cache errors
    }
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

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    // Use high accuracy for better location
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000 // Accept cached position up to 1 minute old
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Use BigDataCloud for reverse geocoding (free, no API key needed)
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );

          if (!response.ok) {
            throw new Error('Failed to fetch location details');
          }

          const data = await response.json();
          
          const locationData: LocationData = {
            latitude,
            longitude,
            city: data.city || data.locality || data.principalSubdivision || 'Unknown',
            country: data.countryName || 'Unknown',
            fullAddress: [
              data.locality,
              data.city,
              data.principalSubdivision,
              data.countryName
            ].filter(Boolean).join(', ')
          };

          setLocation(locationData);
          cacheLocation(locationData);
          setError(null);
        } catch (err) {
          // Even if reverse geocoding fails, we have coordinates
          const fallbackData: LocationData = {
            latitude,
            longitude,
            city: 'Unknown',
            country: 'Unknown',
            fullAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          };
          setLocation(fallbackData);
          console.error('Reverse geocoding failed:', err);
        }

        setLoading(false);
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
      options
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