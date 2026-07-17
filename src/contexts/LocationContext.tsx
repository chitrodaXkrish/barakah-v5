import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  fullAddress: string;
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
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for fresher data

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCachedLocation = (): LocationData | null => {
    try {
      // First check for manual location
      const manual = localStorage.getItem(MANUAL_LOCATION_KEY);
      if (manual) {
        return JSON.parse(manual);
      }
      
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
    setLoading(true);
    const geoData = await reverseGeocode(lat, lon);
    
    const locationData: LocationData = {
      latitude: lat,
      longitude: lon,
      city: geoData.city || 'Unknown',
      country: geoData.country || 'Unknown',
      fullAddress: geoData.fullAddress || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      isManual: true
    };

    setLocation(locationData);
    cacheLocation(locationData);
    setLoading(false);
    toast.success(`Location set to ${locationData.city}, ${locationData.country}`);
  };

  const clearManualLocation = () => {
    localStorage.removeItem(MANUAL_LOCATION_KEY);
    fetchLocation();
  };

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check for manual location first
    const manualLocation = localStorage.getItem(MANUAL_LOCATION_KEY);
    if (manualLocation) {
      setLocation(JSON.parse(manualLocation));
      setLoading(false);
      return;
    }

    // Check cache
    const cached = getCachedLocation();
    if (cached && !cached.isManual) {
      setLocation(cached);
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    // Use highest accuracy settings
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0 // Always get fresh location
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        console.log(`Location accuracy: ${accuracy} meters`);

        const geoData = await reverseGeocode(latitude, longitude);
        
        const locationData: LocationData = {
          latitude,
          longitude,
          city: geoData.city || 'Unknown',
          country: geoData.country || 'Unknown',
          fullAddress: geoData.fullAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          isManual: false
        };

        setLocation(locationData);
        cacheLocation(locationData);
        setError(null);
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
        
        // Try to use any cached location as fallback
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
