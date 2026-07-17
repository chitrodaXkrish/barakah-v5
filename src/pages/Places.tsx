import { useState, useEffect } from 'react';
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

interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance?: number;
  address?: string;
  type: PlaceType;
}

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

  // Search for city coordinates
  const searchCity = async () => {
    if (!citySearch.trim()) return;
    
    setSearchingCity(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        await setManualLocation(parseFloat(lat), parseFloat(lon));
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
        [out:json][timeout:25];
        (
          node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lon});
          node["building"="mosque"](around:${radius},${lat},${lon});
          way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lon});
          way["building"="mosque"](around:${radius},${lat},${lon});
        );
        out center;
      `;
    } else {
      // Simplified query for halal restaurants - search by cuisine and diet tags
      return `
        [out:json][timeout:25];
        (
          node["diet:halal"="yes"](around:${radius},${lat},${lon});
          node["cuisine"~"halal|indian|pakistani|middle_eastern|arabic|turkish|kebab|afghan"](around:${radius},${lat},${lon});
          way["diet:halal"="yes"](around:${radius},${lat},${lon});
        );
        out center;
      `;
    }
  };

  // Fetch with retry across multiple servers
  const fetchWithRetry = async (query: string): Promise<any> => {
    let lastError: Error | null = null;
    
    for (const server of OVERPASS_SERVERS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        const response = await fetch(server, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return await response.json();
        }
        lastError = new Error(`Server ${server} returned ${response.status}`);
      } catch (err) {
        lastError = err as Error;
        // Silent fallback to next Overpass mirror — noise-free.
      }
    }
    
    throw lastError || new Error('All servers failed');
  };

  // Find nearby places using Overpass API
  const findNearbyPlaces = async (lat: number, lon: number, type: PlaceType) => {
    setLoading(true);
    try {
      const radius = 5000; // 5km radius
      const overpassQuery = buildOverpassQuery(lat, lon, radius, type);

      const data = await fetchWithRetry(overpassQuery);
      
      const typeLabel = type === 'mosque' ? 'mosques' : 'halal restaurants';
      
      if (!data.elements || data.elements.length === 0) {
        setPlaces([]);
        toast.info(`No ${typeLabel} found within 5km. Try changing your location.`);
        return;
      }
      
      const placesList: Place[] = data.elements
        .map((element: any) => {
          const elLat = element.lat || element.center?.lat;
          const elLon = element.lon || element.center?.lon;
          
          if (!elLat || !elLon) return null;
          
          const distance = calculateDistance(lat, lon, elLat, elLon);
          
          const defaultName = type === 'mosque' ? 'Mosque' : 'Halal Restaurant';
          
          return {
            id: element.id.toString(),
            name: element.tags?.name || element.tags?.['name:en'] || element.tags?.['name:ar'] || defaultName,
            lat: elLat,
            lon: elLon,
            distance,
            address: element.tags?.['addr:full'] || element.tags?.['addr:street'] || element.tags?.['addr:city'] || 'Address not available',
            type,
          };
        })
        .filter((place: Place | null): place is Place => place !== null)
        .sort((a: Place, b: Place) => (a.distance || 0) - (b.distance || 0));

      setPlaces(placesList);
      
      if (placesList.length > 0) {
        toast.success(`Found ${placesList.length} ${typeLabel} within 5km`);
      } else {
        toast.info(`No ${typeLabel} found within 5km.`);
      }
    } catch (error) {
      console.error('Error finding places:', error);
      const typeLabel = type === 'mosque' ? 'mosques' : 'halal restaurants';
      toast.error(`Failed to find nearby ${typeLabel}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch places when location is available or place type changes
  useEffect(() => {
    if (userLocation && !locationLoading) {
      findNearbyPlaces(userLocation.latitude, userLocation.longitude, placeType);
    }
  }, [userLocation, locationLoading, placeType]);

  // Filter places based on search query
  const filteredPlaces = places.filter(place =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open directions in Google Maps
  const openDirections = (place: Place) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
    window.open(url, '_blank');
  };

  // Refresh places search
  const handleRefresh = () => {
    if (userLocation) {
      findNearbyPlaces(userLocation.latitude, userLocation.longitude, placeType);
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

  const cityLabel = userLocation ? `${userLocation.city || 'Your area'}${userLocation.country ? ', ' + userLocation.country : ''}` : 'Set your location';

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
                      className="bg-white"
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
                      className="bg-white"
                    />
                    <Input
                      placeholder="Longitude"
                      type="number"
                      step="any"
                      value={manualLon}
                      onChange={(e) => setManualLon(e.target.value)}
                      className="bg-white"
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
