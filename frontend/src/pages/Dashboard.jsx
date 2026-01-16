import React, { useState, useEffect } from "react";
import { TrendingUp, CheckCircle, Database, Globe, Crown, Zap, Calendar, Info } from "lucide-react";
import { doc, getDoc, collection, getDocs, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import Filters from "../components/Filters";
import OverviewGrid from "../components/OverviewGrid";
import IPAssetPanel from "../components/IPAssetPanel";
import StatePatentCount from "../components/StatePatentCount";
import IndiaPatentPanel from "../components/IndiaPatentPanel";
import QuickSearchKeywords from "../components/QuickSearchKeywords";
import GrowthTrendChart from "../components/GrowthTrendChart";
import PatentStatusChart from "../components/PatentStatusChart";
import Chatbot from "../components/Chatbot";

const Dashboard = ({ userProfile, searchMode, setSearchMode, onSearch, setCurrentPage }) => {
  const [dbPatentCount, setDbPatentCount] = React.useState(0);
  const [dbConnectionStatus, setDbConnectionStatus] = React.useState('checking'); // 'checking', 'connected', 'error'
  const [dbError, setDbError] = React.useState('');

  // Typewriter effect state
  const [typewriterText, setTypewriterText] = React.useState('');
  const fullText = 'Empowering Innovation Through Data-Driven IP Analytics';

  // Scroll animation states
  const [visibleSections, setVisibleSections] = React.useState({});
  const sectionRefs = React.useRef({});

  // State for map location selection
  const [selectedMapState, setSelectedMapState] = React.useState(null);

  // State for total registered users
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [usersStatus, setUsersStatus] = React.useState('checking'); // 'checking', 'connected', 'error'
  const [usersError, setUsersError] = React.useState('');

  // State for total patent filings
  const [totalPatentFilings, setTotalPatentFilings] = React.useState(0);
  const [filingsStatus, setFilingsStatus] = React.useState('checking');
  const [filingsError, setFilingsError] = React.useState('');

  // State for yearly patent data
  const [yearlyPatentData, setYearlyPatentData] = React.useState([]);
  const [yearlyDataStatus, setYearlyDataStatus] = React.useState('loading');

  // State for subscription revenue data
  const [revenueData, setRevenueData] = React.useState([]);
  const [revenueStatus, setRevenueStatus] = React.useState('loading');

  // State for feedback analytics
  const [feedbackStats, setFeedbackStats] = React.useState(null);
  const [feedbackStatus, setFeedbackStatus] = React.useState('loading');
  const [allFeedbacks, setAllFeedbacks] = React.useState([]);

  // State for online users
  const [onlineUsers, setOnlineUsers] = React.useState(0);

  // Local state for user profile to ensure emailVerified is loaded immediately
  const [localUserProfile, setLocalUserProfile] = React.useState(userProfile);

  // Update local profile whenever userProfile prop changes
  React.useEffect(() => {
    if (userProfile) {
      setLocalUserProfile(userProfile);
    }
  }, [userProfile]);

  // Typewriter effect with continuous loop
  React.useEffect(() => {
    let index = 0;
    let isDeleting = false;
    let timer;

    const typeWriter = () => {
      if (!isDeleting && index < fullText.length) {
        // Typing forward
        index++;
        setTypewriterText(fullText.slice(0, index));
        timer = setTimeout(typeWriter, 50);
      } else if (!isDeleting && index === fullText.length) {
        // Pause at end before deleting
        timer = setTimeout(() => {
          isDeleting = true;
          typeWriter();
        }, 2000);
      } else if (isDeleting && index > 0) {
        // Deleting backward
        index--;
        setTypewriterText(fullText.slice(0, index));
        timer = setTimeout(typeWriter, 30);
      } else if (isDeleting && index === 0) {
        // Pause before typing again
        timer = setTimeout(() => {
          isDeleting = false;
          typeWriter();
        }, 500);
      }
    };

    typeWriter();
    return () => clearTimeout(timer);
  }, []);

  // Scroll animation observer - repeats every time
  React.useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Show section when it comes into view
          setVisibleSections(prev => ({
            ...prev,
            [entry.target.dataset.section]: true
          }));
        } else {
          // Hide section when it goes out of view (allows re-animation)
          setVisibleSections(prev => ({
            ...prev,
            [entry.target.dataset.section]: false
          }));
        }
      });
    }, observerOptions);

    Object.values(sectionRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Fetch emailVerified status immediately on mount
  React.useEffect(() => {
    const fetchEmailVerifiedStatus = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('🔍 Fetching emailVerified status for user:', currentUser.uid);

        // Force reload user to get latest emailVerified status
        await currentUser.reload();
        const emailVerified = currentUser.emailVerified;

        console.log('✅ EmailVerified status from Firebase Auth:', emailVerified);

        // Also check Firestore for emailVerified
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const firestoreData = userDocSnap.data();
            const firestoreEmailVerified = firestoreData.emailVerified ?? emailVerified;

            console.log('✅ EmailVerified status from Firestore:', firestoreEmailVerified);

            // Update local user profile with emailVerified status
            setLocalUserProfile(prev => ({
              ...prev,
              emailVerified: firestoreEmailVerified,
              uid: currentUser.uid,
              email: currentUser.email || prev?.email
            }));
          } else {
            // Use Firebase Auth emailVerified if Firestore doc doesn't exist
            setLocalUserProfile(prev => ({
              ...prev,
              emailVerified: emailVerified,
              uid: currentUser.uid,
              email: currentUser.email || prev?.email
            }));
          }
        } catch (error) {
          console.error('❌ Error fetching emailVerified from Firestore:', error);
          // Fallback to Firebase Auth emailVerified
          setLocalUserProfile(prev => ({
            ...prev,
            emailVerified: emailVerified,
            uid: currentUser.uid,
            email: currentUser.email || prev?.email
          }));
        }
      }
    };

    fetchEmailVerifiedStatus();
  }, []);

  // Fetch patent count from database on component mount
  React.useEffect(() => {
    const fetchPatentCount = async () => {
      setDbConnectionStatus('checking');
      try {
        console.log('Fetching patent count from backend...');
        const response = await fetch('http://localhost:8080/api/patents/count');
        if (response.ok) {
          const count = await response.json();
          console.log('Patent count received:', count, 'Type:', typeof count);
          // Ensure we set a number, not an object
          const finalCount = typeof count === 'number' ? count : parseInt(count, 10) || 0;
          setDbPatentCount(finalCount);
          setDbConnectionStatus('connected');
          setDbError('');
          console.log('✓ Database connected. Patents found:', finalCount);
        } else {
          console.error('Failed to fetch patent count. Status:', response.status);
          setDbConnectionStatus('error');
          setDbError(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching patent count:', error);
        setDbPatentCount(0);
        setDbConnectionStatus('error');
        setDbError(error.message || 'Cannot connect to backend server');
      }
    };
    fetchPatentCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchPatentCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch total users count and subscription revenue from Firestore
  React.useEffect(() => {
    const fetchUsersCount = async () => {
      setUsersStatus('checking');
      setRevenueStatus('loading');
      try {
        console.log('Fetching users count from Firestore...');
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const count = usersSnapshot.size;
        console.log('Users count received:', count);
        setTotalUsers(count);
        setUsersStatus('connected');
        setUsersError('');
        console.log('✓ Firestore connected. Users found:', count);

        // Calculate subscription revenue by date (daily)
        const dailyRevenue = {};
        const PRO_PRICE = 49;
        const ENTERPRISE_PRICE = 199;

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          const subscription = userData.subscriptionType?.toLowerCase();

          // Get subscription date (use createdAt or subscriptionStartDate)
          let subDate = null;
          if (userData.subscriptionStartDate) {
            subDate = userData.subscriptionStartDate.toDate ? userData.subscriptionStartDate.toDate() : new Date(userData.subscriptionStartDate);
          } else if (userData.createdAt) {
            subDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
          }

          if (subDate && (subscription === 'pro' || subscription === 'enterprise')) {
            // Format date as YYYY-MM-DD for grouping
            const dateKey = subDate.toISOString().split('T')[0];
            const displayDate = subDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (!dailyRevenue[dateKey]) {
              dailyRevenue[dateKey] = {
                date: displayDate,
                value: 0,
                fullDate: subDate,
                proUsers: 0,
                enterpriseUsers: 0,
                totalUsers: 0
              };
            }

            const amount = subscription === 'pro' ? PRO_PRICE : ENTERPRISE_PRICE;
            dailyRevenue[dateKey].value += amount;
            dailyRevenue[dateKey].totalUsers += 1;

            if (subscription === 'pro') {
              dailyRevenue[dateKey].proUsers += 1;
            } else if (subscription === 'enterprise') {
              dailyRevenue[dateKey].enterpriseUsers += 1;
            }
          }
        });

        // Convert to array and sort by date
        const revenueArray = Object.values(dailyRevenue)
          .sort((a, b) => a.fullDate - b.fullDate)
          .slice(-30) // Get last 30 days
          .map(item => ({
            date: item.date,
            value: item.value,
            proUsers: item.proUsers,
            enterpriseUsers: item.enterpriseUsers,
            totalUsers: item.totalUsers
          }));

        // If no revenue data, create empty structure for last 30 days
        if (revenueArray.length === 0) {
          const now = new Date();
          const emptyData = [];
          for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            emptyData.push({
              date: displayDate,
              value: 0,
              proUsers: 0,
              enterpriseUsers: 0,
              totalUsers: 0
            });
          }
          setRevenueData(emptyData);
        } else {
          setRevenueData(revenueArray);
        }

        setRevenueStatus('success');
        console.log('✓ Revenue data calculated:', revenueArray);
      } catch (error) {
        console.error('Error fetching users count:', error);
        setTotalUsers(0);
        setUsersStatus('error');
        setUsersError(error.message || 'Cannot connect to Firestore');
      }
    };
    fetchUsersCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchUsersCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch patent filings count from PostgreSQL
  React.useEffect(() => {
    const fetchPatentFilingsCount = async () => {
      setFilingsStatus('checking');
      try {
        console.log('Fetching patent filings count from backend...');
        const response = await fetch('http://localhost:8080/api/patent-filing/count');
        if (response.ok) {
          const count = await response.json();
          console.log('Patent filings count received:', count);
          const finalCount = typeof count === 'number' ? count : parseInt(count, 10) || 0;
          setTotalPatentFilings(finalCount);
          setFilingsStatus('connected');
          setFilingsError('');
          console.log('✓ Database connected. Patent filings found:', finalCount);
        } else {
          console.error('Failed to fetch patent filings count. Status:', response.status);
          setFilingsStatus('error');
          setFilingsError(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching patent filings count:', error);
        setTotalPatentFilings(0);
        setFilingsStatus('error');
        setFilingsError(error.message || 'Cannot connect to backend server');
      }
    };
    fetchPatentFilingsCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchPatentFilingsCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time listener for online users
  React.useEffect(() => {
    console.log('Setting up real-time listener for online users...');

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
      setOnlineUsers(onlineCount);
    }, (error) => {
      console.error('Error in real-time listener:', error);
    });

    return () => {
      console.log('Cleaning up real-time listener for online users');
      unsubscribe();
    };
  }, []);

  // Fetch feedback analytics
  React.useEffect(() => {
    const fetchFeedbackAnalytics = async () => {
      setFeedbackStatus('loading');
      try {
        console.log('Fetching feedback analytics from backend...');

        // Fetch stats
        const statsResponse = await fetch('http://localhost:8080/api/feedback/stats');
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          console.log('Feedback stats received:', stats);
          setFeedbackStats(stats);
        }

        // Fetch all feedbacks
        const allResponse = await fetch('http://localhost:8080/api/feedback/all');
        if (allResponse.ok) {
          const feedbacks = await allResponse.json();
          console.log('All feedbacks received:', feedbacks.length);
          setAllFeedbacks(feedbacks);
        }

        setFeedbackStatus('success');
      } catch (error) {
        console.error('Error fetching feedback analytics:', error);
        setFeedbackStatus('error');
      }
    };

    fetchFeedbackAnalytics();

    // Refresh every 60 seconds
    const interval = setInterval(fetchFeedbackAnalytics, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch yearly patent counts for chart
  React.useEffect(() => {
    const fetchYearlyPatentData = async () => {
      setYearlyDataStatus('loading');
      try {
        console.log('Fetching yearly patent data from backend...');
        const response = await fetch('http://localhost:8080/api/patents/yearly-counts');
        if (response.ok) {
          const data = await response.json();
          console.log('Yearly patent data received:', data);

          // Get current year
          const currentYear = new Date().getFullYear();

          // Create a map from the backend data
          const dataMap = {};
          data.forEach(item => {
            dataMap[item.year] = item.count;
          });

          // Generate data for last 7 years (current year + previous 6 years)
          const yearlyData = [];
          for (let i = 6; i >= 0; i--) {
            const year = currentYear - i;
            yearlyData.push({
              year: year.toString(),
              patents: dataMap[year] || 0
            });
          }

          console.log('Processed yearly data:', yearlyData);
          setYearlyPatentData(yearlyData);
          setYearlyDataStatus('success');
        } else {
          console.error('Failed to fetch yearly patent data. Status:', response.status);
          setYearlyDataStatus('error');
        }
      } catch (error) {
        console.error('Error fetching yearly patent data:', error);
        setYearlyDataStatus('error');
      }
    };

    fetchYearlyPatentData();

    // Refresh every 60 seconds
    const interval = setInterval(fetchYearlyPatentData, 60000);
    return () => clearInterval(interval);
  }, []);

  const [dashboardData, setDashboardData] = useState({
    portfolioValue: "$0",
    portfolioGrowth: "0%",
    activeSubscriptions: 0,
    recentFilings: 0,
    openAlerts: 0,
    loading: true,
  });

  /* ---------------- SUBSCRIPTION REVENUE DATA ---------------- */
  // Revenue data will be fetched from Firebase based on subscription counts

  const assetData = [
    { name: "Patents", value: 45, color: "#6366f1" },
    { name: "Trademarks", value: 30, color: "#22c55e" },
    { name: "Copyrights", value: 15, color: "#facc15" },
    { name: "Trade Secrets", value: 10, color: "#f97316" },
  ];

  /* ---------------- FIRESTORE ---------------- */
  useEffect(() => {
    if (!userProfile?.uid) {
      setDashboardData((prev) => ({ ...prev, loading: false }));
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const ref = doc(db, "dashboardData", userProfile.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setDashboardData({
            portfolioValue: data.portfolioValue || "$0",
            portfolioGrowth: data.portfolioGrowth || "0%",
            activeSubscriptions: data.activeSubscriptions || 0,
            recentFilings: data.recentFilings || 0,
            openAlerts: data.openAlerts || 0,
            loading: false,
          });
        } else {
          setDashboardData({
            portfolioValue: "$1.2M",
            portfolioGrowth: "Up 7.5% this quarter",
            activeSubscriptions: 12,
            recentFilings: 45,
            openAlerts: 3,
            loading: false,
          });
        }
      } catch {
        setDashboardData((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, [userProfile?.uid]);

  const getTimeGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const calculateDaysRemaining = (endDate) => {
    if (!endDate) return null;

    try {
      let end;
      if (endDate instanceof Date) {
        end = endDate;
      } else if (endDate?.toDate) {
        end = endDate.toDate();
      } else if (typeof endDate === 'string') {
        end = new Date(endDate);
      } else {
        return null;
      }

      const now = new Date();
      const diffTime = end - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      console.error('Error calculating days remaining:', error);
      return null;
    }
  };

  // Handlers for map location selection
  const handleStateChange = (state) => {
    console.log('🗺️ Map: State selected -', state);
    setSelectedMapState(state || null);
  };

  // Handler for quick search keywords
  const handleSearch = (keyword) => {
    if (onSearch && setCurrentPage) {
      onSearch(keyword);
      setCurrentPage('search');
    }
  };

  /* ======================= UI ======================= */
  return (
    <div className="w-full min-h-screen space-y-1.5 p-1.5">
      {/* QUICK SEARCH KEYWORDS - Top of page */}
      <QuickSearchKeywords
        onSearch={handleSearch}
        setSearchMode={setSearchMode}
      />

      {/* COMBINED HEADER - Welcome + Platform Info */}
      <div className="w-full">
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl p-6 shadow-xl border border-gray-100">
          {/* Top Row: Welcome + Search Mode */}
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-6">
            {/* Left Side - User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-700">Welcome back,</p>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {getTimeGreeting()}, {localUserProfile?.firstName || userProfile?.firstName || "User"}.
              </h1>
              <p className="text-gray-600 mt-2">
                {localUserProfile?.email || userProfile?.email} • {localUserProfile?.company || userProfile?.company || "IP Platform"}
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-3">
                {localUserProfile?.emailVerified && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm text-green-700 font-semibold">
                      Verified Account
                    </span>
                  </div>
                )}

                {/* Online Users Count */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-700 font-medium">
                    <span className="font-bold text-green-600">{onlineUsers}</span> Online {onlineUsers === 1 ? 'User' : 'Users'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side - Search Mode - Fixed Top Right */}
            <div className="w-full lg:w-96 flex-shrink-0">
              <div className="border-2 border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xl font-extrabold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Search Mode</p>
                  <div className={`w-2.5 h-2.5 rounded-full ${searchMode === 'api' ? 'bg-cyan-500' : 'bg-teal-500'} animate-pulse`}></div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSearchMode('api')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all text-sm font-medium ${searchMode === 'api'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-cyan-50 border border-cyan-200 shadow-sm'
                      }`}
                    title="Search from external patent database API"
                  >
                    <Globe size={18} />
                    <span>API</span>
                  </button>
                  <button
                    onClick={() => setSearchMode('local')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all text-sm font-medium ${searchMode === 'local'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-teal-50 border border-teal-200 shadow-sm'
                      }`}
                    title={searchMode === 'local' && dbConnectionStatus === 'connected'
                      ? `Searching from local database (${dbPatentCount} patents stored)`
                      : 'Search from local database'}
                  >
                    <Database size={18} />
                    <span>Local</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Title and Description */}
          <div className="border-t border-gray-200 pt-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center gap-3 mb-3">
                <Crown className="text-yellow-500" size={32} />
                <h2 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Global IP Intelligence Hub
                </h2>
                <Crown className="text-yellow-500" size={32} />
              </div>
              <p className="text-lg text-gray-700 font-semibold mb-2 h-7">
                <span className="inline-block">{typewriterText}</span>
                <span className="inline-block w-0.5 h-5 bg-gray-700 ml-1 animate-pulse"></span>
              </p>
              <p className="text-sm text-gray-600 leading-relaxed max-w-4xl mx-auto">
                Join thousands of innovators, patent attorneys, and R&D teams leveraging our comprehensive platform
                to track, analyze, and protect intellectual property worldwide. Stay competitive with real-time insights,
                advanced analytics, and powerful search capabilities across global patent databases.
              </p>
            </div>

            {/* Key Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="text-blue-600" size={20} />
                  <h4 className="font-bold text-blue-900 text-sm">Comprehensive Database</h4>
                </div>
                <p className="text-xs text-gray-700">Access millions of patent records with powerful search and filtering</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-purple-600" size={20} />
                  <h4 className="font-bold text-purple-900 text-sm">Real-Time Analytics</h4>
                </div>
                <p className="text-xs text-gray-700">Track trends, monitor competitors, and identify innovation opportunities</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="text-indigo-600" size={20} />
                  <h4 className="font-bold text-indigo-900 text-sm">Global Coverage</h4>
                </div>
                <p className="text-xs text-gray-700">Monitor IP activities across multiple jurisdictions and regions</p>
              </div>
            </div>
          </div>
        </div>
      </div>







      {/* Growth Metrics Section */}
      <div
        className="w-full mt-12 mb-6"
        ref={el => sectionRefs.current['growth'] = el}
        data-section="growth"
      >
        <div className={`bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-2xl p-6 border-l-4 border-blue-500 shadow-sm transition-all duration-1000 ${visibleSections['growth'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500 rounded-lg shadow-lg">
              <TrendingUp className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-extrabold bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 bg-clip-text text-transparent mb-3">
                Platform Growth Metrics
              </h3>
              <p className="text-base text-gray-800 leading-relaxed font-medium">
                Track the expansion of our platform ecosystem in real-time. Monitor active users, patent database growth,
                and filing submissions to understand platform adoption and usage patterns. These metrics reflect the collective
                innovation activity across our global user community.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GROWTH TREND CHART */}
      <div className="w-full">
        <GrowthTrendChart
          totalUsers={totalUsers}
          dbPatentCount={dbPatentCount}
          totalPatentFilings={totalPatentFilings}
          usersStatus={usersStatus}
          dbConnectionStatus={dbConnectionStatus}
          filingsStatus={filingsStatus}
        />
      </div>

      {/* Patent Status Analysis Section */}
      <div
        className="w-full mt-12 mb-6"
        ref={el => sectionRefs.current['patent'] = el}
        data-section="patent"
      >
        <div className={`bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 rounded-2xl p-6 border-l-4 border-emerald-500 shadow-sm transition-all duration-1000 ${visibleSections['patent'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg shadow-lg">
              <CheckCircle className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-700 via-teal-700 to-green-900 bg-clip-text text-transparent mb-3">
                Patent Lifecycle Distribution
              </h3>
              <p className="text-base text-gray-800 leading-relaxed font-medium">
                Visualize the status distribution of patents across different stages of the intellectual property lifecycle.
                From pending applications to granted patents and expired rights, this analysis provides insights into the
                maturity and health of patent portfolios within our database.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PATENT STATUS DISTRIBUTION CHART */}
      <div className="w-full">
        <PatentStatusChart />
      </div>

      {/* Subscription & Trends Analysis Section */}
      <div
        className="w-full mt-12 mb-6"
        ref={el => sectionRefs.current['revenue'] = el}
        data-section="revenue"
      >
        <div className={`bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 rounded-2xl p-6 border-l-4 border-violet-500 shadow-sm transition-all duration-1000 ${visibleSections['revenue'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-violet-500 rounded-lg shadow-lg">
              <Zap className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-extrabold bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-900 bg-clip-text text-transparent mb-3">
                Revenue & Innovation Trends
              </h3>
              <p className="text-base text-gray-800 leading-relaxed font-medium">
                Analyze premium subscription adoption and historical patent filing trends. The subscription chart tracks daily
                upgrades to Pro and Enterprise plans, while yearly trends reveal long-term patterns in global patent activity.
                These insights help identify emerging technology sectors and innovation hotspots.
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* FULL WIDTH CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 shadow-lg border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg text-indigo-900">Premium Subscriptions</h3>
            {revenueStatus === 'loading' && (
              <div className="text-xs text-indigo-600 animate-pulse">Loading...</div>
            )}
            {revenueStatus === 'success' && (
              <div className="text-xs text-indigo-700 font-medium">● Live Data</div>
            )}
          </div>
          <div className="mb-3 pb-3 border-b border-indigo-200">
            <p className="text-sm text-indigo-700 font-medium">Track daily premium plan adoptions</p>
            <p className="text-xs text-indigo-600 mt-1">Monitor user upgrades to Pro (₹49) and Enterprise (₹199) subscriptions over the last 30 days</p>
          </div>
          <div className="h-[280px]">
            {revenueStatus === 'loading' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-indigo-600">Loading revenue data...</div>
              </div>
            ) : revenueData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-indigo-600">No subscription data available</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis
                    dataKey="date"
                    stroke="#4f46e5"
                    style={{ fontSize: '12px', fontWeight: '600' }}
                  />
                  <YAxis
                    stroke="#4f46e5"
                    style={{ fontSize: '12px', fontWeight: '600' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#eef2ff',
                      border: '2px solid #6366f1',
                      borderRadius: '8px',
                      fontWeight: '600',
                      padding: '12px'
                    }}
                    labelStyle={{ color: '#4f46e5', fontWeight: 'bold', marginBottom: '8px' }}
                    formatter={(value, name, props) => {
                      const { payload } = props;
                      return [
                        <div key="tooltip-revenue" className="space-y-2">
                          <div className="text-indigo-900 font-bold text-base">{payload.totalUsers} user{payload.totalUsers !== 1 ? 's' : ''}</div>
                          <div className="text-sm space-y-1">
                            {payload.proUsers > 0 && (
                              <div className="text-indigo-700">
                                <span className="font-semibold">Pro:</span> {payload.proUsers} user{payload.proUsers !== 1 ? 's' : ''}
                              </div>
                            )}
                            {payload.enterpriseUsers > 0 && (
                              <div className="text-purple-700">
                                <span className="font-semibold">Enterprise:</span> {payload.enterpriseUsers} user{payload.enterpriseUsers !== 1 ? 's' : ''}
                              </div>
                            )}
                            {payload.totalUsers === 0 && (
                              <div className="text-gray-500 italic">No upgrades this day</div>
                            )}
                          </div>
                        </div>
                      ];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalUsers"
                    stroke="url(#revenueGradient)"
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', r: 5 }}
                    activeDot={{ r: 7, stroke: '#6366f1', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 shadow-lg border border-emerald-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg text-emerald-900">Yearly Patent Trends</h3>
            {yearlyDataStatus === 'loading' && (
              <div className="text-xs text-emerald-600 animate-pulse">Loading...</div>
            )}
            {yearlyDataStatus === 'success' && (
              <div className="text-xs text-emerald-700 font-medium">● Live Data</div>
            )}
          </div>
          <div className="mb-3 pb-3 border-b border-emerald-200">
            <p className="text-sm text-emerald-700 font-medium">Historical patent filing trends</p>
            <p className="text-xs text-emerald-600 mt-1">Analyze year-over-year patent growth patterns across the last 7 years to identify innovation cycles</p>
          </div>
          <div className="h-[280px]">
            {yearlyDataStatus === 'loading' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-emerald-600">Loading yearly data...</div>
              </div>
            ) : yearlyPatentData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-emerald-600">No patent data available</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyPatentData}>
                  <defs>
                    <linearGradient id="patentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                  <XAxis
                    dataKey="year"
                    stroke="#047857"
                    style={{ fontSize: '12px', fontWeight: '600' }}
                  />
                  <YAxis
                    stroke="#047857"
                    style={{ fontSize: '12px', fontWeight: '600' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ecfdf5',
                      border: '2px solid #10b981',
                      borderRadius: '8px',
                      fontWeight: '600'
                    }}
                    labelStyle={{ color: '#047857' }}
                  />
                  <Bar
                    dataKey="patents"
                    fill="url(#patentGradient)"
                    radius={[8, 8, 0, 0]}
                    name="Patents"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>


      {/* Geographic Distribution Section */}
      {/* Geographic Distribution Section */}
      <div
        className="w-full mt-12 mb-6"
        ref={el => sectionRefs.current['geographic'] = el}
        data-section="geographic"
      >
        <div className={`bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-sky-500/10 rounded-2xl p-6 border-l-4 border-cyan-500 shadow-sm transition-all duration-1000 ${visibleSections['geographic'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-cyan-500 rounded-lg shadow-lg">
              <Globe className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-700 via-blue-700 to-sky-900 bg-clip-text text-transparent mb-3">
                Geographic Innovation Landscape
              </h3>
              <p className="text-base text-gray-800 leading-relaxed font-medium">
                Explore the geographical distribution of patent activities across India. Interactive state-wise analytics and
                visual mapping provide comprehensive insights into regional innovation strengths. Identify innovation clusters,
                track state-level IP development, and discover emerging technology hubs across the country.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Map and State Patent Count in Single Row */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
        {/* State-wise Patent Count */}
        <div className="flex">
          <StatePatentCount
            onStateChange={handleStateChange}
          />
        </div>

        {/* India Patent Map */}
        <div className="flex">
          <IndiaPatentPanel
            selectedState={selectedMapState}
          />
        </div>
      </div>

      {/* User Feedback & Quality Metrics Section */}

      <div
        className="w-full mt-12 mb-6"
        ref={el => sectionRefs.current['feedback'] = el}
        data-section="feedback"
      >
        <div className={`bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-red-500/10 rounded-2xl p-6 border-l-4 border-pink-500 shadow-sm transition-all duration-1000 ${visibleSections['feedback'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-pink-500 rounded-lg shadow-lg">
              <Info className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-extrabold bg-gradient-to-r from-pink-700 via-rose-700 to-red-900 bg-clip-text text-transparent mb-3">
                User Experience & Platform Quality
              </h3>
              <p className="text-base text-gray-800 leading-relaxed font-medium">
                Our commitment to excellence is reflected in user feedback and satisfaction metrics. Monitor real-time ratings
                across User Interface, Performance, Features, and Support to ensure we're delivering world-class IP intelligence
                tools. Your feedback drives continuous improvement and helps us build the best platform for IP professionals.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK ANALYTICS SECTION - Moved to bottom */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-1.5 mt-1.5">
        {/* Average Ratings by Category - Left Side (2/3 width) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 shadow-lg border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg text-blue-900">User Feedback Ratings</h3>
            {feedbackStatus === 'loading' && (
              <div className="text-xs text-blue-600 animate-pulse">Loading...</div>
            )}
            {feedbackStatus === 'success' && (
              <div className="text-xs text-blue-700 font-medium">● Live Data</div>
            )}
          </div>
          <div className="mb-3 pb-3 border-b border-blue-200">
            <p className="text-sm text-blue-700 font-medium">Quality metrics across key platform dimensions</p>
            <p className="text-xs text-blue-600 mt-1">Aggregate user ratings help us continuously improve your experience on a 5-point scale</p>
          </div>
          <div className="h-[320px] px-4">
            {feedbackStatus === 'loading' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-blue-600">Loading feedback data...</div>
              </div>
            ) : !feedbackStats || feedbackStats.totalFeedbacks === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-blue-600">No feedback data available</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { category: 'UI', rating: feedbackStats.averageUIRating || 0, fullName: 'User Interface' },
                  { category: 'Performance', rating: feedbackStats.averagePerformanceRating || 0, fullName: 'Performance' },
                  { category: 'Features', rating: feedbackStats.averageFeaturesRating || 0, fullName: 'Features' },
                  { category: 'Support', rating: feedbackStats.averageSupportRating || 0, fullName: 'Support' },
                  { category: 'Overall', rating: feedbackStats.averageOverallRating || 0, fullName: 'Overall Experience' }
                ]} layout="vertical">
                  <defs>
                    <linearGradient id="ratingGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                  <XAxis
                    type="number"
                    domain={[0, 5]}
                    stroke="#1e40af"
                    style={{ fontSize: '13px', fontWeight: '700' }}
                    tick={{ fill: '#1e3a8a' }}
                    tickCount={6}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    stroke="#1e40af"
                    width={110}
                    style={{ fontSize: '14px', fontWeight: '700' }}
                    tick={{ fill: '#1e3a8a' }}
                    orientation="left"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#eff6ff',
                      border: '2px solid #3b82f6',
                      borderRadius: '8px',
                      fontWeight: '600',
                      padding: '12px'
                    }}
                    labelStyle={{ color: '#1e40af', fontWeight: 'bold' }}
                    formatter={(value, name, props) => {
                      return [
                        <div key="tooltip-rating" className="space-y-1">
                          <div className="text-blue-900 font-bold">{props.payload.fullName}</div>
                          <div className="text-lg text-blue-700">{value.toFixed(2)} / 5.00</div>
                          <div className="text-sm text-blue-600">
                            {value >= 4.5 ? '⭐ Excellent' : value >= 4 ? '✨ Very Good' : value >= 3 ? '👍 Good' : value >= 2 ? '😐 Fair' : '⚠️ Needs Improvement'}
                          </div>
                        </div>
                      ];
                    }}
                  />
                  <Bar
                    dataKey="rating"
                    fill="url(#ratingGradient)"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div >

        {/* Feedback Overview - Right Side (1/3 width) */}
        {
          feedbackStatus === 'success' && feedbackStats && (
            <div className="lg:col-span-1 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 shadow-lg border border-purple-100">
              <h3 className="font-bold text-lg text-purple-900 mb-4">Feedback Overview</h3>
              <div className="space-y-4">
                {/* Total Feedbacks */}
                <div className="bg-white/60 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-purple-600 font-medium mb-1">Total Feedbacks</div>
                  <div className="text-3xl font-bold text-purple-900">{feedbackStats.totalFeedbacks || 0}</div>
                </div>

                {/* Overall Average Rating */}
                <div className="bg-white/60 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-purple-600 font-medium mb-1">Overall Average</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold text-purple-900">
                      {feedbackStats.overallAverageRating ? feedbackStats.overallAverageRating.toFixed(2) : '0.00'}
                    </div>
                    <div className="text-lg text-purple-600">/ 5.00</div>
                  </div>
                  <div className="mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-2xl ${star <= Math.round(feedbackStats.overallAverageRating || 0)
                          ? 'text-yellow-500'
                          : 'text-gray-300'
                          }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sentiment Indicator */}
                <div className="bg-white/60 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-purple-600 font-medium mb-2">User Sentiment</div>
                  <div className="text-center">
                    {feedbackStats.overallAverageRating >= 4.5 && (
                      <div className="text-4xl mb-1">😊</div>
                    )}
                    {feedbackStats.overallAverageRating >= 4 && feedbackStats.overallAverageRating < 4.5 && (
                      <div className="text-4xl mb-1">🙂</div>
                    )}
                    {feedbackStats.overallAverageRating >= 3 && feedbackStats.overallAverageRating < 4 && (
                      <div className="text-4xl mb-1">😐</div>
                    )}
                    {feedbackStats.overallAverageRating < 3 && feedbackStats.overallAverageRating > 0 && (
                      <div className="text-4xl mb-1">😟</div>
                    )}
                    {feedbackStats.overallAverageRating === 0 && (
                      <div className="text-4xl mb-1">📊</div>
                    )}
                    <div className="text-xs text-purple-700 font-medium">
                      {feedbackStats.overallAverageRating >= 4.5 ? 'Excellent' :
                        feedbackStats.overallAverageRating >= 4 ? 'Very Good' :
                          feedbackStats.overallAverageRating >= 3 ? 'Good' :
                            feedbackStats.overallAverageRating > 0 ? 'Needs Improvement' : 'No Ratings Yet'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div >

      {/* Feedback Overview - Moved to bottom above recent feedback */}
      {
        feedbackStatus === 'success' && feedbackStats && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 shadow-lg border border-amber-100 mt-1.5">
            <h3 className="font-bold text-lg text-amber-900 mb-2">Recent User Feedback</h3>
            <p className="text-sm text-amber-700 mb-4 italic">
              "Your voice shapes our platform. Recent testimonials from IP professionals using our services."
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allFeedbacks.slice(-3).reverse().map((feedback) => (
                <div key={feedback.id} className="bg-white/70 rounded-lg p-4 border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-semibold text-amber-900">
                      {feedback.userName || 'Anonymous User'}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500 text-lg">★</span>
                      <span className="text-sm font-bold text-amber-700">
                        {feedback.averageRating?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                  </div>

                  {feedback.feedbackMessage && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3 italic">
                      "{feedback.feedbackMessage}"
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">UI:</span>
                      <span className="font-semibold text-blue-700">{feedback.userInterfaceRating || 0}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Perf:</span>
                      <span className="font-semibold text-green-700">{feedback.performanceRating || 0}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Features:</span>
                      <span className="font-semibold text-purple-700">{feedback.featuresRating || 0}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Support:</span>
                      <span className="font-semibold text-pink-700">{feedback.supportRating || 0}/5</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <div className="text-xs text-gray-500">
                      {new Date(feedback.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {/* Platform Insights & Education Section */}
      <div className="w-full bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-8 shadow-lg border border-slate-200 mt-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center bg-gradient-to-r from-slate-700 to-gray-700 bg-clip-text text-transparent mb-6">
            Understanding Intellectual Property Analytics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* IP Asset Types */}
            <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">⚖️</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Patents</h4>
              <p className="text-sm text-gray-600">Exclusive rights granted for inventions, protecting technical innovations for up to 20 years.</p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">™️</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Trademarks</h4>
              <p className="text-sm text-gray-600">Brand identifiers including logos, names, and symbols that distinguish products and services.</p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">©️</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Copyrights</h4>
              <p className="text-sm text-gray-600">Protection for original creative works including software, literature, music, and artistic creations.</p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">🔒</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Trade Secrets</h4>
              <p className="text-sm text-gray-600">Confidential business information providing competitive advantage through proprietary processes.</p>
            </div>
          </div>

          {/* Platform Benefits */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <h4 className="text-xl font-bold text-gray-900 mb-4 text-center">Why Choose Our Platform?</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-gray-900">Comprehensive Coverage</p>
                  <p className="text-gray-600">Access to millions of patent records from global databases with advanced filtering</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-gray-900">Real-Time Updates</p>
                  <p className="text-gray-600">Stay informed with instant notifications on filing activities and status changes</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-gray-900">Advanced Analytics</p>
                  <p className="text-gray-600">Visualize trends, track competitors, and make data-driven IP strategy decisions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Statistics Footer */}
      <div className="w-full bg-gradient-to-r from-gray-800 via-slate-800 to-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 mt-6 mb-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h4 className="text-2xl font-bold text-white mb-2">Platform at a Glance</h4>
            <p className="text-gray-300">Real-time statistics showcasing our growing IP intelligence ecosystem</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg">
                <div className="text-4xl font-extrabold text-white mb-1">
                  {totalUsers > 0 ? totalUsers.toLocaleString() : '---'}
                </div>
                <div className="text-sm text-blue-100 font-medium">Registered Users</div>
                <div className="text-xs text-blue-200 mt-1">Growing Daily</div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg">
                <div className="text-4xl font-extrabold text-white mb-1">
                  {dbPatentCount > 0 ? dbPatentCount.toLocaleString() : '---'}
                </div>
                <div className="text-sm text-green-100 font-medium">Patents Indexed</div>
                <div className="text-xs text-green-200 mt-1">Local Database</div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 shadow-lg">
                <div className="text-4xl font-extrabold text-white mb-1">
                  {totalPatentFilings > 0 ? totalPatentFilings.toLocaleString() : '---'}
                </div>
                <div className="text-sm text-purple-100 font-medium">Patent Filings</div>
                <div className="text-xs text-purple-200 mt-1">User Submissions</div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 shadow-lg">
                <div className="text-4xl font-extrabold text-white mb-1">
                  {onlineUsers > 0 ? onlineUsers.toLocaleString() : '0'}
                </div>
                <div className="text-sm text-orange-100 font-medium">Online Now</div>
                <div className="text-xs text-orange-200 mt-1 flex items-center justify-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Active Users
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              © 2026 Global IP Intelligence Platform • Empowering Innovation Worldwide
            </p>
          </div>
        </div>
      </div>

      {/* Chatbot Component */}
      <Chatbot userId={userProfile?.uid} userProfile={userProfile} />
    </div >
  );
};

export default Dashboard;
