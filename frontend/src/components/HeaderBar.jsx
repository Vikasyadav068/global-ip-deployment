import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, Crown, Zap, Calendar, Clock, X, Shield } from 'lucide-react';

const HeaderBar = ({ onMenuClick, onProfileClick, userProfile, onSearch, currentPage, sidebarOpen, notifications = [], onDismissNotification }) => {
  const [query, setQuery] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (currentPage === 'dashboard') {
      setQuery('');
    }
  }, [currentPage]);

  // Update date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  // Format date and time
  const formatDateTime = () => {
    const options = { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    const date = currentDateTime.toLocaleDateString('en-US', options);
    const time = currentDateTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    return { date, time };
  };

  const { date, time } = formatDateTime();

  // Calculate subscription details
  const getSubscriptionDetails = () => {
    if (!userProfile?.subscriptionType || userProfile?.subscriptionType === 'basic') {
      return null;
    }

    try {
      let endDate;
      if (userProfile.subscriptionEndDate instanceof Date) {
        endDate = userProfile.subscriptionEndDate;
      } else if (userProfile.subscriptionEndDate?.toDate) {
        endDate = userProfile.subscriptionEndDate.toDate();
      } else if (typeof userProfile.subscriptionEndDate === 'string') {
        endDate = new Date(userProfile.subscriptionEndDate);
      } else {
        return null;
      }

      let startDate;
      if (userProfile.subscriptionStartDate instanceof Date) {
        startDate = userProfile.subscriptionStartDate;
      } else if (userProfile.subscriptionStartDate?.toDate) {
        startDate = userProfile.subscriptionStartDate.toDate();
      } else if (typeof userProfile.subscriptionStartDate === 'string') {
        startDate = new Date(userProfile.subscriptionStartDate);
      } else {
        startDate = new Date();
      }

      const now = new Date();
      const diffTime = endDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysLeft = diffDays > 0 ? diffDays : 0;

      return {
        type: userProfile.subscriptionType,
        daysLeft,
        startDate: startDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        endDate: endDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        price: userProfile.subscriptionPrice || 0,
        paymentId: userProfile.lastPayment?.razorpayPaymentId || 'N/A',
        orderId: userProfile.lastPayment?.razorpayOrderId || 'N/A',
        amount: userProfile.lastPayment?.amount || userProfile.subscriptionPrice || 0,
        currency: userProfile.lastPayment?.currency || 'INR'
      };
    } catch (error) {
      console.error('Error calculating subscription details:', error);
      return null;
    }
  };

  const subscriptionDetails = getSubscriptionDetails();
  
  return (
    <div className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-700 border-b border-teal-500/30 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 shadow-lg">
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 justify-between">

        {/* Left Section - Menu, Logo, Subscription */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
          <button 
            onClick={onMenuClick}
            className={`p-1.5 sm:p-2 hover:bg-white/20 rounded-xl transition ${sidebarOpen ? 'invisible' : ''}`}
          >
            <Menu size={20} className="sm:w-6 sm:h-6 text-white" />
          </button>

          {/* App Logo and Branding */}
          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <Shield className="text-yellow-300" size={16} />
            <span className="text-white font-bold text-xs sm:text-sm md:text-base whitespace-nowrap">
              <span className="lg:hidden">GIP</span>
              <span className="hidden lg:inline">Global Intellectual Property</span>
            </span>
          </div>

          {/* Subscription Badge with Hover Details - Hidden on small/medium screens */}
          {subscriptionDetails ? (
            <div className="relative group hidden lg:block">
              <div className="flex items-center gap-2 px-3 lg:px-4 xl:px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 min-w-[140px] xl:min-w-[180px]">
                <Crown size={18} className="animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase leading-tight">
                    {subscriptionDetails.type}
                  </span>
                  <span className="text-xs font-semibold opacity-90">
                    {subscriptionDetails.daysLeft} days left
                  </span>
                </div>
              </div>

              {/* Hover Tooltip - Subscription Details */}
              <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="flex items-center justify-between mb-3 pb-3 border-b">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Crown size={18} className="text-purple-600" />
                    {subscriptionDetails.type.toUpperCase()} Plan
                  </h3>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    Active
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Days Remaining:</span>
                    <span className="font-semibold text-gray-800">{subscriptionDetails.daysLeft} days</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Date:</span>
                    <span className="font-medium text-gray-800 text-xs">{subscriptionDetails.startDate}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">End Date:</span>
                    <span className="font-medium text-gray-800 text-xs">{subscriptionDetails.endDate}</span>
                  </div>

                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-bold text-green-600">
                        ₹{subscriptionDetails.amount} {subscriptionDetails.currency}
                      </span>
                    </div>
                  </div>

                  {subscriptionDetails.paymentId !== 'N/A' && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between items-start">
                          <span className="text-gray-600">Transaction ID:</span>
                          <span className="font-mono text-xs text-gray-700 break-all text-right max-w-[180px]">{subscriptionDetails.paymentId}</span>
                        </div>
                      </div>
                      
                      {subscriptionDetails.orderId !== 'N/A' && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-600">Order ID:</span>
                          <span className="font-mono text-xs text-gray-700 break-all text-right max-w-[180px]">{subscriptionDetails.orderId}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2 px-3 lg:px-4 xl:px-5 py-2 rounded-xl bg-gradient-to-r from-gray-400 to-gray-600 text-white shadow-lg min-w-[120px] xl:min-w-[150px]">
              <Zap size={16} />
              <span className="text-xs font-bold uppercase">BASIC</span>
            </div>
          )}

          {/* Date and Time Display - Hidden on smaller screens */}
          <div className="hidden 2xl:flex flex-col items-start bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Calendar size={16} className="text-yellow-300" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <Clock size={14} className="text-yellow-300" />
              <span>{time}</span>
            </div>
          </div>
        </div>
        
        {/* Center Section - Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-[180px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-1 sm:mx-2 md:mx-3">
          <div className="relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-blue-600 z-10" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 sm:pl-10 pr-10 sm:pr-16 md:pr-20 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-sm text-gray-800 bg-white/95 backdrop-blur-sm border-2 border-white/40 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 shadow-lg placeholder-gray-500"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs sm:text-sm rounded-lg hover:shadow-xl transition-all duration-300 font-bold hover:scale-105"
            >
              <span className="hidden sm:inline">Search</span>
              <Search className="sm:hidden" size={14} />
            </button>
          </div>
        </form>

        {/* Right Section - Date/Time, Notifications, Profile */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
          {/* Date/Time Mobile View - Only on medium to xl screens */}
          <div className="hidden md:flex 2xl:hidden flex-col items-end bg-white/10 px-2 py-1 rounded-lg">
            <div className="flex items-center gap-1 text-xs font-medium text-white">
              <Clock size={12} className="text-yellow-300" />
              <span>{time}</span>
            </div>
          </div>

          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-xl relative transition"
            >
              <Bell size={16} className="sm:w-[18px] sm:h-[18px] text-white" />
              {notifications.length > 0 && (
                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-lg"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
                  <h3 className="font-bold">Notifications</h3>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-1 hover:bg-white/20 rounded-full transition"
                    title="Close notifications"
                  >
                    <X size={18} className="text-white" />
                  </button>
                </div>
                
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Bell size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification, index) => (
                      <div key={index} className="p-4 hover:bg-gray-50 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Crown className="text-purple-600" size={16} />
                              <h4 className="font-semibold text-gray-800">{notification.title}</h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                            {notification.details && (
                              <div className="bg-blue-50 rounded-lg p-3 text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Plan:</span>
                                  <span className="font-semibold text-gray-800">{notification.details.plan}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Amount:</span>
                                  <span className="font-semibold text-green-600">₹{notification.details.amount}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Valid Until:</span>
                                  <span className="font-semibold text-gray-800">{notification.details.validUntil}</span>
                                </div>
                                {notification.details.paymentId && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Payment ID:</span>
                                    <span className="font-mono text-gray-700">{notification.details.paymentId.substring(0, 20)}...</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-2">{notification.timestamp}</p>
                          </div>
                          <button
                            onClick={() => onDismissNotification?.(index)}
                            className="p-1 hover:bg-gray-200 rounded-full"
                          >
                            <X size={14} className="text-gray-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
            <div className="text-right hidden md:block">
              <div className="text-xs md:text-sm font-bold text-white drop-shadow-md truncate max-w-[100px] lg:max-w-[150px] xl:max-w-[200px]">
                {userProfile.firstName} {userProfile.lastName}
              </div>
              <div className="text-[10px] md:text-xs text-white/90 drop-shadow-sm truncate max-w-[100px] lg:max-w-[150px] xl:max-w-[200px]">{userProfile.email}</div>
            </div>
            
            <button 
              onClick={onProfileClick}
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg ring-2 ring-white/30 hover:ring-white/50 transition flex-shrink-0"
              title={`${userProfile.firstName} ${userProfile.lastName}`}
            >
              {userProfile.photoURL ? (
                <img 
                  src={userProfile.photoURL} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-[10px] sm:text-xs md:text-sm font-bold drop-shadow-md">
                  {userProfile.firstName.charAt(0)}{userProfile.lastName.charAt(0)}
                </span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HeaderBar;
