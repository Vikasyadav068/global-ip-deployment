import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MapPin, Globe } from 'lucide-react';

const GoogleIPAssetMap = () => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stateData, setStateData] = useState([]);
  const [cityData, setCityData] = useState({});
  const [selectedState, setSelectedState] = useState(null);
  const [view, setView] = useState('state'); // 'state' or 'city'
  const markersRef = useRef([]);
  const mapInstanceRef = useRef(null);

  // Normalize state name for matching
  const normalizeStateName = (name) => {
    if (!name) return 'Unknown';
    return name.trim().toLowerCase();
  };

  // State coordinates mapping with normalized keys
  const stateCoordinatesRaw = {
    'maharashtra': { lat: 19.7515, lng: 75.7139 },
    'karnataka': { lat: 15.3173, lng: 75.7139 },
    'tamil nadu': { lat: 11.1271, lng: 78.6569 },
    'tamilnadu': { lat: 11.1271, lng: 78.6569 },
    'delhi': { lat: 28.7041, lng: 77.1025 },
    'telangana': { lat: 18.1124, lng: 79.0193 },
    'gujarat': { lat: 22.2587, lng: 71.1924 },
    'west bengal': { lat: 22.9868, lng: 87.8550 },
    'westbengal': { lat: 22.9868, lng: 87.8550 },
    'uttar pradesh': { lat: 26.8467, lng: 80.9462 },
    'uttarpradesh': { lat: 26.8467, lng: 80.9462 },
    'rajasthan': { lat: 27.0238, lng: 74.2179 },
    'haryana': { lat: 29.0588, lng: 76.0856 },
    'punjab': { lat: 31.1471, lng: 75.3412 },
    'kerala': { lat: 10.8505, lng: 76.2711 },
    'madhya pradesh': { lat: 22.9734, lng: 78.6569 },
    'madhyapradesh': { lat: 22.9734, lng: 78.6569 },
    'andhra pradesh': { lat: 15.9129, lng: 79.7400 },
    'andhrapradesh': { lat: 15.9129, lng: 79.7400 },
    'bihar': { lat: 25.0961, lng: 85.3131 },
    'chhattisgarh': { lat: 21.2787, lng: 81.8661 },
    'goa': { lat: 15.2993, lng: 74.1240 },
    'himachal pradesh': { lat: 31.1048, lng: 77.1734 },
    'himachalpradesh': { lat: 31.1048, lng: 77.1734 },
    'jharkhand': { lat: 23.6102, lng: 85.2799 },
    'assam': { lat: 26.2006, lng: 92.9376 },
    'odisha': { lat: 20.9517, lng: 85.0985 },
    'orissa': { lat: 20.9517, lng: 85.0985 },
    'uttarakhand': { lat: 30.0668, lng: 79.0193 },
    'jammu and kashmir': { lat: 33.7782, lng: 76.5762 },
    'jammu & kashmir': { lat: 33.7782, lng: 76.5762 },
    'j&k': { lat: 33.7782, lng: 76.5762 },
    'ladakh': { lat: 34.1526, lng: 77.5771 },
    'manipur': { lat: 24.6637, lng: 93.9063 },
    'meghalaya': { lat: 25.4670, lng: 91.3662 },
    'mizoram': { lat: 23.1645, lng: 92.9376 },
    'nagaland': { lat: 26.1584, lng: 94.5624 },
    'sikkim': { lat: 27.5330, lng: 88.5122 },
    'tripura': { lat: 23.9408, lng: 91.9882 },
    'arunachal pradesh': { lat: 28.2180, lng: 94.7278 },
    'arunachalpradesh': { lat: 28.2180, lng: 94.7278 }
  };

  const getStateCoordinates = (stateName) => {
    const normalized = normalizeStateName(stateName);
    return stateCoordinatesRaw[normalized] || { lat: 20.5937, lng: 78.9629 };
  };

  // Fetch patent data from backend
  const fetchPatentData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8080/api/patent-filing/all', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (response.ok) {
        const patents = await response.json();
        
        // Aggregate patents by state
        const stateCount = {};
        const cityByState = {};
        
        console.log('Total patents fetched:', patents.length);
        
        patents.forEach(patent => {
          // Priority: state column first, then applicant_state
          const state = patent.state || patent.applicant_state || 'Unknown';
          const city = patent.city || patent.applicant_city || 'Unknown';
          
          if (state && state !== 'Unknown') {
            // Count by state
            stateCount[state] = (stateCount[state] || 0) + 1;
            
            // Count by city within state
            if (!cityByState[state]) {
              cityByState[state] = {};
            }
            if (city && city !== 'Unknown') {
              cityByState[state][city] = (cityByState[state][city] || 0) + 1;
            }
          }
        });

        console.log('State counts:', stateCount);
        console.log('Total states found:', Object.keys(stateCount).length);

        // Create state data array with coordinates
        const stateDataArray = Object.keys(stateCount).map(stateName => {
          const coords = getStateCoordinates(stateName);
          console.log(`State: ${stateName}, Coords:`, coords);
          return {
            name: stateName,
            lat: coords.lat,
            lng: coords.lng,
            patents: stateCount[stateName]
          };
        }).filter(state => state.lat && state.lng); // Filter out states without coordinates

        console.log('Final state data array:', stateDataArray);

        // Create city data structure
        const cityDataStructure = {};
        Object.keys(cityByState).forEach(stateName => {
          const stateCoords = getStateCoordinates(stateName);
          cityDataStructure[stateName] = Object.keys(cityByState[stateName]).map(cityName => ({
            name: cityName,
            patents: cityByState[stateName][cityName],
            lat: stateCoords.lat,
            lng: stateCoords.lng
          }));
        });

        setStateData(stateDataArray);
        setCityData(cityDataStructure);
        setLoading(false);
        return stateDataArray;
      } else {
        throw new Error('Failed to fetch patent data');
      }
    } catch (err) {
      console.error('Error fetching patent data:', err);
      setError('Failed to load patent data');
      setLoading(false);
      return [];
    }
  };

  const getColorByPatentCount = (count, maxCount) => {
    if (maxCount === 0) return '#e9d5ff';
    const intensity = count / maxCount;
    
    // More vibrant heatmap colors
    if (intensity >= 0.75) return '#581c87'; // Very dark purple - highest
    if (intensity >= 0.6) return '#6b21a8'; // Dark purple
    if (intensity >= 0.45) return '#7c3aed'; // Purple
    if (intensity >= 0.3) return '#9333ea'; // Medium purple
    if (intensity >= 0.15) return '#a855f7'; // Light purple
    return '#c084fc'; // Very light purple - lowest
  };

  const getMarkerSize = (count, maxCount) => {
    if (maxCount === 0) return 15;
    const intensity = count / maxCount;
    // Larger size range for better visibility
    return 12 + (intensity * 20); // Size from 12 to 32
  };

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  const showStateView = (map, data) => {
    clearMarkers();
    setView('state');
    setSelectedState(null);

    if (!data || data.length === 0) {
      console.log('No patent data available to display');
      return;
    }

    console.log('Displaying markers for states:', data.length);
    console.log('Sample state data:', data.slice(0, 3));
    
    const maxPatents = Math.max(...data.map(s => s.patents), 1);
    console.log('Max patents in any state:', maxPatents);

    map.setCenter({ lat: 22.5, lng: 78.5 });
    map.setZoom(5);

    data.forEach(state => {
      const color = getColorByPatentCount(state.patents, maxPatents);
      const size = getMarkerSize(state.patents, maxPatents);

      console.log(`Creating marker for ${state.name} with ${state.patents} patents, color: ${color}, size: ${size}`);

      // Create marker with label showing patent count
      const marker = new google.maps.Marker({
        position: { lat: state.lat, lng: state.lng },
        map: map,
        title: `${state.name} - ${state.patents} Patents`,
        label: {
          text: state.patents.toString(),
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: size,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2.5
        },
        zIndex: state.patents,
        optimized: false
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; min-width: 200px;">
            <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold; color: #1f2937; border-bottom: 2px solid #7c3aed; padding-bottom: 6px;">
              ${state.name}
            </h3>
            <p style="margin: 0 0 8px 0; font-size: 16px; color: #6b7280;">
              <strong style="color: #7c3aed; font-size: 28px;">${state.patents}</strong> <span style="font-size: 14px;">Patents</span>
            </p>
            <p style="margin: 0; font-size: 13px; color: #9ca3af; font-style: italic;">
              💡 Click to view districts
            </p>
          </div>
        `,
        pixelOffset: new google.maps.Size(0, -10)
      });

      marker.addListener('click', () => {
        infoWindow.close();
        showCityView(map, state);
      });

      marker.addListener('mouseover', () => {
        console.log(`Hovering over ${state.name} with ${state.patents} patents`);
        infoWindow.open({
          map: map,
          anchor: marker,
          shouldFocus: false
        });
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: size + 5,
          fillColor: '#c084fc',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        });
      });

      marker.addListener('mouseout', () => {
        infoWindow.close();
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: size,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        });
      });

      markersRef.current.push(marker);
    });
  };

  const showCityView = (map, state) => {
    clearMarkers();
    setView('city');
    setSelectedState(state.name);

    const cities = cityData[state.name] || [];
    console.log(`Showing cities for ${state.name}:`, cities);
    
    if (cities.length === 0) {
      alert(`No district/city data available for ${state.name}`);
      showStateView(map, stateData);
      return;
    }

    const maxPatents = Math.max(...cities.map(c => c.patents), 1);

    // Zoom to state with animation
    map.panTo({ lat: state.lat, lng: state.lng });
    map.setZoom(8);

    // Create individual markers for each city/district in a circular pattern around state center
    const angleStep = (2 * Math.PI) / cities.length;
    const radius = 0.5; // degrees offset from center

    cities.forEach((city, index) => {
      const angle = index * angleStep;
      const cityLat = state.lat + (radius * Math.cos(angle));
      const cityLng = state.lng + (radius * Math.sin(angle));

      const color = getColorByPatentCount(city.patents, maxPatents);
      const size = Math.max(8, getMarkerSize(city.patents, maxPatents) * 0.8);

      const marker = new google.maps.Marker({
        position: { lat: cityLat, lng: cityLng },
        map: map,
        title: city.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: size,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2
        },
        zIndex: city.patents
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif; min-width: 160px;">
            <h4 style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: #1f2937; border-bottom: 2px solid #7c3aed; padding-bottom: 4px;">
              ${city.name}
            </h4>
            <p style="margin: 0; font-size: 15px; color: #6b7280;">
              <strong style="color: #7c3aed; font-size: 24px;">${city.patents}</strong> <span style="font-size: 13px;">Patents</span>
            </p>
          </div>
        `,
        pixelOffset: new google.maps.Size(0, -8)
      });

      marker.addListener('mouseover', () => {
        console.log(`Hovering over district ${city.name} with ${city.patents} patents`);
        infoWindow.open({
          map: map,
          anchor: marker,
          shouldFocus: false
        });
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: size + 3,
          fillColor: '#c084fc',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        });
      });

      marker.addListener('mouseout', () => {
        infoWindow.close();
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: size,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2
        });
      });

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
          throw new Error('Google Maps API key is not configured');
        }

        // Check if Google Maps is already loaded
        if (!window.google) {
          // Load Google Maps script
          const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
          
          if (!existingScript) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=weekly`;
            script.async = true;
            script.defer = true;
            
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = () => reject(new Error('Failed to load Google Maps script'));
              document.head.appendChild(script);
            });
          } else {
            // Wait for existing script to load
            await new Promise((resolve) => {
              const checkGoogle = setInterval(() => {
                if (window.google) {
                  clearInterval(checkGoogle);
                  resolve();
                }
              }, 100);
            });
          }
        }

        if (!mapRef.current || !window.google) return;

        // Initialize map centered on India
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 22.5, lng: 78.5 },
          zoom: 5,
          minZoom: 4,
          maxZoom: 12,
          restriction: {
            latLngBounds: {
              north: 35.5,
              south: 6.5,
              west: 68,
              east: 97.5
            }
          },
          styles: [
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#b3d9ff' }]
            },
            {
              featureType: 'landscape',
              elementType: 'geometry',
              stylers: [{ color: '#f3f4f6' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#d1d5db' }, { weight: 1 }]
            },
            {
              featureType: 'poi',
              stylers: [{ visibility: 'simplified' }]
            },
            {
              featureType: 'administrative',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#9ca3af' }, { weight: 1.5 }]
            },
            {
              featureType: 'administrative.province',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#7c3aed' }, { weight: 2 }]
            }
          ],
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);

        // Add custom overlay in top-right corner
        const overlayDiv = document.createElement('div');
        overlayDiv.style.cssText = `
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 600;
          font-size: 14px;
          margin: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        overlayDiv.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span>All Indian States Patents</span>
        `;
        map.controls[google.maps.ControlPosition.TOP_RIGHT].push(overlayDiv);

        // Fetch patent data and display markers
        const data = await fetchPatentData();
        if (data && data.length > 0) {
          showStateView(map, data);
        }
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError(err.message);
      }
    };

    initMap();

    return () => {
      clearMarkers();
    };
  }, []);

  const handleBackToStates = () => {
    if (mapInstanceRef.current && stateData.length > 0) {
      showStateView(mapInstanceRef.current, stateData);
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <MapPin className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">India Patent Distribution</h2>
        </div>
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <p className="text-red-600 mb-2">Error loading map</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MapPin className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">India Patent Distribution</h2>
        </div>
        {view === 'city' && selectedState && (
          <button
            onClick={handleBackToStates}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to States</span>
          </button>
        )}
      </div>
      
      {loading && (
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading patent data...</p>
          </div>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '500px',
          display: loading || error ? 'none' : 'block'
        }} 
        className="rounded-lg border border-gray-200" 
      />
      
      {!loading && !error && mapLoaded && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
            <Globe className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-800">Heat Map</h3>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-[#581c87]"></div>
                <span className="text-sm text-gray-600">Very High (75%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-[#7c3aed]"></div>
                <span className="text-sm text-gray-600">High (45-75%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-[#9333ea]"></div>
                <span className="text-sm text-gray-600">Medium (30-45%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-[#a855f7]"></div>
                <span className="text-sm text-gray-600">Low (15-30%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-[#c084fc]"></div>
                <span className="text-sm text-gray-600">Very Low (&lt;15%)</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {view === 'state' ? 'Numbers show patent count • Click to explore districts' : `Viewing districts in ${selectedState}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleIPAssetMap;
