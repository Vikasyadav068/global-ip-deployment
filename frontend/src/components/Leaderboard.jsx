import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Leaderboard = ({ onBack, userProfile, onNavigateToPatentFiling }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all'); // all, weekly, monthly
  const [showConfetti, setShowConfetti] = useState(false);
  const [totalPatents, setTotalPatents] = useState(0);
  const [weeklyPatents, setWeeklyPatents] = useState(0);
  const [monthlyPatents, setMonthlyPatents] = useState(0);
  const [weeklyInnovators, setWeeklyInnovators] = useState(0);
  const [monthlyInnovators, setMonthlyInnovators] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchLeaderboardData();
  }, [timeFilter]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `http://localhost:8080/api/leaderboard/top-users?filter=${timeFilter}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }

      const data = await response.json();
      
      // Fetch current names from Firestore for each user
      const updatedData = await Promise.all(
        data.map(async (user) => {
          try {
            // userId is the email, use it to fetch from Firestore
            const userDocRef = doc(db, 'users', user.userId);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const currentName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
              
              return {
                ...user,
                userName: currentName || user.userName || 'Unknown User',
                userPhoto: userData.photoURL || user.userPhoto
              };
            }
            
            // If Firestore document doesn't exist, keep original data
            return user;
          } catch (firestoreError) {
            console.warn(`Failed to fetch Firestore data for ${user.userId}:`, firestoreError);
            return user; // Fallback to original data
          }
        })
      );
      
      setLeaderboardData(updatedData);
      
      // Calculate total patents
      const total = updatedData.reduce((sum, user) => sum + (user.patentCount || 0), 0);
      setTotalPatents(total);
      
      // Fetch weekly and monthly stats in parallel
      await fetchAdditionalStats();
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdditionalStats = async () => {
    try {
      // Fetch weekly stats
      const weeklyResponse = await fetch('http://localhost:8080/api/leaderboard/top-users?filter=weekly');
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        const weeklyTotal = weeklyData.reduce((sum, user) => sum + (user.patentCount || 0), 0);
        setWeeklyPatents(weeklyTotal);
        setWeeklyInnovators(weeklyData.length);
      }
      
      // Fetch monthly stats
      const monthlyResponse = await fetch('http://localhost:8080/api/leaderboard/top-users?filter=monthly');
      if (monthlyResponse.ok) {
        const monthlyData = await monthlyResponse.json();
        const monthlyTotal = monthlyData.reduce((sum, user) => sum + (user.patentCount || 0), 0);
        setMonthlyPatents(monthlyTotal);
        setMonthlyInnovators(monthlyData.length);
      }
    } catch (error) {
      console.warn('Failed to fetch additional stats:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLeaderboardData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getMedalIcon = (rank) => {
    if (rank === 1) {
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-400 rounded-full blur-lg opacity-50 animate-pulse"></div>
          <Trophy className="relative text-yellow-500 w-10 h-10 drop-shadow-lg" />
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-gray-400 rounded-full blur-lg opacity-50 animate-pulse"></div>
          <Medal className="relative text-gray-400 w-8 h-8 drop-shadow-md" />
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
          <Award className="relative text-orange-600 w-8 h-8 drop-shadow-md" />
        </div>
      );
    }
    return null;
  };

  const getRankBadge = (rank) => {
    const colors = {
      1: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white',
      2: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-white',
      3: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 text-white',
    };
    
    return colors[rank] || 'bg-gradient-to-br from-blue-500 to-purple-600 text-white';
  };

  const getTopThreeStyle = (rank) => {
    const styles = {
      1: 'transform scale-105 bg-gradient-to-br from-yellow-50 via-amber-100 to-yellow-100 border-yellow-400 shadow-2xl ring-4 ring-yellow-300',
      2: 'bg-gradient-to-br from-slate-50 via-gray-200 to-slate-100 border-slate-400 shadow-xl ring-4 ring-slate-300',
      3: 'bg-gradient-to-br from-orange-50 via-orange-200 to-red-100 border-orange-500 shadow-xl ring-4 ring-orange-300',
    };
    
    return styles[rank] || '';
  };

  const handleRank1Hover = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Confetti Component
  const Confetti = () => {
    const confettiPieces = Array.from({ length: 50 });
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {confettiPieces.map((_, i) => (
          <div
            key={i}
            className="absolute animate-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10px',
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${2 + Math.random()}s`,
            }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][Math.floor(Math.random() * 5)],
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl shadow-2xl p-6 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Leaderboard</h2>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl shadow-2xl p-6 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Leaderboard</h2>
        </div>
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">Error loading leaderboard: {error}</p>
          <button
            onClick={fetchLeaderboardData}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl shadow-2xl p-4 border-2 border-blue-200 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-md opacity-50"></div>
            <Trophy className="relative text-yellow-500 w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
            Patent Filing Leaderboard
          </h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-blue-500 text-blue-600 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Subtitle */}
      <p className="text-gray-600 mb-4 text-center text-sm">
        Top innovators leading the way in patent filings
      </p>

      {leaderboardData.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="mx-auto text-gray-300 w-16 h-16 mb-4" />
          <p className="text-gray-500 text-lg">No data available yet</p>
          <p className="text-gray-400 text-sm mt-2">Be the first to file a patent!</p>
        </div>
      ) : (
        <div className="space-y-4 w-full">
          {/* Top 3 Winners - Podium/Ladder Display - Full Width */}
          <div className="flex items-end justify-center gap-3 mb-6 w-full">
            {/* 2nd Place - Left Side */}
            {leaderboardData[1] && (
              <div className="relative flex-1">
                <div className={`relative border-2 rounded-lg p-3 transition-all hover:scale-105 ${getTopThreeStyle(2)}`}>
                  {/* Medal Icon at Top */}
                  <div className="flex justify-center mb-2">
                    <div className="relative">
                      <Medal className="relative text-gray-400 w-8 h-8" />
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="text-center">
                    {/* User Avatar/Initial/Photo */}
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-base font-bold bg-gradient-to-br from-gray-400 to-gray-600 text-white shadow-md overflow-hidden">
                      {leaderboardData[1].userPhoto ? (
                        <img src={leaderboardData[1].userPhoto} alt={leaderboardData[1].userName} className="w-full h-full object-cover" />
                      ) : leaderboardData[1].userName ? (
                        leaderboardData[1].userName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
                      ) : 'U'}
                    </div>

                    {/* User Name */}
                    <h3 className="text-sm font-bold text-gray-800 mb-1 truncate">
                      {leaderboardData[1].userName || 'Unknown User'}
                    </h3>

                    {/* Patent Count */}
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-gray-600" />
                      <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {leaderboardData[1].patentCount}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      Patent{leaderboardData[1].patentCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {/* Rank Badge Below */}
                  <div className="mt-2 flex justify-center">
                    <div className={`${getRankBadge(2)} px-3 py-1 rounded-full font-bold text-sm shadow-md`}>
                      #2
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place - Center (Tallest) */}
            {leaderboardData[0] && (
              <div className="relative flex-1">
                <div 
                  className={`relative border-2 rounded-lg p-4 transition-all hover:scale-105 ${getTopThreeStyle(1)} cursor-pointer`}
                  onMouseEnter={handleRank1Hover}
                >
                  {/* Medal Icon at Top */}
                  <div className="flex justify-center mb-2">
                    <div className="relative">
                      <Trophy className="relative text-yellow-500 w-10 h-10" />
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="text-center">
                    {/* User Avatar/Initial/Photo */}
                    <div className="w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center text-xl font-bold bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg overflow-hidden">
                      {leaderboardData[0].userPhoto ? (
                        <img src={leaderboardData[0].userPhoto} alt={leaderboardData[0].userName} className="w-full h-full object-cover" />
                      ) : leaderboardData[0].userName ? (
                        leaderboardData[0].userName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
                      ) : 'U'}
                    </div>

                    {/* User Name */}
                    <h3 className="text-base font-bold text-gray-800 mb-2 truncate">
                      {leaderboardData[0].userName || 'Unknown User'}
                    </h3>

                    {/* Patent Count */}
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <TrendingUp className="w-4 h-4 text-yellow-600" />
                      <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {leaderboardData[0].patentCount}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      Patent{leaderboardData[0].patentCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Sparkle Effect */}
                  <div className="absolute top-1 right-1">
                    <Sparkles className="text-yellow-500 w-4 h-4 animate-pulse" />
                  </div>
                  
                  {/* Rank Badge Below */}
                  <div className="mt-2 flex justify-center">
                    <div className={`${getRankBadge(1)} px-4 py-1 rounded-full font-bold text-base shadow-md`}>
                      #1
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place - Right Side */}
            {leaderboardData[2] && (
              <div className="relative flex-1">
                <div className={`relative border-2 rounded-lg p-3 transition-all hover:scale-105 ${getTopThreeStyle(3)}`}>
                  {/* Medal Icon at Top */}
                  <div className="flex justify-center mb-2">
                    <div className="relative">
                      <Award className="relative text-orange-600 w-8 h-8" />
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="text-center">
                    {/* User Avatar/Initial/Photo */}
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-base font-bold bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md overflow-hidden">
                      {leaderboardData[2].userPhoto ? (
                        <img src={leaderboardData[2].userPhoto} alt={leaderboardData[2].userName} className="w-full h-full object-cover" />
                      ) : leaderboardData[2].userName ? (
                        leaderboardData[2].userName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
                      ) : 'U'}
                    </div>

                    {/* User Name */}
                    <h3 className="text-sm font-bold text-gray-800 mb-1 truncate">
                      {leaderboardData[2].userName || 'Unknown User'}
                    </h3>

                    {/* Patent Count */}
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-orange-600" />
                      <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {leaderboardData[2].patentCount}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      Patent{leaderboardData[2].patentCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {/* Rank Badge Below */}
                  <div className="mt-2 flex justify-center">
                    <div className={`${getRankBadge(3)} px-3 py-1 rounded-full font-bold text-sm shadow-md`}>
                      #3
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Time Filter with Conditional Stats - Below Top 3 */}
          <div className="mb-4 w-full">
            {/* Filter Buttons Row */}
            <div className="flex justify-center gap-2 mb-3">
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition text-sm ${
                  timeFilter === 'all'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setTimeFilter('monthly')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition text-sm ${
                  timeFilter === 'monthly'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setTimeFilter('weekly')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition text-sm ${
                  timeFilter === 'weekly'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                This Week
              </button>
            </div>

            {/* Conditional Statistics Cards - Same Row as Filter */}
            {timeFilter === 'monthly' && (
              <div className="flex justify-center">
                <div className="bg-white rounded-lg shadow-md p-3 border-2 border-purple-200 max-w-md w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xs font-semibold text-gray-700 mb-1">
                        Patents Filed This Month
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {monthlyPatents}
                        </div>
                        <div className="text-gray-600">
                          <p className="text-xs">by {monthlyInnovators} innovators</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl opacity-20">
                      📊
                    </div>
                  </div>
                </div>
              </div>
            )}

            {timeFilter === 'weekly' && (
              <div className="flex justify-center">
                <div className="bg-white rounded-lg shadow-md p-3 border-2 border-indigo-200 max-w-md w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xs font-semibold text-gray-700 mb-1">
                        Patents Filed This Week
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                          {weeklyPatents}
                        </div>
                        <div className="text-gray-600">
                          <p className="text-xs">by {weeklyInnovators} innovators</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl opacity-20">
                      📈
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chart Visualization */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4 border-2 border-indigo-200 w-full">
            <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp className="text-indigo-600" />
              Patent Filing Distribution
            </h3>
            <div className="space-y-2">
              {leaderboardData.slice(0, 10).map((user, index) => {
                const maxCount = leaderboardData[0]?.patentCount || 1;
                const percentage = (user.patentCount / maxCount) * 100;
                return (
                  <div key={user.userId} className="flex items-center gap-2">
                    <div className="w-8 text-xs font-semibold text-gray-600">#{index + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-gray-700 truncate">{user.userName || 'Unknown'}</span>
                        <span className="text-xs font-bold text-indigo-600">{user.patentCount}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${percentage}%`,
                            background: index < 3 
                              ? `linear-gradient(to right, ${index === 0 ? '#FFD700, #FFA500' : index === 1 ? '#C0C0C0, #A9A9A9' : '#CD7F32, #FF8C00'})`
                              : 'linear-gradient(to right, #6366f1, #8b5cf6)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rest of Top 10 - List Format */}
          {leaderboardData.length > 3 && (
            <div className="mt-4 w-full">
              <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Award className="text-blue-500" />
                Top 10 Innovators
              </h3>
              <div className="space-y-2">
                {leaderboardData.slice(3, 10).map((user, index) => {
                  const rank = index + 4;
                  return (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all hover:scale-102"
                    >
                      {/* Left Side - Rank and User Info */}
                      <div className="flex items-center gap-3 flex-1">
                        {/* Rank */}
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                          #{rank}
                        </div>

                        {/* User Avatar */}
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md overflow-hidden">
                          {user.userPhoto ? (
                            <img src={user.userPhoto} alt={user.userName} className="w-full h-full object-cover" />
                          ) : user.userName ? (
                            user.userName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
                          ) : 'U'}
                        </div>

                        {/* User Name */}
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-sm">
                            {user.userName || 'Unknown User'}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {user.patentCount} patent{user.patentCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Right Side - Patent Count Badge */}
                      <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                        <TrendingUp className="text-blue-600 w-4 h-4" />
                        <span className="text-lg font-bold text-blue-600">
                          {user.patentCount}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Motivational Section */}
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg p-3 mt-4 text-white text-center shadow-lg w-full">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 animate-bounce" />
              <h3 className="text-base font-bold">Ready to Make Your Mark?</h3>
              <Sparkles className="w-4 h-4 animate-bounce" />
            </div>
            <p className="text-xs mb-2 text-white/90">
              Join these innovative leaders and protect your groundbreaking ideas today!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-lg mb-0.5">💡</div>
                <p className="text-xs font-semibold">Protect Your Innovation</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-lg mb-0.5">🏆</div>
                <p className="text-xs font-semibold">Build Your Legacy</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-lg mb-0.5">⚡</div>
                <p className="text-xs font-semibold">Stay Ahead of Competition</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (onNavigateToPatentFiling) {
                  onNavigateToPatentFiling();
                }
              }}
              className="bg-white text-purple-600 px-4 py-1.5 rounded-lg font-bold hover:bg-gray-100 transition-all hover:scale-105 shadow-md text-xs"
            >
              Start Your Patent Journey →
            </button>
          </div>


        </div>
      )}

      {/* Confetti Effect */}
      {showConfetti && <Confetti />}

      {/* Add custom CSS for confetti animation */}
      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;
