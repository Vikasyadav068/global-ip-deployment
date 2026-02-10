import React, { useState, useEffect } from 'react';
import { MapPin, TrendingUp } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh'
].sort();

const StatePatentCount = ({ onStateChange }) => {
  const [selectedState, setSelectedState] = useState('Uttar Pradesh');
  const [patentCount, setPatentCount] = useState(0);
  const [stateData, setStateData] = useState({});
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStateData();
  }, []);

  // Set initial data when stateData is loaded
  useEffect(() => {
    if (Object.keys(stateData).length > 0 && selectedState === 'Uttar Pradesh') {
      setPatentCount(stateData['Uttar Pradesh'] || 0);
      fetchCitiesByState('Uttar Pradesh');
      
      // Notify parent component about default state
      if (onStateChange) {
        onStateChange('Uttar Pradesh');
      }
    }
  }, [stateData]);

  const fetchStateData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching state-wise patent data from backend...');
      const response = await fetch(`${API_BASE_URL}/patent-filing/count-by-state`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ State data received:', data);
      setStateData(data);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching state-wise patent data:', err);
      setError('Failed to load patent data. Please ensure the backend server is running.');
      setLoading(false);
    }
  };

  const fetchCitiesByState = async (state) => {
    if (!state) {
      setCities([]);
      return;
    }
    
    try {
      setLoadingCities(true);
      console.log('🔄 Fetching cities for state:', state);
      
      const url = `${API_BASE_URL}/patent-filing/cities-by-state?state=${encodeURIComponent(state)}`;
      console.log('🔗 Request URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Cities received:', data);
      console.log('📊 Number of cities:', data.length);
      
      setCities(data);
      setLoadingCities(false);
    } catch (err) {
      console.error('❌ Error fetching cities:', err);
      console.error('❌ Error details:', err.message);
      setCities([]);
      setLoadingCities(false);
    }
  };

  const handleStateChange = (e) => {
    const state = e.target.value;
    setSelectedState(state);
    setPatentCount(stateData[state] || 0);
    fetchCitiesByState(state);
    
    // Notify parent component about state change
    if (onStateChange) {
      onStateChange(state);
    }
  };

  return (
    <div className="bg-white rounded-xl p-2 shadow-lg border border-gray-100 w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 px-2">
        <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-1.5 rounded-lg">
          <MapPin className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-800">State-wise Patent Count</h2>
          <p className="text-xs text-gray-600">Select a state to view patent statistics</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
            <p className="text-red-600 font-medium mb-3">{error}</p>
            <button
              onClick={fetchStateData}
              className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
            >
              Retry
            </button>
          </div>
        </div>
      ) : Object.keys(stateData).length === 0 ? (
        <div className="text-center py-8">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
            <p className="text-yellow-700 font-medium">No patent data available yet.</p>
            <p className="text-sm text-yellow-600 mt-2">Patent filings will appear here once data is submitted.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* State Dropdown */}
          <div>
            <label htmlFor="state-select" className="block text-sm font-semibold text-gray-700 mb-2">
              Select State
            </label>
            <select
              id="state-select"
              value={selectedState}
              onChange={handleStateChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white cursor-pointer text-gray-700 font-medium"
            >
              <option value="">-- Choose a State --</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* Patent Count Display */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-100">
            {selectedState ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side - Total Patents */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-800">Total Patents</h3>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                      {patentCount.toLocaleString()}
                    </span>
                    <span className="text-lg text-gray-600 font-medium">patents</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    in <span className="font-semibold text-blue-700">{selectedState}</span>
                  </p>
                </div>

                {/* Right Side - Cities */}
                <div className="border-l-2 border-blue-200 pl-6">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h4 className="text-lg font-bold text-gray-800">Cities in {selectedState}</h4>
                  </div>
                  
                  {loadingCities ? (
                    <div className="flex items-center justify-center py-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : cities.length > 0 ? (
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {cities.map((city, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm font-medium text-gray-700 shadow-sm"
                          >
                            {city}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 mt-3">
                        <span className="font-semibold text-blue-700">{cities.length}</span> unique {cities.length === 1 ? 'city' : 'cities'} found
                      </p>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-2">
                      <p className="text-sm">No cities found</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">
                <div className="flex items-center gap-3 mb-2 justify-center">
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-600">Total Patents</h3>
                </div>
                <p className="text-lg font-medium">Please select a state to view patent count</p>
              </div>
            )}
          </div>

          {/* Summary Statistics */}
          {Object.keys(stateData).length > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-gray-100">
              <div className="text-center">
                <p className="text-sm text-gray-600 font-medium">Total States with Patents</p>
                <p className="text-2xl font-bold text-blue-600">{Object.keys(stateData).length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 font-medium">Total Patents</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {Object.values(stateData).reduce((sum, count) => sum + count, 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatePatentCount;
