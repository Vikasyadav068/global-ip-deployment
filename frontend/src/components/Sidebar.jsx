import React, { useState } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  Search,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Crown,
  Sparkles,
  MessageSquare,
  Mail,
  FileCheck,
  Shield,
  Lock,
  Trophy,
} from "lucide-react";
import UpgradeModal from "./UpgradeModal";

const Sidebar = ({ isOpen, onClose, activeItem, setActiveItem, onLogout, userProfile, onAddNotification }) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastTimer, setToastTimer] = useState(5);
  const [lockedFeature, setLockedFeature] = useState('');
  
  // Handle toast auto-dismiss with countdown
  React.useEffect(() => {
    let interval;
    if (showToast && toastTimer > 0) {
      interval = setInterval(() => {
        setToastTimer(prev => prev - 1);
      }, 1000);
    } else if (toastTimer === 0) {
      setShowToast(false);
      setToastTimer(5);
    }
    return () => clearInterval(interval);
  }, [showToast, toastTimer]);

  // Handle locked feature click
  const handleLockedFeatureClick = (featureName) => {
    setLockedFeature(featureName);
    setShowToast(true);
    setToastTimer(5);
  };

  const menuItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "search", icon: Search, label: "Search" },
    { id: "filing", icon: FileText, label: "Filing Tracker" },
    { id: "legal", icon: BarChart3, label: "Legal Status" },
    { id: "leaderboard", icon: Trophy, label: "Leaderboard" },
  ];

  // Patent filing is only for non-basic users
  const patentFilingItem = { id: "patent-filing", icon: FileCheck, label: "Patent Filing" };
  const isBasicUser = !userProfile?.subscriptionType || userProfile?.subscriptionType.toLowerCase() === 'basic';

  const bottomItems = [
    { id: "admin-patents", icon: Shield, label: "Admin Panel" },
    { id: "contact", icon: Mail, label: "Contact Us" },
    { id: "feedback", icon: MessageSquare, label: "Feedback" },
    { id: "settings", icon: Settings, label: "Settings" },
    { id: "logout", icon: LogOut, label: "Log Out" },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50
          w-64 bg-white/95 backdrop-blur-md
          border-r border-white/20 shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50"
          >
            {isOpen ? (
              <X size={24} className="text-gray-700" />
            ) : (
              <Menu size={24} className="text-gray-700" />
            )}
          </button>
        </div>

        {/* Scrollable Content Wrapper */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
          {/* Main Menu */}
          <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isFilingTracker = item.id === 'filing';
            const isLegalStatus = item.id === 'legal';
            const isLeaderboard = item.id === 'leaderboard';
            const isLocked = ((isFilingTracker || isLegalStatus || isLeaderboard) && isBasicUser);
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isLocked) {
                    handleLockedFeatureClick(item.label);
                  } else {
                    setActiveItem(item.id);
                  }
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition
                  ${
                    activeItem === item.id
                      ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg"
                      : "text-gray-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50"
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
                {isLocked && <Lock size={16} className="ml-auto" />}
              </button>
            );
          })}

          {/* Patent Filing - Visible for all users, locked for basic */}
          <button
            key={patentFilingItem.id}
            onClick={() => {
              if (isBasicUser) {
                handleLockedFeatureClick(patentFilingItem.label);
              } else {
                setActiveItem(patentFilingItem.id);
              }
            }}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl transition
              ${
                activeItem === patentFilingItem.id
                  ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50"
              }
            `}
          >
            <FileCheck size={20} />
            <span className="font-medium">{patentFilingItem.label}</span>
            {isBasicUser && <Lock size={16} className="ml-auto" />}
          </button>

          {/* Upgrade to Pro Button */}
          {userProfile?.subscriptionType !== "pro" && userProfile?.subscriptionType !== "enterprise" && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg hover:shadow-xl hover:scale-105 mt-4 relative overflow-hidden group"
            >
              <Crown size={20} className="animate-pulse" />
              <span className="font-bold">Upgrade to Pro</span>
              <Sparkles size={16} className="ml-auto" />
              <div className="absolute inset-0 bg-white/20 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            </button>
          )}
        </nav>

        {/* Bottom Menu */}
        <div className="p-4 pt-2 space-y-2">
          <div className="border-t border-gray-100 pt-2">
            {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() =>
                  item.id === "logout"
                    ? onLogout()
                    : setActiveItem(item.id)
                }
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition
                  ${
                    activeItem === item.id
                      ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg"
                      : "text-gray-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50"
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
          </div>
        </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-6 z-[60] animate-slide-in-right">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-orange-400 overflow-hidden max-w-md">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-white" />
                <span className="text-white font-bold text-sm">Premium Feature Locked</span>
              </div>
              <button
                onClick={() => {
                  setShowToast(false);
                  setToastTimer(5);
                }}
                className="text-white hover:bg-white/20 rounded-full p-1 transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-gray-800 font-semibold mb-2">
                {lockedFeature} is a premium feature
              </p>
              <p className="text-gray-600 text-sm mb-3">
                Please upgrade to <span className="font-bold text-blue-600">Pro</span> or <span className="font-bold text-purple-600">Enterprise</span> to access this feature.
              </p>
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowToast(false);
                    setToastTimer(5);
                    setShowUpgradeModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition flex items-center gap-2"
                >
                  <Crown size={16} />
                  Upgrade Now
                </button>
                
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold">
                    {toastTimer}
                  </div>
                  <span className="text-xs">seconds</span>
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="h-1 bg-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(toastTimer / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userProfile={userProfile}
        onAddNotification={onAddNotification}
      />
    </>
  );
};

export default Sidebar;
