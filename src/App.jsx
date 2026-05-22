import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Search, 
  Compass, 
  Car, 
  Footprints, 
  ArrowUpDown, 
  Locate, 
  Info, 
  List, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  Map as MapIcon
} from 'lucide-react';

// Custom inline SVG for Motorcycle (since the installed lucide-react version doesn't export Motorcycle)
const Motorcycle = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="5" cy="16" r="3" />
    <circle cx="19" cy="16" r="3" />
    <path d="M12 16V9a2 2 0 0 1 2-2h4" />
    <path d="M5 16h14" />
    <path d="m9 9 3 7" />
    <path d="M14 7h3" />
  </svg>
);
import { locations } from './data/locations';

export default function App() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routePolylineRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersRef = useRef({});
  
  // State variables
  const [startPoint, setStartPoint] = useState('gps'); // 'gps' or building ID
  const [endPoint, setEndPoint] = useState('rektorat'); // building ID
  const [transportMode, setTransportMode] = useState('motorcycle'); // 'car', 'motorcycle', 'walking'
  
  const [userCoords, setUserCoords] = useState(null); // Real GPS or simulation
  const [isUsingSimulation, setIsUsingSimulation] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('initializing'); // 'initializing', 'active', 'denied', 'outside'
  
  const [routeInfo, setRouteInfo] = useState(null); // { distance, duration, coordinates }
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);
  
  const [nearestLocations, setNearestLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [activeTab, setActiveTab] = useState('navigasi'); // 'navigasi' or 'lokasi'

  // Default coordinate for UNIB Gate (Limau Manis)
  const UNIB_GATE_COORDS = { lat: -3.753820, lng: 102.268305 };
  
  // Get active start coordinates
  const getStartCoords = () => {
    if (startPoint === 'gps') {
      return userCoords || UNIB_GATE_COORDS;
    }
    const loc = locations.find(l => l.id === startPoint);
    return loc ? { lat: loc.lat, lng: loc.lng } : UNIB_GATE_COORDS;
  };

  // Get active destination coordinates
  const getEndCoords = () => {
    const loc = locations.find(l => l.id === endPoint);
    return loc ? { lat: loc.lat, lng: loc.lng } : { lat: -3.759359, lng: 102.272581 }; // Default Rektorat
  };

  // Haversine Formula for distance calculation
  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in km
    return d;
  };

  // Initialize Map
  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      // Create Map centered at UNIB Rektorat
      mapInstance.current = L.map(mapRef.current, {
        center: [-3.759359, 102.272581],
        zoom: 16,
        zoomControl: false,
        maxZoom: 19,
        minZoom: 14
      });

      // Add Tile Layer (Beautiful Warm style using CartoDB Positron/OSM hybrid style if possible, or standard OSM)
      // Standard OSM is reliable, let's use Positron for a cleaner, modern look which fits cream theme perfectly
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstance.current);

      // Add Zoom Control to Top Right
      L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);

      // Render static building markers
      renderBuildingMarkers();
    }
  }, []);

  // Update building markers when startPoint or endPoint changes
  const renderBuildingMarkers = () => {
    if (!mapInstance.current) return;

    // Clear existing markers from previous renders if any
    Object.keys(markersRef.current).forEach(id => {
      markersRef.current[id].remove();
    });
    markersRef.current = {};

    locations.forEach(loc => {
      const isStart = startPoint === loc.id;
      const isEnd = endPoint === loc.id;
      
      let markerColor = '#826247'; // Default brown
      let zIndexOffset = 0;
      let scale = 1.0;

      if (isStart) {
        markerColor = '#4E8098'; // Blue for start
        zIndexOffset = 1000;
        scale = 1.25;
      } else if (isEnd) {
        markerColor = '#C2593F'; // Terracotta for destination
        zIndexOffset = 1000;
        scale = 1.25;
      }

      const iconHtml = `
        <div class="custom-pin-shadow" style="transform: scale(${scale}); transition: all 0.3s ease;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${markerColor}" width="32" height="32">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          ${isStart || isEnd ? `
            <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-cream-900 text-cream-50 text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap z-50">
              ${isStart ? 'MULAI' : 'TUJUAN'}
            </div>
          ` : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-building-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([loc.lat, loc.lng], { 
        icon: customIcon,
        zIndexOffset: zIndexOffset
      })
      .addTo(mapInstance.current)
      .bindPopup(`
        <div class="p-1 font-sans">
          <p class="font-bold text-cream-900 text-sm mb-0.5">${loc.name}</p>
          <p class="text-xs text-cream-600 mb-1.5">${loc.category}</p>
          <p class="text-xs text-cream-800 line-clamp-2 mb-2">${loc.description}</p>
          <div class="flex gap-2">
            <button onclick="window.setAsStart('${loc.id}')" class="text-[10px] bg-cream-200 text-cream-800 px-2 py-1 rounded font-semibold hover:bg-cream-300 transition">Set Asal</button>
            <button onclick="window.setAsEnd('${loc.id}')" class="text-[10px] bg-accent-500 text-white px-2 py-1 rounded font-semibold hover:bg-accent-600 transition">Set Tujuan</button>
          </div>
        </div>
      `);

      markersRef.current[loc.id] = marker;
    });
  };

  // Expose set functions globally for Leaflet popups
  useEffect(() => {
    window.setAsStart = (id) => {
      setStartPoint(id);
      setActiveTab('navigasi');
    };
    window.setAsEnd = (id) => {
      setEndPoint(id);
      setActiveTab('navigasi');
    };
    return () => {
      delete window.setAsStart;
      delete window.setAsEnd;
    };
  }, []);

  // Update markers when start/end changes
  useEffect(() => {
    renderBuildingMarkers();
  }, [startPoint, endPoint]);

  // Request & Watch GPS coordinates
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      setIsUsingSimulation(true);
      setUserCoords(UNIB_GATE_COORDS);
      return;
    }

    const handleSuccess = (position) => {
      const { latitude, longitude } = position.coords;
      
      // Boundaries of Universitas Bengkulu Kampus Limau Manis (approx ± 10 km)
      const unibLat = -3.759359;
      const unibLng = 102.272581;
      const distanceToCampus = calculateHaversineDistance(latitude, longitude, unibLat, unibLng);

      if (distanceToCampus > 10) {
        // User is outside campus (e.g. in another city), fallback to simulated position
        setUserCoords(UNIB_GATE_COORDS);
        setIsUsingSimulation(true);
        setGpsStatus('outside');
      } else {
        setUserCoords({ lat: latitude, lng: longitude });
        setIsUsingSimulation(false);
        setGpsStatus('active');
      }
    };

    const handleError = () => {
      setUserCoords(UNIB_GATE_COORDS);
      setIsUsingSimulation(true);
      setGpsStatus('denied');
    };

    // Watch position
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Update user position marker on the map
  useEffect(() => {
    if (!mapInstance.current || !userCoords) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      const userGpsIcon = L.divIcon({
        html: `
          <div class="gps-dot-container">
            <div class="gps-ring"></div>
            <div class="gps-dot"></div>
          </div>
        `,
        className: 'gps-gps-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], {
        icon: userGpsIcon,
        zIndexOffset: 2000
      })
      .addTo(mapInstance.current)
      .bindPopup(`
        <div class="font-sans text-xs p-1">
          <p class="font-bold text-cream-900 mb-0.5">Lokasi Anda</p>
          <p class="text-cream-600">${isUsingSimulation ? 'GPS Disimulasikan (Gerbang UNIB)' : 'Akurasi GPS Tinggi'}</p>
        </div>
      `);
    }
  }, [userCoords, isUsingSimulation]);

  // Recalculate nearest locations lists from the start point
  useEffect(() => {
    const start = getStartCoords();
    if (!start) return;

    const list = locations
      .map(loc => {
        const dist = calculateHaversineDistance(start.lat, start.lng, loc.lat, loc.lng);
        return { ...loc, distance: dist };
      })
      // Exclude the start point itself if it is a building
      .filter(loc => loc.id !== startPoint)
      .sort((a, b) => a.distance - b.distance);

    setNearestLocations(list);
  }, [startPoint, userCoords]);

  // Fetch Route from OSRM API
  useEffect(() => {
    const fetchRoute = async () => {
      const start = getStartCoords();
      const end = getEndCoords();

      // If they are the same location, reset route
      if (startPoint === endPoint) {
        setRouteInfo(null);
        setRouteError('Pilih titik asal dan tujuan yang berbeda.');
        if (routePolylineRef.current) {
          routePolylineRef.current.remove();
          routePolylineRef.current = null;
        }
        return;
      }

      setIsLoadingRoute(true);
      setRouteError(null);

      // Use highly accurate community OSRM servers supporting distinct transportation profiles
      let url = '';
      const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
      
      if (transportMode === 'walking') {
        // 'routed-foot' handles pedestrian-only shortcuts, paths, and sidewalks
        url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
      } else {
        // 'routed-car' handles drivable roads (for both cars and motorcycles)
        url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
      }

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Gagal mengambil data rute dari server.');
        
        const data = await response.json();
        if (!data.routes || data.routes.length === 0) {
          throw new Error('Tidak ditemukan rute jalan penghubung antara lokasi.');
        }

        const route = data.routes[0];
        const distanceInMeters = route.distance;
        let durationInSeconds = 0;

        // Apply realistic campus speeds to keep estimates perfectly accurate:
        if (transportMode === 'walking') {
          // Walking speed: 4.5 km/h (1.25 m/s)
          durationInSeconds = distanceInMeters / 1.25;
        } else if (transportMode === 'motorcycle') {
          // Motorcycle speed: 25 km/h (6.94 m/s) inside campus
          durationInSeconds = distanceInMeters / 6.94;
        } else {
          // Car speed: 20 km/h (5.56 m/s) due to speed bumps, narrow streets, and pedestrians
          durationInSeconds = distanceInMeters / 5.56;
        }

        const geojsonCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Swap to [lat, lng]

        setRouteInfo({
          distance: distanceInMeters,
          duration: durationInSeconds,
          coordinates: geojsonCoordinates
        });

        // Draw route polyline on map
        if (routePolylineRef.current) {
          routePolylineRef.current.remove();
        }

        routePolylineRef.current = L.polyline(geojsonCoordinates, {
          color: '#C2593F', // Terracotta color
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round'
        }).addTo(mapInstance.current);

        // Adjust map viewport to fit the route
        mapInstance.current.fitBounds(routePolylineRef.current.getBounds(), {
          padding: [60, 60]
        });

      } catch (err) {
        console.error(err);
        setRouteError(err.message || 'Koneksi internet bermasalah.');
        setRouteInfo(null);
        if (routePolylineRef.current) {
          routePolylineRef.current.remove();
          routePolylineRef.current = null;
        }
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [startPoint, endPoint, transportMode, userCoords]);

  // Center Map to User Position
  const handleLocateUser = () => {
    if (mapInstance.current && userCoords) {
      mapInstance.current.setView([userCoords.lat, userCoords.lng], 17);
      if (userMarkerRef.current) {
        userMarkerRef.current.openPopup();
      }
    }
  };

  // Swap Asal and Tujuan
  const handleSwapLocations = () => {
    if (startPoint === 'gps') {
      // Cannot swap GPS as target directly if it is dynamic, let's notify or set to rektorat
      return;
    }
    const temp = startPoint;
    setStartPoint(endPoint);
    setEndPoint(temp);
  };

  // Format distance output
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Format time/duration output
  const formatDuration = (seconds) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 1) return 'Kurang dari 1 mnt';
    if (minutes < 60) return `${minutes} menit`;
    
    const hours = Math.floor(minutes / 60);
    const remMins = minutes % 60;
    return `${hours} jam ${remMins} menit`;
  };

  // Filter locations for search list
  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          loc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          loc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || loc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Semua', 'Fakultas', 'Akademik', 'Administrasi', 'Fasilitas', 'Ibadah', 'Asrama'];

  return (
    <div class="h-full w-full flex flex-col md:flex-row relative">
      
      {/* SIDEBAR CONTROL PANEL - Left on Desktop, floating bottom on Mobile */}
      <div class="w-full md:w-[420px] md:h-screen bg-cream-50 flex flex-col z-[1000] shadow-soft-lg md:border-r border-cream-200 overflow-hidden shrink-0">
        
        {/* Header App */}
        <div class="p-5 bg-gradient-to-b from-cream-100 to-cream-50 border-b border-cream-200">
          <div class="flex items-center gap-3">
            <div class="bg-accent-500 text-cream-50 p-2.5 rounded-2xl shadow-md flex items-center justify-center">
              <Compass class="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-cream-900 font-sans flex items-center gap-1.5">
                UNIB Navi
                <span class="text-[10px] bg-accent-100 text-accent-700 px-2 py-0.5 rounded-full font-bold">BETA</span>
              </h1>
              <p class="text-xs text-cream-600">Rute Tercepat & Titik Terdekat Kampus UNIB</p>
            </div>
          </div>
          
          {/* GPS Status Alert */}
          {gpsStatus === 'outside' && (
            <div class="mt-3.5 bg-accent-50/80 border border-accent-200 text-accent-800 text-[11px] p-2.5 rounded-xl flex gap-2">
              <AlertCircle class="h-4 w-4 text-accent-500 shrink-0" />
              <span>Anda berada di luar kota Bengkulu. GPS disimulasikan di <strong>Gerbang Utama UNIB</strong> agar rute dapat diuji.</span>
            </div>
          )}
          {gpsStatus === 'denied' && (
            <div class="mt-3.5 bg-accent-50/80 border border-accent-200 text-accent-800 text-[11px] p-2.5 rounded-xl flex gap-2">
              <AlertCircle class="h-4 w-4 text-accent-500 shrink-0" />
              <span>Akses GPS ditolak/tidak didukung. Lokasi disimulasikan di <strong>Gerbang Utama UNIB</strong>.</span>
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div class="flex border-b border-cream-200 px-4">
          <button 
            onClick={() => setActiveTab('navigasi')}
            class={`flex-1 py-3 text-sm font-semibold border-b-2 transition flex items-center justify-center gap-2 ${
              activeTab === 'navigasi' 
                ? 'border-accent-500 text-accent-700' 
                : 'border-transparent text-cream-500 hover:text-cream-800'
            }`}
          >
            <Compass class="h-4 w-4" />
            Petunjuk Arah
          </button>
          <button 
            onClick={() => setActiveTab('lokasi')}
            class={`flex-1 py-3 text-sm font-semibold border-b-2 transition flex items-center justify-center gap-2 ${
              activeTab === 'lokasi' 
                ? 'border-accent-500 text-accent-700' 
                : 'border-transparent text-cream-500 hover:text-cream-800'
            }`}
          >
            <List class="h-4 w-4" />
            Daftar Gedung
          </button>
        </div>

        {/* Dynamic Panels */}
        <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {activeTab === 'navigasi' ? (
            <>
              {/* ROUTING SELECTOR PANEL */}
              <div class="bg-white rounded-2xl p-4 shadow-soft border border-cream-100 relative">
                <div class="space-y-4">
                  {/* Start Point Input */}
                  <div class="relative">
                    <label class="text-[10px] font-bold text-cream-500 tracking-wider block mb-1">TITIK ASAL</label>
                    <div class="flex items-center gap-2 bg-cream-50 border border-cream-200 rounded-xl px-3 py-2">
                      <div class="h-2 w-2 rounded-full bg-blue-500 shrink-0"></div>
                      <select 
                        value={startPoint} 
                        onChange={(e) => setStartPoint(e.target.value)}
                        class="bg-transparent text-sm text-cream-900 w-full outline-none font-medium cursor-pointer"
                      >
                        <option value="gps">📍 Posisi GPS Saya {isUsingSimulation ? '(Simulasi)' : ''}</option>
                        <optgroup label="Daftar Gedung UNIB">
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Swap Button */}
                  {startPoint !== 'gps' && (
                    <div class="absolute right-8 top-1/2 -translate-y-1/2 z-10">
                      <button 
                        onClick={handleSwapLocations}
                        class="bg-cream-100 hover:bg-cream-200 border border-cream-200 text-cream-700 p-2 rounded-full shadow transition-all duration-200 flex items-center justify-center hover:scale-105"
                        title="Tukar Asal dan Tujuan"
                      >
                        <ArrowUpDown class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Destination Point Input */}
                  <div>
                    <label class="text-[10px] font-bold text-cream-500 tracking-wider block mb-1">TITIK TUJUAN</label>
                    <div class="flex items-center gap-2 bg-cream-50 border border-cream-200 rounded-xl px-3 py-2">
                      <div class="h-2 w-2 rounded-full bg-accent-500 shrink-0"></div>
                      <select 
                        value={endPoint} 
                        onChange={(e) => setEndPoint(e.target.value)}
                        class="bg-transparent text-sm text-cream-900 w-full outline-none font-medium cursor-pointer"
                      >
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* TRANSPORT MODE SELECTOR */}
              <div class="grid grid-cols-3 gap-2 bg-cream-100/50 p-1.5 rounded-2xl border border-cream-200">
                <button
                  onClick={() => setTransportMode('motorcycle')}
                  class={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all duration-200 gap-1.5 ${
                    transportMode === 'motorcycle' 
                      ? 'bg-white text-accent-700 shadow-soft border border-cream-200/50 scale-105' 
                      : 'text-cream-600 hover:text-cream-800'
                  }`}
                >
                  <Motorcycle class="h-4.5 w-4.5" />
                  <span>Motor</span>
                </button>
                
                <button
                  onClick={() => setTransportMode('car')}
                  class={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all duration-200 gap-1.5 ${
                    transportMode === 'car' 
                      ? 'bg-white text-accent-700 shadow-soft border border-cream-200/50 scale-105' 
                      : 'text-cream-600 hover:text-cream-800'
                  }`}
                >
                  <Car class="h-4.5 w-4.5" />
                  <span>Mobil</span>
                </button>

                <button
                  onClick={() => setTransportMode('walking')}
                  class={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all duration-200 gap-1.5 ${
                    transportMode === 'walking' 
                      ? 'bg-white text-accent-700 shadow-soft border border-cream-200/50 scale-105' 
                      : 'text-cream-600 hover:text-cream-800'
                  }`}
                >
                  <Footprints class="h-4.5 w-4.5" />
                  <span>Jalan Kaki</span>
                </button>
              </div>

              {/* ESTIMATIONS & ROUTE DETAILS */}
              <div class="bg-white rounded-2xl p-5 shadow-soft border border-cream-100">
                <h3 class="text-xs font-bold text-cream-500 tracking-wider mb-4 flex items-center gap-1.5">
                  <Sparkles class="h-3.5 w-3.5 text-accent-500" />
                  ESTIMASI PERJALANAN
                </h3>
                
                {isLoadingRoute ? (
                  <div class="flex flex-col items-center justify-center py-6 gap-2">
                    <div class="h-8 w-8 border-3 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-xs text-cream-500 font-semibold animate-pulse">Menghitung rute tercepat...</span>
                  </div>
                ) : routeError ? (
                  <div class="bg-accent-50/50 text-accent-800 text-xs p-4 rounded-xl border border-accent-200/50 flex flex-col gap-2">
                    <div class="flex items-center gap-1.5 font-bold">
                      <AlertCircle class="h-4.5 w-4.5 text-accent-500 shrink-0" />
                      <span>Masalah Rute</span>
                    </div>
                    <span>{routeError}</span>
                  </div>
                ) : routeInfo ? (
                  <div class="space-y-4">
                    {/* Time and Distance stats */}
                    <div class="grid grid-cols-2 gap-4">
                      <div class="bg-cream-50/80 p-3.5 rounded-2xl border border-cream-100 flex flex-col">
                        <span class="text-[10px] text-cream-500 font-bold tracking-wide">WAKTU TEMPUH</span>
                        <span class="text-xl font-extrabold text-accent-600 mt-1">{formatDuration(routeInfo.duration)}</span>
                      </div>
                      <div class="bg-cream-50/80 p-3.5 rounded-2xl border border-cream-100 flex flex-col">
                        <span class="text-[10px] text-cream-500 font-bold tracking-wide">JARAK RUTE</span>
                        <span class="text-xl font-extrabold text-cream-900 mt-1">{formatDistance(routeInfo.distance)}</span>
                      </div>
                    </div>

                    <div class="border-t border-cream-100 pt-3 flex items-start gap-2.5">
                      <Info class="h-4 w-4 text-cream-400 mt-0.5 shrink-0" />
                      <p class="text-[11px] leading-relaxed text-cream-600">
                        Rute ini dihitung menggunakan data jalan dari <strong>OpenStreetMap</strong>. Waktu tempuh dapat bervariasi bergantung pada kepadatan jalan kampus.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div class="text-center py-6 text-xs text-cream-500">
                    Silakan tentukan asal dan tujuan rute untuk kalkulasi.
                  </div>
                )}
              </div>

              {/* NEAREST LOCATIONS LIST */}
              <div class="space-y-3">
                <h3 class="text-xs font-bold text-cream-500 tracking-wider flex items-center gap-1.5 px-1">
                  <MapPin class="h-4 w-4 text-accent-500" />
                  TITIK TERDEKAT DARI ASAL ({nearestLocations.length > 0 ? nearestLocations.length : 0})
                </h3>
                
                <div class="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                  {nearestLocations.slice(0, 5).map((loc, idx) => (
                    <div 
                      key={loc.id}
                      onClick={() => setEndPoint(loc.id)}
                      class="bg-white hover:bg-cream-100/50 p-3 rounded-2xl shadow-soft border border-cream-100 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 flex justify-between items-center group"
                    >
                      <div class="space-y-0.5 pr-2">
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-bold bg-cream-200 text-cream-800 px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          <h4 class="text-xs font-bold text-cream-900 group-hover:text-accent-600 transition">{loc.name}</h4>
                        </div>
                        <p class="text-[10px] text-cream-500 line-clamp-1">{loc.description}</p>
                      </div>
                      <div class="text-right shrink-0">
                        <span class="text-xs font-bold text-accent-600">
                          ~{formatDistance(loc.distance * 1000)}
                        </span>
                        <p class="text-[9px] text-cream-400">lurus</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ALL BUILDINGS DIRECTORY TAB */}
              <div class="space-y-4">
                {/* Search Bar */}
                <div class="flex items-center gap-2 bg-white border border-cream-200 rounded-xl px-3 py-2 shadow-soft">
                  <Search class="h-4 w-4 text-cream-400 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Cari gedung, dekanat, lab..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    class="bg-transparent text-sm text-cream-900 w-full outline-none font-medium"
                  />
                </div>

                {/* Category Pills */}
                <div class="flex gap-1.5 overflow-x-auto custom-scrollbar pb-2 mask-linear">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      class={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                        selectedCategory === cat 
                          ? 'bg-accent-500 text-white shadow-sm' 
                          : 'bg-cream-100 text-cream-700 hover:bg-cream-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Directory List */}
                <div class="space-y-2.5">
                  {filteredLocations.length > 0 ? (
                    filteredLocations.map(loc => (
                      <div 
                        key={loc.id}
                        class="bg-white p-4 rounded-2xl shadow-soft border border-cream-100 hover:border-cream-300 transition-all duration-200 flex flex-col gap-2.5"
                      >
                        <div>
                          <div class="flex items-center justify-between">
                            <span class="text-[9px] font-bold tracking-wider uppercase bg-cream-200 text-cream-700 px-2 py-0.5 rounded-md">
                              {loc.category}
                            </span>
                            <span class="text-[10px] text-cream-400 font-mono">
                              {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                            </span>
                          </div>
                          <h4 class="text-sm font-bold text-cream-900 mt-1">{loc.name}</h4>
                          <p class="text-xs text-cream-600 mt-1 leading-relaxed">{loc.description}</p>
                        </div>

                        <div class="flex gap-2 border-t border-cream-100/60 pt-2.5">
                          <button
                            onClick={() => {
                              setStartPoint(loc.id);
                              setActiveTab('navigasi');
                            }}
                            class="flex-1 py-1.5 rounded-lg text-xs font-bold bg-cream-100 hover:bg-cream-200 text-cream-800 transition"
                          >
                            Set Asal
                          </button>
                          <button
                            onClick={() => {
                              setEndPoint(loc.id);
                              setActiveTab('navigasi');
                            }}
                            class="flex-1 py-1.5 rounded-lg text-xs font-bold bg-accent-500 hover:bg-accent-600 text-white transition"
                          >
                            Set Tujuan
                          </button>
                          <button
                            onClick={() => {
                              if (mapInstance.current) {
                                mapInstance.current.setView([loc.lat, loc.lng], 18);
                                markersRef.current[loc.id].openPopup();
                              }
                            }}
                            class="p-1.5 rounded-lg text-xs bg-cream-50 hover:bg-cream-100 text-cream-600 border border-cream-200 flex items-center justify-center"
                            title="Tampilkan di Peta"
                          >
                            <MapIcon class="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div class="text-center py-10 text-xs text-cream-500">
                      Gedung tidak ditemukan. Coba kata kunci lain.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Credit */}
        <div class="p-4 bg-cream-100/50 border-t border-cream-200 text-center text-[10px] text-cream-500 font-medium">
          Dibuat untuk Universitas Bengkulu • Peta oleh OpenStreetMap
        </div>
      </div>

      {/* FULL MAP CONTAINER */}
      <div class="flex-1 h-[50vh] md:h-screen w-full relative">
        <div ref={mapRef} class="h-full w-full z-0"></div>
        
        {/* Floating Quick Action Overlays on Map */}
        <div class="absolute bottom-5 right-5 z-[500] flex flex-col gap-2">
          {/* Locate Me GPS button */}
          <button
            onClick={handleLocateUser}
            class="bg-white hover:bg-cream-100 text-cream-800 p-3.5 rounded-2xl shadow-soft-lg border border-cream-200 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 group"
            title="Pusatkan Lokasi Saya"
          >
            <Locate class="h-5.5 w-5.5 text-accent-500 group-hover:animate-spin" />
          </button>
        </div>
      </div>
    </div>
  );
}
