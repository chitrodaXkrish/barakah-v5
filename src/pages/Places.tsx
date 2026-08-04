import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, MapPin, Loader2, AlertCircle, RefreshCw, Settings2, LocateFixed, ArrowRight, Star } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useGlobalLocation } from '@/contexts/LocationContext';
import restaurantImg from '@/assets/place-restaurant.jpg';
import mosqueImg from '@/assets/place-mosque.jpg';
import { openExternalUrl } from '@/lib/externalUrl';

// Theme tokens matching Guftagu redesign
const CREAM_BG = '#FFF5E5';
const CREAM_DEEP = '#F5E6D0';
const HEADER_TEXT = '#2C1309';
const BROWN = '#7B3F1E';
const BROWN_DARK = '#5C2E15';
const SOFT_BORDER = '#E8D2A8';
const MUTED_TEXT = '#8B6E4A';

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type PlaceType = 'mosque' | 'restaurant';
const PLACES_CACHE_VERSION = 7;
const PLACES_CACHE_DURATION_MS = 6 * 60 * 60 * 1000;
const OVERPASS_TIMEOUT_MS = 6500;
const NOMINATIM_TIMEOUT_MS = 6000;
const SEARCH_RADII: Record<PlaceType, number[]> = {
  mosque: [8000, 15000, 30000],
  restaurant: [5000, 10000, 20000],
};

interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance?: number;
  address?: string;
  type: PlaceType;
}

type PlacesCacheEntry = {
  version: number;
  savedAt: number;
  places: Place[];
};

export const Places = () => {
  const { location: userLocation, loading: locationLoading, error: locationError, refresh: refreshLocation, setManualLocation, clearManualLocation } = useGlobalLocation();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [placeType, setPlaceType] = useState<PlaceType>('mosque');
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [searchingCity, setSearchingCity] = useState(false);
  const [restaurantFilter, setRestaurantFilter] = useState<'Nearest' | 'Open Now' | 'Top Rated' | 'Turkish'>('Nearest');
  const searchRunRef = useRef(0);

  const placesCacheKey = (lat: number, lon: number, type: PlaceType) => {
    const roundedLat = lat.toFixed(3);
    const roundedLon = lon.toFixed(3);
    return `barakah_places_v${PLACES_CACHE_VERSION}_${type}_${roundedLat}_${roundedLon}`;
  };

  const readPlacesCache = (lat: number, lon: number, type: PlaceType, options?: { allowExpired?: boolean }) => {
    try {
      const raw = localStorage.getItem(placesCacheKey(lat, lon, type));
      if (!raw) return null;
      const entry = JSON.parse(raw) as PlacesCacheEntry;
      if (
        entry.version !== PLACES_CACHE_VERSION ||
        !Array.isArray(entry.places)
      ) {
        localStorage.removeItem(placesCacheKey(lat, lon, type));
        return null;
      }
      if (!options?.allowExpired && Date.now() - entry.savedAt > PLACES_CACHE_DURATION_MS) {
        return null;
      }
      return entry.places;
    } catch {
      return null;
    }
  };

  const writePlacesCache = (lat: number, lon: number, type: PlaceType, nextPlaces: Place[]) => {
    try {
      const entry: PlacesCacheEntry = {
        version: PLACES_CACHE_VERSION,
        savedAt: Date.now(),
        places: nextPlaces,
      };
      localStorage.setItem(placesCacheKey(lat, lon, type), JSON.stringify(entry));
    } catch {
      // Ignore storage quota or private browsing failures.
    }
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const currentLocationLabel = () => {
    const parts = [
      userLocation?.area,
      userLocation?.city,
      userLocation?.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const fallbackAddress = (lat: number, lon: number) => {
    const locationLabel = currentLocationLabel();
    return locationLabel || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  };

  const compactAddressParts = (parts: Array<string | number | undefined | null>) => {
    const seen = new Set<string>();
    return parts
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .filter((part) => {
        const key = part.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4)
      .join(', ');
  };

  const nominatimAddressLine = (item: any, lat: number, lon: number) => {
    const address = item.address || {};
    const compact = compactAddressParts([
      address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road,
      address.suburb || address.neighbourhood || address.quarter || address.city_district || address.borough,
      address.city || address.town || address.village || address.municipality || address.county,
      address.state,
      address.country,
    ]);
    return compact || item.display_name || fallbackAddress(lat, lon);
  };

  const overpassAddressLine = (tags: Record<string, string | undefined> = {}, lat: number, lon: number) => {
    const streetLine = compactAddressParts([
      tags['addr:housenumber'],
      tags['addr:street'],
    ]);
    const compact = compactAddressParts([
      tags['addr:full'],
      streetLine,
      tags['addr:place'],
      tags['addr:neighbourhood'] || tags['addr:suburb'] || tags['addr:quarter'] || tags['addr:city_district'],
      tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:municipality'] || tags['addr:county'],
      tags['addr:state'],
      tags['addr:postcode'],
    ]);
    return compact || fallbackAddress(lat, lon);
  };

  // Search for city coordinates
  const searchCity = async () => {
    if (!citySearch.trim()) return;
    
    setSearchingCity(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(citySearch)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, address, display_name } = data[0];
        const area = address?.suburb || address?.neighbourhood || address?.quarter || address?.borough || address?.city_district;
        const city = address?.city || address?.town || address?.village || address?.municipality || address?.county || address?.state;
        await setManualLocation(parseFloat(lat), parseFloat(lon), {
          area,
          city,
          country: address?.country,
          fullAddress: display_name,
        });
        setLocationDialogOpen(false);
        setCitySearch('');
      } else {
        toast.error('City not found. Please try a different search.');
      }
    } catch (error) {
      toast.error('Failed to search for city. Please try again.');
    } finally {
      setSearchingCity(false);
    }
  };

  // Set manual coordinates
  const handleManualCoordinates = async () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      toast.error('Please enter valid coordinates');
      return;
    }
    
    await setManualLocation(lat, lon);
    setLocationDialogOpen(false);
    setManualLat('');
    setManualLon('');
  };

  // Use current GPS location
  const useCurrentLocation = () => {
    clearManualLocation();
    setLocationDialogOpen(false);
  };

  // Overpass API endpoints (fallback servers)
  const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  // Build Overpass query based on place type
  const buildOverpassQuery = (lat: number, lon: number, radius: number, type: PlaceType) => {
    if (type === 'mosque') {
      return `
        [out:json][timeout:8];
        (
          node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lon});
          node["amenity"="place_of_worship"]["denomination"="sunni"](around:${radius},${lat},${lon});
          node["amenity"="place_of_worship"]["denomination"="shia"](around:${radius},${lat},${lon});
          node["building"="mosque"](around:${radius},${lat},${lon});
          way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lon});
          way["amenity"="place_of_worship"]["denomination"="sunni"](around:${radius},${lat},${lon});
          way["amenity"="place_of_worship"]["denomination"="shia"](around:${radius},${lat},${lon});
          way["building"="mosque"](around:${radius},${lat},${lon});
        );
        out tags center qt 60;
      `;
    } else {
      return `
        [out:json][timeout:8];
        (
          node["amenity"~"restaurant|fast_food|cafe"](around:${radius},${lat},${lon});
          way["amenity"~"restaurant|fast_food|cafe"](around:${radius},${lat},${lon});
          node["amenity"~"restaurant|fast_food|cafe"]["diet:halal"="yes"](around:${radius},${lat},${lon});
          way["amenity"~"restaurant|fast_food|cafe"]["diet:halal"="yes"](around:${radius},${lat},${lon});
          node["amenity"~"restaurant|fast_food|cafe"]["halal"="yes"](around:${radius},${lat},${lon});
          way["amenity"~"restaurant|fast_food|cafe"]["halal"="yes"](around:${radius},${lat},${lon});
          node["amenity"~"restaurant|fast_food|cafe"]["cuisine"~"halal|indian|pakistani|middle_eastern|arabic|turkish|kebab|afghan|persian|lebanese|moroccan",i](around:${radius},${lat},${lon});
          way["amenity"~"restaurant|fast_food|cafe"]["cuisine"~"halal|indian|pakistani|middle_eastern|arabic|turkish|kebab|afghan|persian|lebanese|moroccan",i](around:${radius},${lat},${lon});
        );
        out tags center qt 100;
      `;
    }
  };

  const fetchOverpassServer = async (server: string, query: string, signal?: AbortSignal): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });

    try {
      const response = await fetch(server, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server ${server} returned ${response.status}`);
      }

      return await response.json();
    } finally {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abort);
    }
  };

  // Race mirrors so a slow Overpass server does not block the whole search.
  const fetchWithRetry = async (query: string, signal?: AbortSignal): Promise<any> => {
    if (signal?.aborted) throw new DOMException('Search aborted', 'AbortError');
    return Promise.any(OVERPASS_SERVERS.map((server) => fetchOverpassServer(server, query, signal)));
  };

  const fetchNominatimQuery = async (
    query: string,
    lat: number,
    lon: number,
    radius: number,
    signal?: AbortSignal
  ): Promise<any[]> => {
    const latDelta = radius / 111320;
    const lonDelta = radius / (111320 * Math.max(0.25, Math.cos(lat * Math.PI / 180)));
    const viewbox = [
      lon - lonDelta,
      lat + latDelta,
      lon + lonDelta,
      lat - latDelta,
    ].join(',');
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&limit=30&bounded=1&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(query)}`,
        {
          headers: { 'Accept-Language': 'en' },
          signal: controller.signal,
        }
      );

      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    } finally {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abort);
    }
  };

  const fetchFallbackPlaces = async (
    lat: number,
    lon: number,
    type: PlaceType,
    radius: number,
    signal?: AbortSignal
  ): Promise<Place[]> => {
    const queries = type === 'mosque'
      ? ['mosque', 'masjid']
      : ['halal restaurant', 'halal food', 'kebab restaurant', 'biryani restaurant', 'restaurant'];

    const settled = await Promise.allSettled(
      queries.map((query) => fetchNominatimQuery(query, lat, lon, radius, signal))
    );
    if (signal?.aborted) return [];

    const seen = new Set<string>();
    return settled
      .flatMap((result) => result.status === 'fulfilled' ? result.value : [])
      .map((item: any): Place | null => {
        const elLat = parseFloat(item.lat);
        const elLon = parseFloat(item.lon);
        if (!Number.isFinite(elLat) || !Number.isFinite(elLon)) return null;

        const distance = calculateDistance(lat, lon, elLat, elLon);
        if (distance * 1000 > radius * 1.25) return null;

        const dedupeKey = `${item.osm_type || 'place'}-${item.osm_id || `${elLat}:${elLon}`}`;
        if (seen.has(dedupeKey)) return null;
        seen.add(dedupeKey);

        const defaultName = type === 'mosque' ? 'Mosque' : 'Halal Restaurant';
        return {
          id: `nominatim-${dedupeKey}`,
          name: item.name || item.display_name?.split(',')[0] || defaultName,
          lat: elLat,
          lon: elLon,
          distance,
          address: nominatimAddressLine(item, elLat, elLon),
          type,
        };
      })
      .filter((place: Place | null): place is Place => place !== null)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(0, 60);
  };

  const restaurantScore = (tags: Record<string, string | undefined> = {}) => {
    const text = [
      tags.name,
      tags['name:en'],
      tags.cuisine,
      tags.description,
      tags['diet:halal'],
      tags.halal,
    ].filter(Boolean).join(' ').toLowerCase();

    if (tags['diet:halal'] === 'yes' || tags.halal === 'yes') return 0;
    if (/\bhalal\b/.test(text)) return 1;
    if (/(biryani|kebab|kabob|shawarma|mandi|tandoor|mughlai|arabic|pakistani|afghan|turkish|lebanese|persian|moroccan|middle_eastern|indian)/i.test(text)) return 2;
    return 3;
  };

  // Find nearby places using Overpass API
  const findNearbyPlaces = useCallback(async (
    lat: number,
    lon: number,
    type: PlaceType,
    signal?: AbortSignal,
    options?: { forceRefresh?: boolean }
  ) => {
    const searchRun = ++searchRunRef.current;
    if (!options?.forceRefresh) {
      const cachedPlaces = readPlacesCache(lat, lon, type);
      if (cachedPlaces) {
        setPlaces(cachedPlaces);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const typeLabel = type === 'mosque' ? 'mosques' : 'halal restaurants';
      const radii = SEARCH_RADII[type];
      const maxRadius = radii[radii.length - 1];
      let data: any = null;
      let usedRadius = radii[0];

      for (const radius of radii) {
        usedRadius = radius;
        const overpassQuery = buildOverpassQuery(lat, lon, radius, type);
        data = await fetchWithRetry(overpassQuery, signal);
        if (signal?.aborted) return;
        if (data.elements?.length > 0) break;
      }
      
      if (!data.elements || data.elements.length === 0) {
        if (searchRun !== searchRunRef.current) return;
        const fallbackPlaces = await fetchFallbackPlaces(lat, lon, type, maxRadius, signal);
        if (signal?.aborted || searchRun !== searchRunRef.current) return;
        if (fallbackPlaces.length > 0) {
          setPlaces(fallbackPlaces);
          writePlacesCache(lat, lon, type, fallbackPlaces);
          toast.success(`Found ${fallbackPlaces.length} ${typeLabel}`);
          return;
        }
        setPlaces([]);
        toast.info(`No ${typeLabel} found within ${Math.round(maxRadius / 1000)}km. Try changing your location.`);
        return;
      }
      
      const seen = new Set<string>();
      const placesList: Place[] = data.elements
        .map((element: any) => {
          const elLat = element.lat || element.center?.lat;
          const elLon = element.lon || element.center?.lon;
          
          if (!elLat || !elLon) return null;
          
          const distance = calculateDistance(lat, lon, elLat, elLon);
          const dedupeKey = `${Math.round(elLat * 100000)}:${Math.round(elLon * 100000)}:${element.tags?.name || element.id}`;
          if (seen.has(dedupeKey)) return null;
          seen.add(dedupeKey);
          
          const defaultName = type === 'mosque' ? 'Mosque' : 'Halal Restaurant';
          const score = type === 'restaurant' ? restaurantScore(element.tags || {}) : 0;
          return {
            id: `${element.type}-${element.id}`,
            name: element.tags?.name || element.tags?.['name:en'] || element.tags?.['name:ar'] || defaultName,
            lat: elLat,
            lon: elLon,
            distance,
            address: overpassAddressLine(element.tags || {}, elLat, elLon),
            type,
            score,
          };
        })
        .filter((place: (Place & { score?: number }) | null): place is Place & { score?: number } => place !== null)
        .sort((a: Place & { score?: number }, b: Place & { score?: number }) =>
          type === 'restaurant'
            ? (a.score || 0) - (b.score || 0) || (a.distance || 0) - (b.distance || 0)
            : (a.distance || 0) - (b.distance || 0)
        )
        .map(({ score, ...place }) => place);

      if (searchRun !== searchRunRef.current) return;
      setPlaces(placesList);
      writePlacesCache(lat, lon, type, placesList);
      
      if (placesList.length > 0) {
        toast.success(`Found ${placesList.length} ${typeLabel} within ${Math.round(usedRadius / 1000)}km`);
      } else {
        toast.info(`No ${typeLabel} found within ${Math.round(maxRadius / 1000)}km.`);
      }
    } catch (error) {
      if (signal?.aborted || searchRun !== searchRunRef.current) return;
      console.error('Error finding places:', error);
      const typeLabel = type === 'mosque' ? 'mosques' : 'halal restaurants';
      const fallbackPlaces = await fetchFallbackPlaces(lat, lon, type, SEARCH_RADII[type].at(-1) || 25000, signal);
      if (signal?.aborted || searchRun !== searchRunRef.current) return;
      if (fallbackPlaces.length > 0) {
        setPlaces(fallbackPlaces);
        writePlacesCache(lat, lon, type, fallbackPlaces);
        toast.success(`Found ${fallbackPlaces.length} ${typeLabel}`);
        return;
      }
      const stalePlaces = readPlacesCache(lat, lon, type, { allowExpired: true });
      if (stalePlaces) {
        setPlaces(stalePlaces);
        toast.info(`Showing saved ${typeLabel}. Pull refresh to update.`);
        return;
      }
      setPlaces([]);
      toast.info(`No ${typeLabel} found near this location. Try another nearby area.`);
    } finally {
      if (searchRun === searchRunRef.current) {
        setLoading(false);
      }
    }
  }, [userLocation?.area, userLocation?.city, userLocation?.country]);

  // Fetch places when location is available or place type changes
  useEffect(() => {
    if (userLocation && !locationLoading) {
      const controller = new AbortController();
      findNearbyPlaces(userLocation.latitude, userLocation.longitude, placeType, controller.signal);
      return () => controller.abort();
    }
  }, [userLocation?.latitude, userLocation?.longitude, locationLoading, placeType, findNearbyPlaces]);

  // Filter places based on search query
  const filteredPlaces = places.filter(place =>
    place.type === placeType &&
    place.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open directions in Google Maps
  const openDirections = (place: Place) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
    void openExternalUrl(url);
  };

  // Refresh places search
  const handleRefresh = () => {
    if (userLocation) {
      findNearbyPlaces(userLocation.latitude, userLocation.longitude, placeType, undefined, { forceRefresh: true });
    } else {
      refreshLocation();
    }
  };

  const isLoading = loading || locationLoading;

  const getPlaceIcon = (type: PlaceType) => type === 'mosque' ? '🕌' : '🍽️';
  const getPlaceLabel = (type: PlaceType) => type === 'mosque' ? 'Mosques' : 'Halal Restaurants';

  // Deterministic mock helpers so each place card has plausible info
  const hashNum = (id: string, mod: number) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h % mod;
  };
  const mockRating = (id: string) => (40 + hashNum(id, 10)) / 10; // 4.0 - 4.9
  const mockReviews = (id: string) => 50 + hashNum(id, 250);
  const mockOpen = (id: string) => hashNum(id, 4) !== 0; // ~75% open
  const mockPrice = (id: string) => ['£', '££', '£££'][hashNum(id, 3)];
  const cuisines = ['Indian Cuisine', 'Turkish Cuisine', 'Middle Eastern', 'Pakistani Cuisine', 'Arabic Cuisine'];
  const mockCuisine = (id: string) => cuisines[hashNum(id, cuisines.length)];

  const cityLabel = userLocation ? `${userLocation.area || userLocation.city || 'Your area'}${userLocation.country ? ', ' + userLocation.country : ''}` : 'Set your location';

  // Filter restaurants by chip
  const chippedPlaces = filteredPlaces.filter((p) => {
    if (placeType !== 'restaurant') return true;
    if (restaurantFilter === 'Open Now') return mockOpen(p.id);
    if (restaurantFilter === 'Top Rated') return mockRating(p.id) >= 4.5;
    if (restaurantFilter === 'Turkish') return mockCuisine(p.id) === 'Turkish Cuisine';
    return true; // Nearest – already sorted
  });

  return (
    <Layout
      headerTitle="Places"
      leftAlignHeaderTitle
      headerClassName="bg-white border-b border-[#F0E0C2]"
      headerTitleClassName="font-bold text-lg"
      headerTitleStyle={{ color: HEADER_TEXT }}
      headerButtonClassName="text-[#2C1309] hover:bg-[#FFF5E5]"
      pageBackgroundColor={CREAM_BG}
    >
      <div className="min-h-full" style={{ backgroundColor: CREAM_BG }}>
        <div className="px-4 py-5 space-y-5">
          {/* Location pill */}
          <div
            className="flex items-center justify-between rounded-full px-5 py-3"
            style={{ backgroundColor: '#FFF2DF' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-5 w-5 shrink-0" style={{ color: BROWN }} />
              <span className="font-semibold truncate" style={{ color: HEADER_TEXT }}>
                {cityLabel}
              </span>
            </div>
            <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
              <DialogTrigger asChild>
                <button className="underline font-semibold text-sm" style={{ color: BROWN }}>
                  Change
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm" style={{ backgroundColor: CREAM_BG }}>
                <DialogHeader>
                  <DialogTitle style={{ color: HEADER_TEXT }}>Change Location</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Button 
                    onClick={useCurrentLocation} 
                    className="w-full text-white"
                    style={{ backgroundColor: BROWN }}
                    disabled={locationLoading}
                  >
                    <LocateFixed className="h-4 w-4 mr-2" />
                    Use My Current GPS Location
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="px-2" style={{ backgroundColor: CREAM_BG, color: MUTED_TEXT }}>Or search city</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter city name..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchCity()}
                      className="bg-white text-black placeholder:text-[#6B7280]"
                    />
                    <Button onClick={searchCity} disabled={searchingCity} style={{ backgroundColor: BROWN }} className="text-white">
                      {searchingCity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="px-2" style={{ backgroundColor: CREAM_BG, color: MUTED_TEXT }}>Or enter coordinates</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Latitude"
                      type="number"
                      step="any"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      className="bg-white text-black placeholder:text-[#6B7280]"
                    />
                    <Input
                      placeholder="Longitude"
                      type="number"
                      step="any"
                      value={manualLon}
                      onChange={(e) => setManualLon(e.target.value)}
                      className="bg-white text-black placeholder:text-[#6B7280]"
                    />
                  </div>
                  <Button 
                    onClick={handleManualCoordinates} 
                    variant="outline" 
                    className="w-full border-2"
                    style={{ borderColor: BROWN, color: BROWN }}
                    disabled={!manualLat || !manualLon}
                  >
                    Set Coordinates
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b" style={{ borderColor: SOFT_BORDER }}>
            {([
              { id: 'mosque', label: 'Mosque Finder' },
              { id: 'restaurant', label: 'Halal Restaurants' },
            ] as { id: PlaceType; label: string }[]).map((t) => {
              const active = placeType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setPlaceType(t.id)}
                  className="pb-2 -mb-px font-semibold transition-colors"
                  style={{
                    color: active ? BROWN_DARK : MUTED_TEXT,
                    borderBottom: active ? `3px solid ${BROWN}` : '3px solid transparent',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: MUTED_TEXT }} />
            <Input
              placeholder={placeType === 'mosque' ? 'Search for Mosques...' : 'Search for restaurants...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-full border-0"
              style={{ backgroundColor: '#EAE3D2', color: HEADER_TEXT }}
            />
          </div>

          {/* Filter chips (restaurants only) */}
          {placeType === 'restaurant' && (
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar">
              {(['Nearest', 'Open Now', 'Top Rated', 'Turkish'] as const).map((c) => {
                const active = restaurantFilter === c;
                return (
                  <button
                    key={c}
                    onClick={() => setRestaurantFilter(c)}
                    className="px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
                    style={
                      active
                        ? { backgroundColor: BROWN_DARK, color: '#FFF' }
                        : { backgroundColor: CREAM_DEEP, color: HEADER_TEXT }
                    }
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}

          {/* Count */}
          {!isLoading && userLocation && (
            <p className="text-sm italic" style={{ color: MUTED_TEXT }}>
              {chippedPlaces.length} {placeType === 'mosque' ? 'Mosque' : 'restaurants'} nearby
            </p>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" style={{ color: BROWN }} />
              <span style={{ color: HEADER_TEXT }}>
                {locationLoading ? 'Getting your location...' : `Finding ${getPlaceLabel(placeType).toLowerCase()}...`}
              </span>
            </div>
          )}

          {/* Location Error */}
          {!isLoading && locationError && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <AlertCircle className="h-12 w-12" style={{ color: MUTED_TEXT }} />
              <p className="text-center" style={{ color: MUTED_TEXT }}>{locationError}</p>
              <div className="flex gap-2">
                <Button onClick={refreshLocation} className="text-white" style={{ backgroundColor: BROWN }}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => setLocationDialogOpen(true)} variant="outline" style={{ borderColor: BROWN, color: BROWN }}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Set Manually
                </Button>
              </div>
            </div>
          )}

          {/* Map View */}
          {showMap && userLocation && !isLoading && (
            <div className="h-96 rounded-2xl overflow-hidden">
            <MapContainer
              center={[userLocation.latitude, userLocation.longitude]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[userLocation.latitude, userLocation.longitude]}>
                <Popup>Your Location</Popup>
              </Marker>
              {chippedPlaces.map((place) => (
                <Marker key={place.id} position={[place.lat, place.lon]}>
                  <Popup>
                    <div className="text-center">
                      <h3 className="font-semibold">{place.name}</h3>
                      <p className="text-sm text-muted-foreground">{place.distance?.toFixed(2)} km away</p>
                      <Button 
                        size="sm" 
                        className="mt-2 text-white"
                        style={{ backgroundColor: BROWN }}
                        onClick={() => openDirections(place)}
                      >
                        Get Directions
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

          {/* Places List */}
          {!showMap && userLocation && !isLoading && (
            <div className="flex flex-col gap-5 pb-6">
              {chippedPlaces.length === 0 ? (
                <div className="text-center py-8">
                  <p style={{ color: MUTED_TEXT }}>No {getPlaceLabel(placeType).toLowerCase()} found</p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button onClick={handleRefresh} className="text-white" style={{ backgroundColor: BROWN }}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Search Again
                    </Button>
                    <Button onClick={() => setLocationDialogOpen(true)} variant="outline" style={{ borderColor: BROWN, color: BROWN }}>
                      <Settings2 className="h-4 w-4 mr-2" />
                      Change Location
                    </Button>
                  </div>
                </div>
              ) : (
                chippedPlaces.map((place) =>
                  place.type === 'restaurant' ? (
                    <RestaurantCard
                      key={place.id}
                      place={place}
                      open={mockOpen(place.id)}
                      rating={mockRating(place.id)}
                      reviews={mockReviews(place.id)}
                      cuisine={mockCuisine(place.id)}
                      price={mockPrice(place.id)}
                      onDirections={() => openDirections(place)}
                    />
                  ) : (
                    <MosqueCard
                      key={place.id}
                      place={place}
                      onDirections={() => openDirections(place)}
                    />
                  )
                )
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

// ---------- Sub-components ----------

interface RestaurantCardProps {
  place: Place;
  open: boolean;
  rating: number;
  reviews: number;
  cuisine: string;
  price: string;
  onDirections: () => void;
}

const RestaurantCard = ({ place, open, rating, reviews, cuisine, price, onDirections }: RestaurantCardProps) => {
  const miles = place.distance ? (place.distance * 0.621371).toFixed(1) : '—';
  return (
    <div
      className="bg-white rounded-3xl overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(123, 63, 30, 0.06)' }}
    >
      <div className="relative">
        <img
          src={restaurantImg}
          alt={place.name}
          width={800}
          height={640}
          loading="lazy"
          className="w-full h-48 object-cover"
        />
        <span
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: open ? '#1F7A3D' : '#C0392B' }}
        >
          {open ? 'OPEN' : 'Closed'}
        </span>
      </div>
      <div className="p-5">
        <h3 className="text-2xl italic mb-3" style={{ color: HEADER_TEXT, fontFamily: 'Georgia, serif' }}>
          {place.name}
        </h3>
        <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold"
            style={{ backgroundColor: CREAM_DEEP, color: HEADER_TEXT }}
          >
            <Star className="h-3.5 w-3.5 fill-current" />
            {rating.toFixed(1)}
          </span>
          <span style={{ color: MUTED_TEXT }}>({reviews} reviews)</span>
          <span style={{ color: MUTED_TEXT }}>•</span>
          <span style={{ color: HEADER_TEXT }}>{cuisine}</span>
        </div>
        <div className="flex items-center gap-3 text-sm mb-4">
          <span className="flex items-center gap-1 font-semibold" style={{ color: BROWN }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
            {miles} miles
          </span>
          <span style={{ color: HEADER_TEXT }}>{price}</span>
        </div>
        <Button
          onClick={onDirections}
          className="w-full rounded-full h-12 text-white font-semibold text-base"
          style={{ backgroundColor: BROWN }}
        >
          Directions <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

interface MosqueCardProps {
  place: Place;
  onDirections: () => void;
}

const MosqueCard = ({ place, onDirections }: MosqueCardProps) => {
  const miles = place.distance ? (place.distance * 0.621371).toFixed(1) : '—';
  // Static representative prayer times — page does not fetch per-mosque times
  const prayers = [
    { label: 'FAJR', time: '05:22' },
    { label: 'DHUHR', time: '13:10' },
    { label: 'ASR', time: '16:45' },
  ];
  return (
    <div
      className="bg-white rounded-3xl overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(123, 63, 30, 0.06)' }}
    >
      <img
        src={mosqueImg}
        alt={place.name}
        width={800}
        height={640}
        loading="lazy"
        className="w-full h-48 object-cover"
      />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-xl italic" style={{ color: HEADER_TEXT, fontFamily: 'Georgia, serif' }}>
            {place.name}
          </h3>
          <span className="text-sm whitespace-nowrap" style={{ color: HEADER_TEXT }}>
            {miles} miles away
          </span>
        </div>
        <p className="text-base mb-4" style={{ color: HEADER_TEXT }}>
          {place.address}
        </p>
        <div
          className="grid grid-cols-3 rounded-2xl px-2 py-3 mb-4"
          style={{ backgroundColor: CREAM_DEEP }}
        >
          {prayers.map((p) => (
            <div key={p.label} className="text-center">
              <div className="text-xs font-semibold tracking-wider" style={{ color: MUTED_TEXT }}>
                {p.label}
              </div>
              <div className="text-lg font-bold" style={{ color: BROWN_DARK }}>
                {p.time}
              </div>
            </div>
          ))}
        </div>
        <Button
          onClick={onDirections}
          className="w-full rounded-full h-12 text-white font-semibold text-base"
          style={{ backgroundColor: BROWN }}
        >
          Directions <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
