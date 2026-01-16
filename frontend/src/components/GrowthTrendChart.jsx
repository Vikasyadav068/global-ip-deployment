import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, CheckCircle2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api';

const GrowthTrendChart = ({ 
  totalUsers, 
  dbPatentCount, 
  totalPatentFilings,
  usersStatus,
  dbConnectionStatus,
  filingsStatus 
}) => {
  const [chartData, setChartData] = useState([]);
  const [timeRange, setTimeRange] = useState('7days'); // '7days', '30days', '90days'
  const [loading, setLoading] = useState(true);

  // Update backend with today's metrics whenever they change
  useEffect(() => {
    const updateBackendMetrics = async () => {
      if (totalUsers > 0 || dbPatentCount > 0 || totalPatentFilings > 0) {
        try {
          await fetch(`${API_BASE_URL}/analytics/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              totalUsers: totalUsers,
              totalPatents: dbPatentCount,
              totalFilings: totalPatentFilings
            })
          });
          console.log('✓ Analytics metrics updated in database');
        } catch (error) {
          console.error('Error updating analytics metrics:', error);
        }
      }
    };

    updateBackendMetrics();
  }, [totalUsers, dbPatentCount, totalPatentFilings]);

  // Fetch historical data from backend based on time range
  useEffect(() => {
    const fetchGrowthData = async () => {
      setLoading(true);
      try {
        let days = 7;
        if (timeRange === '30days') days = 30;
        if (timeRange === '90days') days = 90;

        const response = await fetch(`${API_BASE_URL}/analytics/growth?days=${days}`);
        
        if (response.ok) {
          const data = await response.json();
          setChartData(data);
          console.log(`✓ Loaded ${data.length} days of analytics data`);
        } else {
          console.error('Failed to fetch growth data');
          setChartData([]);
        }
      } catch (error) {
        console.error('Error fetching growth data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGrowthData();
    
    // Refresh data every 60 seconds
    const interval = setInterval(fetchGrowthData, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-4 shadow-2xl">
          <p className="font-bold text-gray-800 mb-2">{payload[0]?.payload?.fullDate}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: entry.color }}></div>
              <span className="text-sm font-semibold text-gray-700">{entry.name}:</span>
              <span className="text-sm font-bold" style={{ color: entry.color }}>
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate growth percentages
  const calculateGrowth = (data, key) => {
    if (data.length < 2) return 0;
    const first = data[0][key];
    const last = data[data.length - 1][key];
    if (first === 0) return 0;
    return (((last - first) / first) * 100).toFixed(1);
  };

  const userGrowth = calculateGrowth(chartData, 'users');
  const patentGrowth = calculateGrowth(chartData, 'patents');
  const filingGrowth = calculateGrowth(chartData, 'filings');

  return (
    <div className="bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 rounded-2xl p-6 shadow-xl border border-gray-100">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Growth Trends
            </h2>
            <p className="text-sm text-gray-600">Real-time analytics across all metrics</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-xl p-1.5 border border-purple-200 shadow-sm">
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              timeRange === '7days'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-purple-50'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              timeRange === '30days'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-purple-50'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('90days')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              timeRange === '90days'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-purple-50'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Growth Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 shadow-lg relative">
          {/* Data Source Indicator - Top Right */}
          {usersStatus === 'connected' && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-white/90">Firestore</span>
            </div>
          )}
          
          {/* Value Display */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-white">{totalUsers.toLocaleString()}</span>
            <CheckCircle2 className="w-6 h-6 text-white/90" />
          </div>
          
          {/* Label */}
          <h3 className="text-white/90 text-sm font-medium mb-2">Total Registered Users</h3>
          
          {/* Data Source */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-white/20">
            {usersStatus === 'connected' ? (
              <p className="text-xs text-white/80 font-medium">
                ● Live from Firestore
              </p>
            ) : usersStatus === 'checking' ? (
              <p className="text-xs text-white/60">Connecting...</p>
            ) : (
              <p className="text-xs text-white/60">Connection failed</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 shadow-lg relative">
          {/* Data Source Indicator - Top Right */}
          {dbConnectionStatus === 'connected' && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-white/90">PostgreSQL</span>
            </div>
          )}
          
          {/* Value Display */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-white">{dbPatentCount.toLocaleString()}</span>
            <CheckCircle2 className="w-6 h-6 text-white/90" />
          </div>
          
          {/* Label */}
          <h3 className="text-white/90 text-sm font-medium mb-2">Total Patents</h3>
          
          {/* Data Source */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-white/20">
            {dbConnectionStatus === 'connected' ? (
              <p className="text-xs text-white/80 font-medium">
                ● Live from PostgreSQL
              </p>
            ) : dbConnectionStatus === 'checking' ? (
              <p className="text-xs text-white/60">Connecting...</p>
            ) : (
              <p className="text-xs text-white/60">Connection failed</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 shadow-lg relative">
          {/* Data Source Indicator - Top Right */}
          {filingsStatus === 'connected' && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-white/90">PostgreSQL</span>
            </div>
          )}
          
          {/* Value Display */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-white">{totalPatentFilings.toLocaleString()}</span>
            <CheckCircle2 className="w-6 h-6 text-white/90" />
          </div>
          
          {/* Label */}
          <h3 className="text-white/90 text-sm font-medium mb-2">Patent Filings</h3>
          
          {/* Data Source */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-white/20">
            {filingsStatus === 'connected' ? (
              <p className="text-xs text-white/80 font-medium">
                ● Live from PostgreSQL
              </p>
            ) : filingsStatus === 'checking' ? (
              <p className="text-xs text-white/60">Connecting...</p>
            ) : (
              <p className="text-xs text-white/60">Connection failed</p>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-purple-100 shadow-sm">
        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Loading growth data...</p>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: '600' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: '600' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#a855f7" 
                strokeWidth={3}
                name="Total Users"
                dot={{ fill: '#a855f7', r: 4 }}
                activeDot={{ r: 6, stroke: '#a855f7', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="patents" 
                stroke="#6366f1" 
                strokeWidth={3}
                name="Total Patents"
                dot={{ fill: '#6366f1', r: 4 }}
                activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="filings" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Patent Filings"
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 font-semibold">No historical data available yet</p>
              <p className="text-sm text-gray-500 mt-2">Data will accumulate over time</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="font-semibold">Live data • Updated from database</span>
      </div>
    </div>
  );
};

export default GrowthTrendChart;
