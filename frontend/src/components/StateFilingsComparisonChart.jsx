import React, { useState, useEffect } from 'react';
import { MapPin, TrendingUp, BarChart3 } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { API_BASE_URL } from '../config/api';

const StateFilingsComparisonChart = () => {
  const [stateData, setStateData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchStateData();
  }, []);

  useEffect(() => {
    if (Object.keys(stateData).length > 0) {
      // Convert state data to chart format and sort by count
      const formattedData = Object.entries(stateData)
        .map(([state, count]) => ({
          state: state.length > 15 ? state.substring(0, 15) + '...' : state,
          fullState: state,
          count: count,
          percentage: 0 // Will calculate after we have total
        }))
        .sort((a, b) => b.count - a.count);

      // Calculate total and percentages
      const total = formattedData.reduce((sum, item) => sum + item.count, 0);
      formattedData.forEach(item => {
        item.percentage = ((item.count / total) * 100).toFixed(1);
      });

      setChartData(formattedData);
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
      console.log('✅ State data received for comparison chart:', data);
      setStateData(data);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching state-wise patent data:', err);
      setError('Failed to load patent data. Please ensure the backend server is running.');
      setLoading(false);
    }
  };

  // Color palette for different states - vibrant and professional
  const getBarColor = (index) => {
    const colors = [
      '#6366f1', // Indigo
      '#8b5cf6', // Purple
      '#ec4899', // Pink
      '#14b8a6', // Teal
      '#f59e0b', // Amber
      '#10b981', // Emerald
      '#3b82f6', // Blue
      '#ef4444', // Red
      '#06b6d4', // Cyan
      '#84cc16', // Lime
      '#a855f7', // Violet
      '#f97316', // Orange
      '#22c55e', // Green
      '#eab308', // Yellow
      '#6366f1', // Indigo (repeat)
    ];
    return colors[index % colors.length];
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border-4 border-indigo-500 rounded-2xl shadow-2xl p-4 backdrop-blur-sm">
          <p className="font-black text-lg text-indigo-900 mb-2">{data.fullState}</p>
          <div className="space-y-1">
            <p className="text-sm font-bold text-gray-700">
              <span className="text-indigo-600">Total Filings:</span>{' '}
              <span className="text-2xl text-indigo-900">{data.count.toLocaleString()}</span>
            </p>
            <p className="text-sm font-bold text-gray-700">
              <span className="text-purple-600">Percentage:</span>{' '}
              <span className="text-xl text-purple-900">{data.percentage}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="group bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl shadow-xl p-4 border-2 border-indigo-400 hover:border-indigo-600 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              State-wise Filings Comparison
            </h3>
            <p className="text-xs text-indigo-700 font-semibold">Patent filing distribution across Indian states</p>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border-2 border-indigo-300 shadow-sm">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <div className="text-right">
              <p className="text-[10px] text-gray-600 font-semibold">Total States</p>
              <p className="text-base font-black text-indigo-700">{Object.keys(stateData).length}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600 mb-3"></div>
          <p className="text-indigo-700 font-semibold text-sm">Loading state comparison data...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="bg-red-50 border-3 border-red-300 rounded-xl p-6 shadow-inner">
            <p className="text-red-700 font-bold text-sm mb-3">{error}</p>
            <button
              onClick={fetchStateData}
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-300 font-bold shadow-md hover:shadow-lg text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="text-center py-8">
          <div className="bg-yellow-50 border-3 border-yellow-300 rounded-xl p-6 shadow-inner">
            <TrendingUp className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <p className="text-yellow-800 font-bold text-sm">No patent filing data available yet.</p>
            <p className="text-yellow-700 text-xs mt-1">Start filing patents to see state-wise comparison.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Bar Chart */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-inner border border-indigo-200">
            <h4 className="text-xs font-black text-indigo-900 mb-3 text-center uppercase tracking-wide">
              Filing Count by State
            </h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 15, right: 20, left: 10, bottom: 70 }}
                >
                  <defs>
                    {chartData.map((_, index) => (
                      <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={getBarColor(index)} stopOpacity={1} />
                        <stop offset="100%" stopColor={getBarColor(index)} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#cbd5e1" 
                    strokeWidth={1}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="state" 
                    angle={-45}
                    textAnchor="end"
                    height={65}
                    interval={0}
                    tick={{ 
                      fill: '#1e293b', 
                      fontSize: 10, 
                      fontWeight: 600 
                    }}
                  />
                  <YAxis 
                    tick={{ 
                      fill: '#475569', 
                      fontSize: 10, 
                      fontWeight: 600 
                    }}
                    label={{ 
                      value: 'Number of Patent Filings', 
                      angle: -90, 
                      position: 'insideLeft', 
                      style: { 
                        fill: '#1e293b', 
                        fontWeight: 700, 
                        fontSize: 11 
                      } 
                    }}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[8, 8, 0, 0]}
                    animationDuration={1200}
                    animationBegin={100}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#barGradient${index})`}
                        stroke={getBarColor(index)}
                        strokeWidth={2}
                      />
                    ))}
                    <LabelList 
                      dataKey="count" 
                      position="top" 
                      style={{ 
                        fill: '#1e293b', 
                        fontWeight: 'bold', 
                        fontSize: '10px' 
                      }} 
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Total Filings */}
            <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl p-3 border-2 border-indigo-300 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="bg-indigo-500 p-1.5 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Total Filings</p>
              </div>
              <p className="text-3xl font-black text-indigo-900">
                {chartData.reduce((sum, item) => sum + item.count, 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-indigo-700 mt-1 font-semibold">Across all states</p>
            </div>

            {/* Top State */}
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-3 border-2 border-purple-300 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="bg-purple-500 p-1.5 rounded-lg">
                  <Award className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-bold text-purple-800 uppercase tracking-wide">Top State</p>
              </div>
              <p className="text-xl font-black text-purple-900 truncate">
                {chartData[0]?.fullState || 'N/A'}
              </p>
              <p className="text-[10px] text-purple-700 mt-1 font-semibold">
                {chartData[0]?.count.toLocaleString() || 0} filings ({chartData[0]?.percentage || 0}%)
              </p>
            </div>

            {/* Average per State */}
            <div className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl p-3 border-2 border-pink-300 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="bg-pink-500 p-1.5 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-bold text-pink-800 uppercase tracking-wide">Average/State</p>
              </div>
              <p className="text-3xl font-black text-pink-900">
                {chartData.length > 0 
                  ? Math.round(chartData.reduce((sum, item) => sum + item.count, 0) / chartData.length).toLocaleString()
                  : 0
                }
              </p>
              <p className="text-[10px] text-pink-700 mt-1 font-semibold">Filings per state</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-indigo-200 shadow-inner">
            <p className="text-xs text-gray-700 leading-relaxed text-center">
              This comparison chart visualizes patent filing distribution across{' '}
              <span className="font-black text-indigo-700">{chartData.length}</span>
              {' '}Indian states, with{' '}
              <span className="font-black text-purple-700">{chartData[0]?.fullState || 'N/A'}</span>
              {' '}leading with{' '}
              <span className="font-black text-pink-700">{chartData[0]?.count.toLocaleString() || 0}</span>
              {' '}filings. The data helps identify{' '}
              <span className="font-bold text-indigo-600">innovation hotspots</span> and{' '}
              <span className="font-bold text-purple-600">regional patent activity trends</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Import Award icon
import { Award } from 'lucide-react';

export default StateFilingsComparisonChart;
