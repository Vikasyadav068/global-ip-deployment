import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, TrendingUp, Award, AlertCircle, Users, UserCheck, UserX, Filter, X, Search, Globe } from 'lucide-react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getSearchCounters, getGlobalSearchStats } from '../utils/searchCounters';
import IndiaPatentPanel from '../components/IndiaPatentPanel';
import StateFilingsComparisonChart from '../components/StateFilingsComparisonChart';
import { API_BASE_URL } from '../config/api';
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
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Line,
  LabelList
} from 'recharts';

const LegalStatusPage = ({ userProfile, onNavigateToPatentFiling }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    granted: 0,
    rejected: 0,
    underReview: 0,
    loading: true
  });

  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    basicUsers: 0,
    proUsers: 0,
    enterpriseUsers: 0,
    activeUsers: 0,
    deactivatedUsers: 0,
    onlineUsers: 0,
    loading: true
  });

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    year: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [availableFilters, setAvailableFilters] = useState({
    years: []
  });

  const [searchCounters, setSearchCounters] = useState({
    apiSearchCount: 0,
    localSearchCount: 0,
    totalSearchCount: 0,
    loading: true
  });

  const [globalSearchCounters, setGlobalSearchCounters] = useState({
    apiSearchCount: 0,
    localSearchCount: 0,
    totalSearchCount: 0,
    loading: true
  });

  // Initial load to populate filter options
  useEffect(() => {
    fetchUserStats();
    fetchPatentStats();
    fetchSearchCounters();
    fetchGlobalSearchCounters();
  }, []);

  // Real-time listener for online users
  useEffect(() => {
    console.log('Setting up real-time listener for online users...');
    
    // Set up real-time listener for users collection
    const usersCollection = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
      let onlineCount = 0;
      
      snapshot.forEach((doc) => {
        const userData = doc.data();
        
        // Primary check: isOnline flag (set on login, cleared on logout)
        // Fallback: if isOnline is undefined/null, check lastLogin within 5 minutes (for backward compatibility)
        let isCurrentlyLoggedIn = false;
        
        if (userData.isOnline !== undefined && userData.isOnline !== null) {
          // Use explicit isOnline flag if available
          isCurrentlyLoggedIn = userData.isOnline === true;
        } else {
          // Fallback to time-based check for older user records
          const lastLogin = userData.lastLogin?.toDate?.() || (userData.lastLogin ? new Date(userData.lastLogin) : null);
          isCurrentlyLoggedIn = lastLogin && (new Date() - lastLogin) < 5 * 60 * 1000;
        }
        
        if (isCurrentlyLoggedIn) {
          onlineCount++;
        }
      });
      
      console.log('Real-time online users update:', onlineCount);
      
      // Update only the onlineUsers count without affecting loading state
      setUserStats(prev => ({
        ...prev,
        onlineUsers: onlineCount
      }));
    }, (error) => {
      console.error('Error in real-time listener:', error);
    });

    // Cleanup listener on unmount
    return () => {
      console.log('Cleaning up real-time listener for online users');
      unsubscribe();
    };
  }, []);

  // Reload data when filters change (but not on initial mount)
  useEffect(() => {
    const hasFilters = Object.values(filters).some(value => value !== '');
    if (hasFilters) {
      fetchUserStats();
      fetchPatentStats();
    }
  }, [filters]);

  const fetchSearchCounters = async () => {
    try {
      setSearchCounters(prev => ({ ...prev, loading: true }));
      
      if (userProfile?.uid) {
        console.log('Fetching search counters from Firestore for user:', userProfile.uid);
        const counters = await getSearchCounters(userProfile.uid);
        setSearchCounters({
          apiSearchCount: counters.apiSearchCount || 0,
          localSearchCount: counters.localSearchCount || 0,
          totalSearchCount: counters.totalSearchCount || 0,
          loading: false
        });
        console.log('✅ Search counters loaded:', counters);
      } else {
        console.warn('⚠️ No user profile available for search counters');
        setSearchCounters({
          apiSearchCount: 0,
          localSearchCount: 0,
          totalSearchCount: 0,
          loading: false
        });
      }
    } catch (error) {
      console.error('❌ Error fetching search counters:', error);
      setSearchCounters({
        apiSearchCount: 0,
        localSearchCount: 0,
        totalSearchCount: 0,
        loading: false
      });
    }
  };

  const fetchGlobalSearchCounters = async () => {
    try {
      setGlobalSearchCounters(prev => ({ ...prev, loading: true }));
      console.log('Fetching global search statistics from Firestore...');
      const globalStats = await getGlobalSearchStats();
      setGlobalSearchCounters({
        apiSearchCount: globalStats.apiSearchCount || 0,
        localSearchCount: globalStats.localSearchCount || 0,
        totalSearchCount: globalStats.totalSearchCount || 0,
        loading: false
      });
      console.log('✅ Global search counters loaded:', globalStats);
    } catch (error) {
      console.error('❌ Error fetching global search counters:', error);
      setGlobalSearchCounters({
        apiSearchCount: 0,
        localSearchCount: 0,
        totalSearchCount: 0,
        loading: false
      });
    }
  };

  const fetchUserStats = async () => {
    try {
      setUserStats(prev => ({ ...prev, loading: true }));
      
      console.log('Fetching user statistics from Firestore...');
      
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      let totalUsers = 0;
      let basicUsers = 0;
      let proUsers = 0;
      let enterpriseUsers = 0;
      let activeUsers = 0;
      let deactivatedUsers = 0;
      let onlineUsers = 0;
      
      const yearsSet = new Set();
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        
        // Apply filters
        let matchesFilter = true;
        
        // Date filter (check createdAt or registrationDate)
        const userDate = userData.createdAt?.toDate?.() || userData.registrationDate?.toDate?.() || new Date(userData.createdAt || userData.registrationDate);
        const userYear = userDate.getFullYear();
        
        if (filters.startDate && userDate < new Date(filters.startDate)) {
          matchesFilter = false;
        }
        if (filters.endDate && userDate > new Date(filters.endDate)) {
          matchesFilter = false;
        }
        
        // Year filter
        if (filters.year && userYear !== parseInt(filters.year)) {
          matchesFilter = false;
        }
        
        // Collect available years
        yearsSet.add(userYear);
        
        // Debug: Log first user to see structure
        if (totalUsers === 0) {
          console.log('Sample user data structure:', userData);
          console.log('User year:', userYear);
        }
        
        if (!matchesFilter) return;
        
        totalUsers++;
        
        // Count by subscription type
        const subscription = (userData.subscriptionType || 'basic').toLowerCase();
        if (subscription === 'basic') {
          basicUsers++;
        } else if (subscription === 'pro') {
          proUsers++;
        } else if (subscription === 'enterprise') {
          enterpriseUsers++;
        } else {
          // Default to basic if unknown
          basicUsers++;
        }
        
        // Count by account status
        const accountStatus = (userData.accountStatus || 'active').toLowerCase();
        
        if (accountStatus === 'active') {
          activeUsers++;
        } else if (accountStatus === 'deactivated') {
          deactivatedUsers++;
        } else {
          // Default to active if unknown
          activeUsers++;
        }
        
        // Count currently logged in users
        // Primary check: isOnline flag (set on login, cleared on logout)
        // Fallback: if isOnline is undefined/null, check lastLogin within 5 minutes (for backward compatibility)
        let isCurrentlyLoggedIn = false;
        
        if (userData.isOnline !== undefined && userData.isOnline !== null) {
          // Use explicit isOnline flag if available
          isCurrentlyLoggedIn = userData.isOnline === true;
        } else {
          // Fallback to time-based check for older user records
          const lastLogin = userData.lastLogin?.toDate?.() || (userData.lastLogin ? new Date(userData.lastLogin) : null);
          isCurrentlyLoggedIn = lastLogin && (new Date() - lastLogin) < 5 * 60 * 1000;
        }
        
        if (isCurrentlyLoggedIn) {
          onlineUsers++;
        }
      });
      
      // Update available filter options
      setAvailableFilters({
        years: Array.from(yearsSet).sort((a, b) => b - a)
      });
      
      console.log('User filter options:', {
        years: Array.from(yearsSet)
      });
      console.log('User filter counts:', {
        yearsCount: yearsSet.size
      });
      console.log('Final availableFilters state will be:', {
        years: Array.from(yearsSet).sort((a, b) => b - a)
      });
      
      console.log('User Stats:', {
        totalUsers,
        basicUsers,
        proUsers,
        enterpriseUsers,
        activeUsers,
        deactivatedUsers
      });
      
      setUserStats({
        totalUsers,
        basicUsers,
        proUsers,
        enterpriseUsers,
        activeUsers,
        deactivatedUsers,
        onlineUsers,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      setUserStats({
        totalUsers: 0,
        basicUsers: 0,
        proUsers: 0,
        enterpriseUsers: 0,
        activeUsers: 0,
        deactivatedUsers: 0,
        onlineUsers: 0,
        loading: false
      });
    }
  };

  const fetchPatentStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));
      
      // Fetch all patents from the system (same endpoint as Admin Panel)
      const response = await fetch(`${API_BASE_URL}/patent-filing/all`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      
      if (response.ok) {
        let allPatents = await response.json();
        
        console.log('Legal Status - Fetched patents:', allPatents);
        console.log('Legal Status - Total patents:', allPatents.length);
        
        // Extract available filter options from patent data
        const patentYears = new Set();
        
        allPatents.forEach(patent => {
          // Extract year from filing date
          const patentDate = new Date(patent.filingDate || patent.createdAt || patent.timestamp);
          const patentYear = patentDate.getFullYear();
          patentYears.add(patentYear);
          
          // Debug: Log first patent to see structure
          if (allPatents.indexOf(patent) === 0) {
            console.log('Sample patent data structure:', patent);
            console.log('Patent year:', patentYear);
          }
        });
        
        console.log('Patent year data extracted:', {
          years: Array.from(patentYears)
        });
        console.log('Patent filter counts:', {
          yearsCount: patentYears.size
        });
        
        // Merge with existing filter options from user data
        setAvailableFilters(prev => {
          const merged = {
            years: Array.from(new Set([...prev.years, ...patentYears])).sort((a, b) => b - a)
          };
          console.log('Merging filters - Previous:', prev);
          console.log('Merging filters - Patent data:', {
            years: Array.from(patentYears)
          });
          console.log('Merging filters - Final merged:', merged);
          return merged;
        });
        
        // Apply filters
        let filteredPatents = allPatents.filter(patent => {
          // Date filter (check filing date or createdAt)
          const patentDate = new Date(patent.filingDate || patent.createdAt || patent.timestamp);
          const patentYear = patentDate.getFullYear();
          
          if (filters.startDate && patentDate < new Date(filters.startDate)) {
            return false;
          }
          if (filters.endDate && patentDate > new Date(filters.endDate)) {
            return false;
          }
          
          // Year filter
          if (filters.year && patentYear !== parseInt(filters.year)) {
            return false;
          }
          
          return true;
        });
        
        console.log('Filtered patents:', filteredPatents.length);
        
        // Calculate statistics (same logic as Admin Panel)
        const total = filteredPatents.length;
        const granted = filteredPatents.filter(p => p.stage5Granted === true).length;
        const rejected = filteredPatents.filter(p => {
          console.log(`Patent ${p.id} status:`, p.status);
          return p.status === 'Patent is Rejected';
        }).length;
        const activated = filteredPatents.filter(p => p.isActive === true || p.isActive === undefined).length;
        const deactivated = filteredPatents.filter(p => p.isActive === false).length;
        
        const underReview = total - granted - rejected;
        
        console.log('Legal Status - Stats:', { total, granted, rejected, underReview, activated, deactivated });
        
        setStats({
          total,
          granted,
          rejected,
          underReview,
          activated,
          deactivated,
          loading: false
        });
      } else {
        console.error('Failed to fetch patent statistics');
        setStats({
          total: 0,
          granted: 0,
          rejected: 0,
          underReview: 0,
          activated: 0,
          deactivated: 0,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error fetching patent statistics:', error);
      setStats({
        total: 0,
        granted: 0,
        rejected: 0,
        underReview: 0,
        loading: false
      });
    }
  };

  const StatCard = ({ title, value, icon: Icon, gradient, iconBg, iconColor, description }) => (
    <div className="relative group">
      {/* Animated background glow */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-2xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500`}></div>
      
      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-gray-100 hover:border-transparent overflow-hidden">
        {/* Gradient top border */}
        <div className={`h-1.5 bg-gradient-to-r ${gradient}`}></div>
        
        {/* Card Content */}
        <div className="p-8">
          {/* Header with Icon */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {title}
              </p>
              {stats.loading ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  <span className="text-gray-400 text-lg font-medium">Loading...</span>
                </div>
              ) : (
                <h3 className="text-5xl font-black text-gray-900 tracking-tight">
                  {value.toLocaleString()}
                </h3>
              )}
            </div>
            
            {/* Icon */}
            <div className={`${iconBg} p-4 rounded-2xl shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
              <Icon className={`w-8 h-8 ${iconColor}`} strokeWidth={2.5} />
            </div>
          </div>
          
          {/* Description */}
          <p className="text-sm text-gray-600 font-medium leading-relaxed">
            {description}
          </p>
          
          {/* Progress Bar */}
          {!stats.loading && stats.total > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">Status Overview</span>
                <span className="text-xs font-bold text-gray-700">
                  {title === 'Total Patents' 
                    ? '100%' 
                    : `${Math.round((value / stats.total) * 100)}%`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-2.5 bg-gradient-to-r ${gradient} rounded-full transition-all duration-1000 ease-out shadow-sm`}
                  style={{ 
                    width: title === 'Total Patents' 
                      ? '100%' 
                      : `${(value / stats.total) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Decorative corner accent */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-5 rounded-bl-full`}></div>
      </div>
    </div>
  );

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    // Reset filters
    setFilters({
      startDate: '',
      endDate: '',
      year: ''
    });
    setShowFilters(false);
    
    // Reset stats to loading state
    setStats(prev => ({ ...prev, loading: true }));
    setUserStats(prev => ({ ...prev, loading: true }));
    
    // Immediately fetch fresh data
    fetchUserStats();
    fetchPatentStats();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div key={refreshKey} className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-xl shadow-lg">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                Legal Status Dashboard
              </h1>
              <p className="text-gray-600 text-lg mt-1 font-medium">
                Monitor your patent portfolio and legal status
              </p>
            </div>
          </div>
          
          {/* System-wide Badge - Top Right */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-md border-2 transition-all duration-300 ${
                hasActiveFilters 
                  ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Filters {hasActiveFilters && `(${Object.values(filters).filter(v => v !== '').length})`}
              </span>
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Immediately close filters and reset them
                setShowFilters(false);
                setFilters({
                  startDate: '',
                  endDate: '',
                  year: ''
                });
                
                // Set all data to loading state immediately
                setStats(prev => ({ ...prev, loading: true }));
                setUserStats(prev => ({ ...prev, loading: true }));
                setSearchCounters(prev => ({ ...prev, loading: true }));
                setGlobalSearchCounters(prev => ({ ...prev, loading: true }));
                
                // Use setTimeout to ensure state updates process, then fetch fresh data
                setTimeout(async () => {
                  try {
                    await Promise.all([
                      fetchUserStats(),
                      fetchPatentStats(),
                      fetchSearchCounters(),
                      fetchGlobalSearchCounters()
                    ]);
                  } catch (error) {
                    console.error('Error refreshing data:', error);
                  }
                }, 0);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-md border-2 bg-red-500 border-red-500 text-white hover:bg-red-600 transition-all duration-300"
            >
              <span className="text-sm font-semibold">
                don't click here
              </span>
            </button>
            
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md border border-gray-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">
                System-wide Patent Statistics
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-8 bg-white rounded-2xl shadow-xl p-6 border-2 border-indigo-100 animate-fadeIn relative z-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900">Filter Statistics</h3>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200 font-semibold text-sm"
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative">
            {/* Date Range Filters */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all duration-200"
              />
            </div>
            
            {/* Year Filter */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Year
              </label>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-all duration-200 bg-white relative z-10 appearance-auto"
              >
                <option value="">All Years</option>
                {availableFilters.years.length === 0 && (
                  <option disabled>No years available</option>
                )}
                {availableFilters.years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {availableFilters.years.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">No year data found in database</p>
              )}
            </div>
            
            {/* Reset Filter Button */}
            <div className="relative flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 font-semibold"
              >
                Reset and Close Filter
              </button>
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm font-semibold text-gray-600">Active Filters:</span>
              {filters.startDate && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                  From: {new Date(filters.startDate).toLocaleDateString()}
                  <button onClick={() => handleFilterChange('startDate', '')} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.endDate && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                  To: {new Date(filters.endDate).toLocaleDateString()}
                  <button onClick={() => handleFilterChange('endDate', '')} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.year && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  Year: {filters.year}
                  <button onClick={() => handleFilterChange('year', '')} className="hover:text-purple-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search Statistics Card with Two Circles */}
      <div className="mb-8 w-full">
        <div className="relative group bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border-2 border-purple-300 hover:border-purple-400 overflow-hidden">
          {/* Background Gradient Animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-purple-100/20 to-pink-100/30 opacity-60"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-200/10 via-purple-200/10 to-pink-200/10 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
          
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/20 rounded-full blur-3xl opacity-40 -translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-pink-200/30 to-purple-200/20 rounded-full blur-3xl opacity-40 translate-x-1/3 translate-y-1/3"></div>
          
          <div className="relative p-6">
            {/* Flex Container - Text Left, Circles Right */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              
              {/* Left Side - Text Content */}
              <div className="flex-1 lg:max-w-md space-y-4">
                {/* Header */}
                <div className="text-left">
                  <h2 className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 mb-2 leading-tight">
                    Search Analytics Dashboard
                  </h2>
                  <p className="text-gray-600 text-base font-medium leading-relaxed">Track your search activity and global platform usage</p>
                </div>
                
                {/* Stats Summary */}
                <div className="space-y-3 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-purple-100/50 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <span className="text-gray-600 font-semibold text-sm">Your Contribution</span>
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                      {globalSearchCounters.totalSearchCount > 0 
                        ? ((searchCounters.totalSearchCount / globalSearchCounters.totalSearchCount) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                      <span className="text-gray-600 font-semibold text-sm">Online Users</span>
                    </div>
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                      {userStats.onlineUsers}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Right Side - Two Circles */}
              <div className="flex flex-row lg:flex-row gap-6 lg:gap-8 items-center justify-end flex-1 lg:ml-6">
              
              {/* Personal Search Counter Circle */}
              <div className="flex flex-col items-center">
                <div className="relative group/circle">
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-0 group-hover/circle:opacity-40 blur-xl transition-all duration-500"></div>
                  
                  {/* Circle */}
                  <div className="relative bg-white/90 backdrop-blur-md rounded-full p-6 w-44 h-44 sm:w-48 sm:h-48 lg:w-52 lg:h-52 xl:w-56 xl:h-56 flex flex-col items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-blue-300">
                    {/* Icon */}
                    <div className="mb-2 bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 lg:p-3 rounded-full shadow-lg">
                      <Search className="w-5 h-5 lg:w-6 lg:h-6 text-white" strokeWidth={2.5} />
                    </div>
                    
                    {/* Counter */}
                    {searchCounters.loading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-purple-500"></div>
                        <span className="text-xs text-gray-500 font-medium">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-4xl sm:text-5xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-1">
                          {searchCounters.totalSearchCount}
                        </h3>
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Your Searches</p>
                        
                        {/* Breakdown */}
                        <div className="space-y-1 w-full px-3 lg:px-4">
                          <div className="flex items-center justify-between text-xs lg:text-sm">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              <span className="font-semibold text-blue-600">API</span>
                            </div>
                            <span className="font-bold text-blue-700">{searchCounters.apiSearchCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs lg:text-sm">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                              <span className="font-semibold text-purple-600">Local</span>
                            </div>
                            <span className="font-bold text-purple-700">{searchCounters.localSearchCount}</span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Decorative Ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="48%"
                        fill="none"
                        stroke="url(#personalGradient)"
                        strokeWidth="3"
                        strokeDasharray={`${searchCounters.totalSearchCount > 0 ? 100 * 3.14 : 0} 314`}
                        className="transition-all duration-1000"
                        opacity="0.3"
                      />
                      <defs>
                        <linearGradient id="personalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#9333ea', stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
                
                {/* Label */}
                <div className="mt-4 bg-gradient-to-r from-blue-100/80 to-purple-100/80 px-4 py-2 rounded-full border border-blue-200/50">
                  <p className="text-sm font-bold text-blue-700">Personal Activity</p>
                </div>
              </div>

              {/* Global Search Counter Circle */}
              <div className="flex flex-col items-center">
                <div className="relative group/circle">
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-0 group-hover/circle:opacity-40 blur-xl transition-all duration-500"></div>
                  
                  {/* Circle */}
                  <div className="relative bg-white/90 backdrop-blur-md rounded-full p-6 w-44 h-44 sm:w-48 sm:h-48 lg:w-52 lg:h-52 xl:w-56 xl:h-56 flex flex-col items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-purple-300">
                    {/* Icon */}
                    <div className="mb-2 bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 lg:p-3 rounded-full shadow-lg">
                      <Globe className="w-5 h-5 lg:w-6 lg:h-6 text-white" strokeWidth={2.5} />
                    </div>
                    
                    {/* Counter */}
                    {globalSearchCounters.loading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-pink-500"></div>
                        <span className="text-xs text-gray-500 font-medium">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-4xl sm:text-5xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-1">
                          {globalSearchCounters.totalSearchCount}
                        </h3>
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Global Searches</p>
                        
                        {/* Breakdown */}
                        <div className="space-y-1 w-full px-3 lg:px-4">
                          <div className="flex items-center justify-between text-xs lg:text-sm">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                              <span className="font-semibold text-purple-600">API</span>
                            </div>
                            <span className="font-bold text-purple-700">{globalSearchCounters.apiSearchCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs lg:text-sm">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                              <span className="font-semibold text-pink-600">Local</span>
                            </div>
                            <span className="font-bold text-pink-700">{globalSearchCounters.localSearchCount}</span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Decorative Ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="48%"
                        fill="none"
                        stroke="url(#globalGradient)"
                        strokeWidth="3"
                        strokeDasharray={`${globalSearchCounters.totalSearchCount > 0 ? 100 * 3.14 : 0} 314`}
                        className="transition-all duration-1000"
                        opacity="0.3"
                      />
                      <defs>
                        <linearGradient id="globalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#9333ea', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
                
                {/* Label */}
                <div className="mt-4 bg-gradient-to-r from-purple-100/80 to-pink-100/80 px-4 py-2 rounded-full border border-purple-200/50">
                  <p className="text-sm font-bold text-purple-700">Platform Wide</p>
                </div>
              </div>
            </div>
            
            </div>
          </div>
        </div>
      </div>

      {/* Patent Portfolio Comparison Chart */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-3xl shadow-2xl p-6 border-2 border-indigo-300 hover:shadow-3xl transition-all duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Patent Portfolio Analysis
                </h3>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  Comprehensive overview of all patent applications and their current status
                </p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-xl border-2 border-indigo-200 shadow-md">
              <div className="text-center">
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wide">Total Applications</p>
                <p className="text-4xl font-black text-indigo-900">{stats.total}</p>
              </div>
            </div>
          </div>

          {!stats.loading && stats.total > 0 ? (
            <div className="space-y-8">
              {/* Composed Chart with Bars and Lines */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-indigo-100">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={[
                        {
                          status: 'Total\nPatents',
                          count: stats.total,
                          percentage: 100,
                          color: '#6366f1'
                        },
                        {
                          status: 'Granted\nPatents',
                          count: stats.granted,
                          percentage: stats.total > 0 ? Math.round((stats.granted / stats.total) * 100) : 0,
                          color: '#10b981'
                        },
                        {
                          status: 'Rejected\nPatents',
                          count: stats.rejected,
                          percentage: stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0,
                          color: '#ef4444'
                        },
                        {
                          status: 'Under\nReview',
                          count: stats.underReview,
                          percentage: stats.total > 0 ? Math.round((stats.underReview / stats.total) * 100) : 0,
                          color: '#f59e0b'
                        },
                        {
                          status: 'Activated\nPatents',
                          count: stats.activated,
                          percentage: stats.total > 0 ? Math.round((stats.activated / stats.total) * 100) : 0,
                          color: '#06b6d4'
                        },
                        {
                          status: 'Deactivated\nPatents',
                          count: stats.deactivated,
                          percentage: stats.total > 0 ? Math.round((stats.deactivated / stats.total) * 100) : 0,
                          color: '#64748b'
                        }
                      ]}
                      margin={{ top: 30, right: 40, bottom: 60, left: 40 }}
                    >
                      <defs>
                        <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#818cf8" stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="grantedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#34d399" stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="rejectedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#f87171" stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="reviewGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="activatedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="deactivatedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#64748b" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" strokeWidth={1.5} />
                      <XAxis 
                        dataKey="status" 
                        angle={0}
                        height={70}
                        tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 700 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 600 }}
                        label={{ 
                          value: 'Number of Patents', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { fill: '#1e293b', fontWeight: 700, fontSize: 13 }
                        }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: '#7c3aed', fontSize: 12, fontWeight: 600 }}
                        label={{ 
                          value: 'Percentage (%)', 
                          angle: 90, 
                          position: 'insideRight',
                          style: { fill: '#7c3aed', fontWeight: 700, fontSize: 13 }
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                          border: '3px solid #6366f1',
                          borderRadius: '16px',
                          boxShadow: '0 20px 40px rgba(99, 102, 241, 0.2)',
                          padding: '16px'
                        }}
                        formatter={(value, name) => {
                          if (name === 'count') return [<span className="font-bold text-lg">{value} patents</span>, 'Count'];
                          if (name === 'percentage') return [<span className="font-bold text-lg text-purple-600">{value}%</span>, 'Percentage'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => <span className="font-black text-gray-900 text-base">{label.replace('\n', ' ')}</span>}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                        formatter={(value) => <span className="font-bold text-gray-700 text-sm">{value === 'count' ? 'Patent Count' : 'Success Rate %'}</span>}
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="count" 
                        radius={[12, 12, 0, 0]}
                        animationDuration={1500}
                      >
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              index === 0 ? 'url(#totalGradient)' :
                              index === 1 ? 'url(#grantedGradient)' :
                              index === 2 ? 'url(#rejectedGradient)' :
                              index === 3 ? 'url(#reviewGradient)' :
                              index === 4 ? 'url(#activatedGradient)' :
                              'url(#deactivatedGradient)'
                            }
                          />
                        ))}
                        <LabelList 
                          dataKey="count" 
                          position="top" 
                          style={{ fill: '#1e293b', fontWeight: 900, fontSize: 14 }}
                        />
                      </Bar>
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="percentage" 
                        stroke="#7c3aed" 
                        strokeWidth={4}
                        dot={{ fill: '#7c3aed', r: 8, strokeWidth: 3, stroke: '#fff' }}
                        activeDot={{ r: 10, strokeWidth: 3 }}
                        animationDuration={2000}
                      >
                        <LabelList 
                          dataKey="percentage" 
                          position="top" 
                          formatter={(value) => `${value}%`}
                          style={{ fill: '#7c3aed', fontWeight: 900, fontSize: 13 }}
                        />
                      </Line>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stats cards removed as per user request - only chart is shown */}

              {/* Insights Section */}
              <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black mb-2">Portfolio Insights</h4>
                    <p className="text-sm text-white/90 leading-relaxed">
                      <span className="font-bold">{stats.granted}</span> patents have been successfully granted 
                      ({stats.total > 0 ? Math.round((stats.granted / stats.total) * 100) : 0}% success rate), 
                      while <span className="font-bold">{stats.underReview}</span> applications are currently under review. 
                      Your portfolio demonstrates {stats.rejected === 0 ? 'perfect' : 'strong'} application quality 
                      with only <span className="font-bold">{stats.rejected}</span> rejection{stats.rejected !== 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : stats.loading ? (
            <div className="animate-pulse space-y-6">
              <div className="h-80 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl"></div>
              <div className="grid grid-cols-4 gap-4">
                <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
                <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
                <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
                <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-xl font-bold text-gray-600">No patent data available</p>
              <p className="text-gray-500 mt-2">File your first patent to see your portfolio analysis</p>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Details with Radar Chart */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-cyan-50/30 rounded-2xl shadow-2xl p-8 border-2 border-blue-200/50 hover:shadow-3xl hover:border-blue-300 transition-all duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-2xl shadow-lg transform hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Subscription Details
                </h3>
                <p className="text-sm text-gray-600 font-medium mt-1">User distribution across subscription tiers</p>
              </div>
            </div>
            <div className="bg-blue-100 px-4 py-2 rounded-xl border-2 border-blue-300">
              <p className="text-xs text-blue-600 font-bold uppercase">Total Users</p>
              <p className="text-2xl font-black text-blue-900">{userStats.totalUsers}</p>
            </div>
          </div>

          {userStats.loading ? (
            <div className="animate-pulse space-y-6">
              <div className="h-96 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
              <div className="grid grid-cols-4 gap-4">
                <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
                <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
                <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
                <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Radar Chart */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-inner border border-blue-100">
                <h4 className="text-lg font-bold text-gray-800 mb-4 text-center flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                  User Distribution Overview
                  <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
                </h4>
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart 
                      cx="50%" 
                      cy="50%" 
                      outerRadius="70%" 
                      data={[
                        {
                          category: 'Total Users',
                          value: userStats.totalUsers,
                          fullMark: userStats.totalUsers || 100
                        },
                        {
                          category: 'Basic',
                          value: userStats.basicUsers,
                          fullMark: userStats.totalUsers || 100
                        },
                        {
                          category: 'Pro',
                          value: userStats.proUsers,
                          fullMark: userStats.totalUsers || 100
                        },
                        {
                          category: 'Enterprise',
                          value: userStats.enterpriseUsers,
                          fullMark: userStats.totalUsers || 100
                        },
                        {
                          category: 'Active',
                          value: userStats.activeUsers,
                          fullMark: userStats.totalUsers || 100
                        }
                      ]}
                    >
                      <defs>
                        <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                          <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.7}/>
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                        </linearGradient>
                      </defs>
                      <PolarGrid 
                        stroke="#cbd5e1" 
                        strokeWidth={2} 
                        strokeDasharray="5 5"
                      />
                      <PolarAngleAxis 
                        dataKey="category" 
                        tick={{ fill: '#1e293b', fontSize: 14, fontWeight: 700 }}
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, userStats.totalUsers || 100]}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                      />
                      <Radar 
                        name="User Distribution" 
                        dataKey="value" 
                        stroke="#2563eb" 
                        strokeWidth={4}
                        fill="url(#radarGradient)" 
                        fillOpacity={0.7}
                        animationDuration={2000}
                        animationBegin={200}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                          border: '3px solid #3b82f6',
                          borderRadius: '16px',
                          padding: '16px',
                          boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)'
                        }}
                        labelStyle={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}
                        formatter={(value, name, props) => [
                          <span className="font-bold text-blue-700 text-base">
                            {value} users
                            {props.payload.category !== 'Total Users' && userStats.totalUsers > 0 
                              ? ` (${Math.round((value / userStats.totalUsers) * 100)}%)`
                              : ''
                            }
                          </span>,
                          props.payload.category
                        ]}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '24px' }}
                        iconType="circle"
                        formatter={() => <span className="font-bold text-gray-700 text-sm">User Distribution</span>}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stats Summary Cards - Numbers visible only on hover */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Total Users */}
                <div className="group relative bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-2xl p-6 border-4 border-blue-400 hover:border-blue-600 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm font-black text-blue-700 uppercase tracking-wider">Total Users</p>
                    {/* Hidden by default, visible on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/95 via-indigo-500/95 to-blue-600/95 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                      <h4 className="text-5xl font-black text-white drop-shadow-lg">
                        {userStats.totalUsers}
                      </h4>
                      <p className="text-lg text-white/90 font-bold mt-3">100% Platform Users</p>
                    </div>
                  </div>
                </div>

                {/* Basic Users */}
                <div className="group relative bg-gradient-to-br from-gray-50 via-gray-100 to-slate-100 rounded-2xl p-6 border-4 border-gray-500 hover:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-gradient-to-br from-gray-500 to-slate-600 p-5 rounded-2xl mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm font-black text-gray-700 uppercase tracking-wider">Basic</p>
                    {/* Hidden by default, visible on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-600/95 via-slate-600/95 to-gray-700/95 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                      <h4 className="text-5xl font-black text-white drop-shadow-lg">
                        {userStats.basicUsers}
                      </h4>
                      <p className="text-lg text-white/90 font-bold mt-3">
                        {userStats.totalUsers > 0 ? Math.round((userStats.basicUsers / userStats.totalUsers) * 100) : 0}% of Total
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pro Users */}
                <div className="group relative bg-gradient-to-br from-purple-50 via-purple-100 to-pink-100 rounded-2xl p-6 border-4 border-purple-500 hover:border-purple-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-5 rounded-2xl mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm font-black text-purple-700 uppercase tracking-wider">Pro</p>
                    {/* Hidden by default, visible on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/95 via-pink-600/95 to-purple-700/95 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                      <h4 className="text-5xl font-black text-white drop-shadow-lg">
                        {userStats.proUsers}
                      </h4>
                      <p className="text-lg text-white/90 font-bold mt-3">
                        {userStats.totalUsers > 0 ? Math.round((userStats.proUsers / userStats.totalUsers) * 100) : 0}% of Total
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enterprise Users */}
                <div className="group relative bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 rounded-2xl p-6 border-4 border-amber-500 hover:border-amber-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-2xl mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm font-black text-amber-700 uppercase tracking-wider">Enterprise</p>
                    {/* Hidden by default, visible on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-600/95 via-orange-600/95 to-amber-700/95 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                      <h4 className="text-5xl font-black text-white drop-shadow-lg">
                        {userStats.enterpriseUsers}
                      </h4>
                      <p className="text-lg text-white/90 font-bold mt-3">
                        {userStats.totalUsers > 0 ? Math.round((userStats.enterpriseUsers / userStats.totalUsers) * 100) : 0}% of Total
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Status Section */}
              <div className="border-t-2 border-gradient-to-r from-blue-200 via-purple-200 to-pink-200 pt-8 mt-2">
                <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border-2 border-blue-200">
                  <h4 className="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                    <AlertCircle className="w-7 h-7 text-purple-600" />
                    Account Status Overview
                  </h4>
                  <p className="text-sm text-gray-600 font-medium">Real-time monitoring of active and deactivated accounts</p>
                </div>
                
                {/* Account Status Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Active Users - Radial Chart */}
                  <div className="group bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-8 border-4 border-green-400 hover:border-green-600 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <UserCheck className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-base font-black text-green-700 uppercase tracking-wider">Active Users</p>
                        <p className="text-sm text-green-600 font-semibold">Currently active accounts</p>
                      </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-inner border border-green-200">
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart 
                            cx="50%" 
                            cy="50%" 
                            innerRadius="25%" 
                            outerRadius="85%" 
                            barSize={35}
                            data={[
                              {
                                name: 'Active',
                                value: userStats.totalUsers > 0 ? (userStats.activeUsers / userStats.totalUsers) * 100 : 0,
                                fill: 'url(#activeRadialGradient)',
                                count: userStats.activeUsers
                              }
                            ]}
                            startAngle={90}
                            endAngle={-270}
                          >
                            <RadialBar
                              background={{ fill: '#d1fae5', opacity: 0.3 }}
                              dataKey="value"
                              cornerRadius={15}
                              animationDuration={2000}
                              animationBegin={200}
                            />
                            <text 
                              x="50%" 
                              y="42%" 
                              textAnchor="middle" 
                              dominantBaseline="middle"
                              className="text-5xl font-black fill-green-900"
                            >
                              {userStats.activeUsers}
                            </text>
                            <text 
                              x="50%" 
                              y="58%" 
                              textAnchor="middle" 
                              dominantBaseline="middle"
                              className="text-xl font-bold fill-green-600"
                            >
                              ({userStats.totalUsers > 0 ? Math.round((userStats.activeUsers / userStats.totalUsers) * 100) : 0}%)
                            </text>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                                border: '3px solid #10b981',
                                borderRadius: '16px',
                                padding: '16px',
                                boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)'
                              }}
                              labelStyle={{ fontWeight: 'bold', fontSize: '14px', color: '#065f46' }}
                              formatter={(value, name, props) => [
                                <span className="font-bold text-green-700 text-base">
                                  {props.payload.count} users ({value.toFixed(1)}% of total)
                                </span>,
                                'Active Users'
                              ]}
                            />
                            <defs>
                              <linearGradient id="activeRadialGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                                <stop offset="50%" stopColor="#059669" stopOpacity={0.95}/>
                                <stop offset="100%" stopColor="#047857" stopOpacity={0.9}/>
                              </linearGradient>
                            </defs>
                          </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Deactivated Users - Area Chart */}
                  <div className="group bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 rounded-2xl p-8 border-4 border-red-400 hover:border-red-600 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-gradient-to-br from-red-500 to-rose-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <UserX className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-base font-black text-red-700 uppercase tracking-wider">Deactivated Users</p>
                        <p className="text-sm text-red-600 font-semibold">Inactive accounts</p>
                      </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-inner border border-red-200">
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={[
                              { category: 'Total\nUsers', value: userStats.totalUsers, label: 'Total' },
                              { category: 'Active\nUsers', value: userStats.activeUsers, label: 'Active' },
                              { category: 'Deactivated\nUsers', value: userStats.deactivatedUsers, label: 'Deactivated' }
                            ]}
                            margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
                          >
                            <defs>
                              <linearGradient id="deactivatedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                                <stop offset="50%" stopColor="#dc2626" stopOpacity={0.5}/>
                                <stop offset="95%" stopColor="#b91c1c" stopOpacity={0.2}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#fecaca" strokeWidth={2} />
                            <XAxis 
                              dataKey="category" 
                              tick={{ fill: '#991b1b', fontSize: 12, fontWeight: 700 }}
                              angle={0}
                              height={60}
                            />
                            <YAxis 
                              tick={{ fill: '#991b1b', fontSize: 12, fontWeight: 600 }}
                              label={{ 
                                value: 'User Count', 
                                angle: -90, 
                                position: 'insideLeft',
                                style: { fill: '#991b1b', fontWeight: 700, fontSize: 13 }
                              }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                                border: '3px solid #ef4444',
                                borderRadius: '16px',
                                padding: '16px',
                                boxShadow: '0 20px 40px rgba(239, 68, 68, 0.3)'
                              }}
                              labelStyle={{ fontWeight: 'bold', fontSize: '14px', color: '#7f1d1d' }}
                              formatter={(value, name, props) => [
                                <span className="font-bold text-red-700 text-base">{value} users</span>,
                                <span className="font-bold">{props.payload.label}</span>
                              ]}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#dc2626" 
                              strokeWidth={4}
                              fill="url(#deactivatedGradient)"
                              animationDuration={2000}
                              animationBegin={200}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* India Patent Distribution Map */}
      <div className="mb-8">
        <IndiaPatentPanel showHeatMap={true} />
      </div>

      {/* State-wise Filings Comparison Chart */}
      <div className="mb-8">
        <StateFilingsComparisonChart />
      </div>

      {/* Additional Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Success Rate Chart */}
        <div className="group bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-3xl shadow-2xl p-4 border-4 border-purple-400 hover:border-purple-600 hover:shadow-3xl hover:-translate-y-2 transition-all duration-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Success Rate</h3>
                <p className="text-xs text-purple-700 font-semibold mt-0.5">Application approval metrics</p>
              </div>
            </div>
          </div>
          
          {!stats.loading && stats.total > 0 ? (
            <div className="space-y-3">
              {/* Pie Chart */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 shadow-inner border border-purple-100">
                <h4 className="text-xs font-bold text-purple-800 mb-2 text-center uppercase tracking-wide">Distribution Breakdown</h4>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { 
                            name: 'Successful Applications', 
                            value: stats.total - stats.rejected,
                            percentage: ((stats.total - stats.rejected) / stats.total * 100).toFixed(1)
                          },
                          { 
                            name: 'Rejected Applications', 
                            value: stats.rejected,
                            percentage: (stats.rejected / stats.total * 100).toFixed(1)
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                        animationDuration={1500}
                        animationBegin={100}
                        label={({percentage}) => `${percentage}%`}
                        labelLine={true}
                      >
                        <Cell fill="url(#successGradient)" stroke="#a855f7" strokeWidth={2} />
                        <Cell fill="url(#failureGradient)" stroke="#9ca3af" strokeWidth={2} />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                          border: '3px solid #a855f7',
                          borderRadius: '16px',
                          boxShadow: '0 20px 40px rgba(168, 85, 247, 0.3)',
                          padding: '16px'
                        }}
                        labelStyle={{ fontWeight: 'bold', fontSize: '14px', color: '#7e22ce' }}
                        formatter={(value, name, props) => [
                          <span className="font-bold text-base">{value} applications ({props.payload.percentage}%)</span>,
                          <span className="font-bold">{props.payload.name}</span>
                        ]}
                      />
                      <defs>
                        <linearGradient id="successGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity={1}/>
                          <stop offset="50%" stopColor="#ec4899" stopOpacity={0.95}/>
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.9}/>
                        </linearGradient>
                        <linearGradient id="failureGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#9ca3af" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#6b7280" stopOpacity={0.7}/>
                        </linearGradient>
                      </defs>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Success Rate Display - Moved below chart */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 shadow-inner border-2 border-purple-200">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 mb-1 drop-shadow-lg">
                      {Math.round(((stats.total - stats.rejected) / stats.total) * 100)}%
                    </div>
                    <div className="text-xs text-purple-700 font-bold uppercase tracking-wider">Overall Success Rate</div>
                    <div className="text-xs text-gray-600 mt-1">Patent approval performance</div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border-2 border-purple-200 shadow-inner">
                <p className="text-xs text-gray-700 leading-relaxed text-center">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="font-black text-purple-700 text-lg">{stats.total - stats.rejected}</span>
                  </span>
                  {' '}out of{' '}
                  <span className="font-bold text-gray-800 text-base">{stats.total}</span>
                  {' '}patent applications have not been rejected, demonstrating{' '}
                  <span className="font-bold text-purple-700">strong application quality</span> and{' '}
                  <span className="font-bold text-pink-600">exceptional review success</span>.
                </p>
              </div>
            </div>
          ) : stats.loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">No data available yet. File your first patent to see statistics.</p>
          )}
        </div>

        {/* Portfolio Health Chart */}
        <div className="group bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 rounded-3xl shadow-2xl p-4 border-4 border-indigo-400 hover:border-indigo-600 hover:shadow-3xl hover:-translate-y-2 transition-all duration-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-3 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Portfolio Health</h3>
                <p className="text-xs text-indigo-700 font-semibold mt-0.5">Patent status distribution</p>
              </div>
            </div>
          </div>
          
          {!stats.loading && stats.total > 0 ? (
            <div className="space-y-3">
              {/* Bar Chart */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 shadow-inner border-2 border-indigo-200">
                <h4 className="text-xs font-bold text-indigo-800 mb-2 text-center uppercase tracking-wide">Patent Status Overview</h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { 
                          name: 'Active Patents', 
                          count: stats.granted, 
                          percentage: ((stats.granted / stats.total) * 100).toFixed(1)
                        },
                        { 
                          name: 'Rejected', 
                          count: stats.rejected, 
                          percentage: ((stats.rejected / stats.total) * 100).toFixed(1)
                        },
                        { 
                          name: 'Under Review', 
                          count: stats.total - stats.granted - stats.rejected, 
                          percentage: (((stats.total - stats.granted - stats.rejected) / stats.total) * 100).toFixed(1)
                        }
                      ]}
                      margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="5 5" stroke="#cbd5e1" strokeWidth={1.5} />
                      <XAxis 
                        dataKey="name" 
                        angle={-15}
                        textAnchor="end"
                        height={60}
                        tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }}
                      />
                      <YAxis 
                        tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                        label={{ value: 'Number of Patents', angle: -90, position: 'insideLeft', style: { fill: '#1e293b', fontWeight: 700, fontSize: 11 } }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                          border: '3px solid #4f46e5',
                          borderRadius: '16px',
                          boxShadow: '0 20px 40px rgba(79, 70, 229, 0.3)',
                          padding: '16px'
                        }}
                        labelStyle={{ fontWeight: 'bold', fontSize: '14px', color: '#312e81' }}
                        formatter={(value, name, props) => {
                          return [
                            <span className="font-bold text-base">{value} patents ({props.payload.percentage}%)</span>,
                            ''
                          ];
                        }}
                        labelFormatter={(label) => <span className="font-bold text-gray-900">{label}</span>}
                      />
                      <Bar 
                        dataKey="count" 
                        radius={[12, 12, 0, 0]}
                        animationDuration={1500}
                        animationBegin={100}
                      >
                        <Cell fill="url(#activeGradient)" stroke="#10b981" strokeWidth={2} />
                        <Cell fill="url(#rejectedGradient)" stroke="#ef4444" strokeWidth={2} />
                        <Cell fill="url(#reviewGradient)" stroke="#f59e0b" strokeWidth={2} />
                      </Bar>
                      <defs>
                        <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                          <stop offset="50%" stopColor="#059669" stopOpacity={0.95}/>
                          <stop offset="100%" stopColor="#047857" stopOpacity={0.9}/>
                        </linearGradient>
                        <linearGradient id="rejectedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                          <stop offset="50%" stopColor="#dc2626" stopOpacity={0.95}/>
                          <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.9}/>
                        </linearGradient>
                        <linearGradient id="reviewGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                          <stop offset="50%" stopColor="#d97706" stopOpacity={0.95}/>
                          <stop offset="100%" stopColor="#b45309" stopOpacity={0.9}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Description */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border-2 border-indigo-200 shadow-inner">
                <p className="text-xs text-gray-700 leading-relaxed text-center">
                  Your portfolio contains{' '}
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="font-black text-green-700 text-lg">{stats.granted}</span>
                  </span>
                  {' '}active patents,{' '}
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="font-black text-red-700 text-lg">{stats.rejected}</span>
                  </span>
                  {' '}rejected, and{' '}
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    <span className="font-black text-amber-700 text-lg">{stats.total - stats.granted - stats.rejected}</span>
                  </span>
                  {' '}under review. Monitor your{' '}
                  <span className="font-bold text-indigo-700">intellectual property health</span> in real-time.
                </p>
              </div>
            </div>
          ) : stats.loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">Portfolio analysis will appear once you have filed patents.</p>
          )}
        </div>
      </div>

      {/* Quick Actions or Tips */}
      <div className="mt-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
            <Award className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">Protect Your Innovation</h3>
            <p className="text-indigo-100 text-lg leading-relaxed mb-4">
              Track the legal status of your patents in real-time. Monitor approvals, rejections, and pending applications 
              all in one comprehensive dashboard.
            </p>
            <button 
              onClick={onNavigateToPatentFiling}
              className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              File New Patent Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalStatusPage;
