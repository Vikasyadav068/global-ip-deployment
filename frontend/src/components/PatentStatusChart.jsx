import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts';
import { Filter, Download, RefreshCw, TrendingUp, Calendar } from 'lucide-react';

const PatentStatusChart = () => {
  const [allData, setAllData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [chartType, setChartType] = useState('pie');
  
  const STATUS_COLORS = {
    'Active': '#10b981',
    'Granted': '#3b82f6',
    'Application': '#f59e0b',
  };

  const MONTH_NAMES = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
  };

  const fetchStatusData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8080/api/patents/status-counts-by-date');
      
      if (response.ok) {
        const data = await response.json();
        const VALID_STATUSES = ['Active', 'Granted', 'Application'];
        
        const processedData = data.filter(item => {
          const status = item.status;
          if (!status || status === 'null' || status === 'undefined' || status === 'NaN') {
            return false;
          }
          return VALID_STATUSES.includes(status);
        });
        
        setAllData(processedData);
        
        const years = [...new Set(processedData.map(item => item.year).filter(y => y))].sort((a, b) => b - a);
        const months = [...new Set(processedData.map(item => item.month).filter(m => m))].sort();
        
        setAvailableYears(years);
        setAvailableMonths(months);
        
        applyDateFilter(processedData, 'all', 'all', 'all');
        setLoading(false);
      } else {
        setError('Failed to load data');
        setLoading(false);
      }
    } catch (err) {
      setError('Cannot connect to server');
      setLoading(false);
    }
  };

  const applyDateFilter = (data, filter, year, month) => {
    let filtered = data;
    
    if (filter === 'year' && year !== 'all') {
      filtered = data.filter(item => item.year === year);
    } else if (filter === 'month' && year !== 'all' && month !== 'all') {
      filtered = data.filter(item => item.year === year && item.month === month);
    }
    
    const grouped = {};
    filtered.forEach(item => {
      if (!grouped[item.status]) {
        grouped[item.status] = 0;
      }
      grouped[item.status] += Number(item.count) || 0;
    });
    
    const transformedData = Object.entries(grouped).map(([status, count]) => ({
      status: status,
      count: count,
      percentage: 0,
    }));
    
    const total = transformedData.reduce((sum, item) => sum + item.count, 0);
    transformedData.forEach(item => {
      item.percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
    });
    
    transformedData.sort((a, b) => b.count - a.count);
    
    setStatusData(transformedData);
    setSelectedStatuses(transformedData.map(d => d.status));
  };

  useEffect(() => {
    fetchStatusData();
    const interval = setInterval(fetchStatusData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDateFilterChange = (filter, year = selectedYear, month = selectedMonth) => {
    setDateFilter(filter);
    setSelectedYear(year);
    setSelectedMonth(month);
    
    // Update available months when year changes
    if (filter === 'year' && year !== 'all') {
      const monthsForYear = [...new Set(
        allData.filter(item => item.year === year).map(item => item.month).filter(m => m)
      )].sort();
      setAvailableMonths(monthsForYear);
    } else if (filter === 'all') {
      const allMonths = [...new Set(allData.map(item => item.month).filter(m => m))].sort();
      setAvailableMonths(allMonths);
    }
    
    applyDateFilter(allData, filter, year, month);
  };

  const filteredData = statusData.filter(d => selectedStatuses.includes(d.status));

  const getColor = (status, index) => {
    if (STATUS_COLORS[status]) {
      return STATUS_COLORS[status];
    }
    const colors = ['#3b82f6', '#10b981', '#f59e0b'];
    return colors[index % colors.length];
  };

  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-bold text-lg">
          {payload.status}
        </text>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 10} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" className="font-semibold">
          {`${value} patents`}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
          {`(${(percent * 100).toFixed(1)}%)`}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-indigo-200">
          <p className="font-bold text-indigo-900 text-base mb-2">{data.status}</p>
          <p className="text-gray-700 text-sm">
            <span className="font-semibold">Count:</span> {data.count} patents
          </p>
          <p className="text-gray-700 text-sm">
            <span className="font-semibold">Percentage:</span> {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  const downloadCSV = () => {
    const csvContent = [
      ['Status', 'Count', 'Percentage'],
      ...filteredData.map(d => [d.status, d.count, d.percentage + '%'])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patent-status-distribution.csv';
    a.click();
  };

  const toggleStatus = (status) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter(s => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 shadow-lg border border-indigo-100">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-indigo-700 font-medium">Loading patent status data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 shadow-lg border border-red-100">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-700 font-semibold text-lg mb-2">⚠️ {error}</p>
            <button onClick={fetchStatusData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (statusData.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-600 font-medium">No patent status data available</p>
        </div>
      </div>
    );
  }

  const totalPatents = filteredData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 items-start" style={{ gap: '2px' }}>
      <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-5 shadow-lg border border-indigo-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-indigo-900">Patent Status Distribution</h3>
              <p className="text-xs text-indigo-700">{totalPatents} total patents</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={fetchStatusData} className="p-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-200" title="Refresh">
              <RefreshCw size={16} />
            </button>
            <button onClick={downloadCSV} className="p-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-200" title="Export CSV">
              <Download size={16} />
            </button>
            <button onClick={() => setChartType(chartType === 'pie' ? 'donut' : 'pie')} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium">
              {chartType === 'pie' ? 'Donut' : 'Pie'}
            </button>
          </div>
        </div>

        <div className="bg-white/50 rounded-lg p-3">
          {filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-[400px]">
              <p className="text-gray-600">No data to display</p>
            </div>
          ) : (
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={filteredData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percentage }) => `${status}: ${percentage}%`}
                    outerRadius={chartType === 'donut' ? 120 : 130}
                    innerRadius={chartType === 'donut' ? 70 : 0}
                    fill="#8884d8"
                    dataKey="count"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {filteredData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColor(entry.status, index)} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value, entry) => (
                    <span className="text-sm font-medium text-gray-700">{value} ({entry.payload.count})</span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-between h-full" style={{ gap: '2px' }}>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 shadow-lg border border-purple-100 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-purple-600" />
            <h4 className="font-semibold text-sm text-purple-900">Status Filter</h4>
          </div>
          
          <div className="space-y-2">
            {statusData.map((item, index) => (
              <label
                key={item.status}
                className="flex items-center gap-2 px-2 py-1.5 bg-white rounded-lg border border-purple-200 hover:border-purple-300 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(item.status)}
                  onChange={() => toggleStatus(item.status)}
                  className="w-3 h-3 text-purple-600 rounded focus:ring-purple-500"
                />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(item.status, index) }}></div>
                <span className="text-xs font-medium text-gray-700 flex-1">{item.status}</span>
                <span className="text-xs font-bold text-gray-600">{item.count}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 shadow-lg border border-emerald-100 flex-1">
          <h4 className="font-bold text-sm text-emerald-900 mb-3">Summary</h4>
          <div className="space-y-2">
            {filteredData.map((item, index) => (
              <div key={item.status} className="bg-white/70 rounded-lg p-3 border border-emerald-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(item.status, index) }}></div>
                    <span className="text-xs font-medium text-gray-600">{item.status}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-500">{item.percentage}%</span>
                </div>
                <div className="text-xl font-bold" style={{ color: getColor(item.status, index) }}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatentStatusChart;
