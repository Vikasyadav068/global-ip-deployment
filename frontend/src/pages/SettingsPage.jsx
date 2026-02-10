import React, { useState, useEffect } from 'react';
import { 
  Lock, Key, Activity, LogOut, Bell, Palette, Globe, FileText, 
  HelpCircle, Trash, CreditCard, Download, Moon, Sun, Settings, Clock, 
  AlertCircle, Calendar, Crown, Shield, User, Mail, ChevronDown, ChevronUp
} from 'lucide-react';
import UpgradeModal from '../components/UpgradeModal';
import { db, auth } from '../firebase';
import { doc, updateDoc, serverTimestamp, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { storage } from '../firebase';
import { API_BASE_URL } from '../config/api';

const SettingsPage = ({ userProfile, setUserProfile, onBack }) => {
  const [activeTab, setActiveTab] = useState('security');
  const [userDetails, setUserDetails] = useState({
    name: '',
    email: '',
    lastUpdated: null
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    paymentAlerts: true,
    searchAlerts: false,
    systemAnnouncements: true
  });
  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'en',
    timezone: 'Asia/Kolkata'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Legal & Support states
  const [faqs, setFaqs] = useState([]);
  const [termsConditions, setTermsConditions] = useState(null);
  const [privacyPolicy, setPrivacyPolicy] = useState(null);
  const [cookiePolicy, setCookiePolicy] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCookie, setShowCookie] = useState(false);
  const [legalLoading, setLegalLoading] = useState(false);

  const currentUID = auth.currentUser?.uid || userProfile?.uid;

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentUID) {
        setIsLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUID);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          
          // Update userProfile with latest Firestore data including lastPayment
          if (setUserProfile) {
            setUserProfile(prev => ({
              ...prev,
              ...data,
              uid: currentUID
            }));
          }
          
          // Set user basic details
          setUserDetails({
            name: data.firstName || data.name || auth.currentUser?.displayName || 'User',
            email: data.email || auth.currentUser?.email || '',
            lastUpdated: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || null)
          });
          
          if (data.notificationSettings) {
            setNotificationSettings(data.notificationSettings);
          }
          
          if (data.preferences) {
            setPreferences(data.preferences);
          }
        } else {
          // If no Firestore data, use auth data
          setUserDetails({
            name: auth.currentUser?.displayName || 'User',
            email: auth.currentUser?.email || '',
            lastUpdated: null
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [currentUID]);

  // Load Legal & Support Data
  useEffect(() => {
    const loadLegalData = async () => {
      if (activeTab !== 'legal') return;
      
      setLegalLoading(true);
      try {
        // Fetch FAQs
        const faqResponse = await fetch(`${API_BASE_URL}/faq`);
        if (faqResponse.ok) {
          const faqData = await faqResponse.json();
          setFaqs(faqData.data || []);
        }
        
        // Fetch Terms & Conditions
        const termsResponse = await fetch(`${API_BASE}/terms`);
        if (termsResponse.ok) {
          const termsData = await termsResponse.json();
          setTermsConditions(termsData.data || null);
        }
        
        // Fetch Privacy Policy
        const privacyResponse = await fetch(`${API_BASE}/privacy`);
        if (privacyResponse.ok) {
          const privacyData = await privacyResponse.json();
          setPrivacyPolicy(privacyData.data || null);
        }
        
        // Fetch Cookie Policy
        const cookieResponse = await fetch(`${API_BASE}/cookie`);
        if (cookieResponse.ok) {
          const cookieData = await cookieResponse.json();
          setCookiePolicy(cookieData.data || null);
        }
      } catch (error) {
        console.error('Error loading legal data:', error);
      } finally {
        setLegalLoading(false);
      }
    };

    loadLegalData();
  }, [activeTab]);

  // Subscription Handlers
  const handleUpgradeClick = () => {
    const subscriptionType = userProfile?.subscriptionType || 'basic';
    
    // If user has basic plan, allow upgrade
    if (subscriptionType.toLowerCase() === 'basic') {
      setShowUpgradeModal(true);
    }
    // If user has other subscription, they need to cancel first
    // Button will be disabled in this case
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? All your subscription data including payment history will be permanently deleted.')) {
      return;
    }
    
    try {
      const userRef = doc(db, 'users', currentUID);
      
      // Delete all subscription-related data from Firestore
      await updateDoc(userRef, {
        subscriptionType: 'basic',
        subscriptionPrice: 0,
        subscriptionEndDate: null,
        subscriptionStartDate: null,
        lastPayment: null,  // Delete payment history completely
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      if (setUserProfile) {
        setUserProfile(prev => ({
          ...prev,
          subscriptionType: 'basic',
          subscriptionPrice: 0,
          subscriptionEndDate: null,
          subscriptionStartDate: null,
          lastPayment: null
        }));
      }
      
      alert('Subscription cancelled successfully. All subscription data has been removed.');
      window.location.reload();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Error cancelling subscription: ' + error.message);
    }
  };

  // Security Settings Handlers
  const handleSendPasswordReset = async () => {
    try {
      const email = userDetails.email || auth.currentUser?.email;
      
      if (!email) {
        alert('Email not found. Please login again.');
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      alert(`Password reset email sent to ${email}. Please check your inbox.`);
      
      // Reset the message after 5 seconds
      setTimeout(() => {
        setResetEmailSent(false);
      }, 5000);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      if (error.code === 'auth/too-many-requests') {
        alert('Too many requests. Please try again later.');
      } else {
        alert('Error: ' + error.message);
      }
    }
  };



  // Notification Settings Handler
  const handleSaveNotifications = async () => {
    try {
      const userRef = doc(db, 'users', currentUID);
      await updateDoc(userRef, {
        notificationSettings: notificationSettings,
        updatedAt: serverTimestamp()
      });
      alert('Notification settings saved!');
    } catch (error) {
      alert('Error saving settings: ' + error.message);
    }
  };

  // Preferences Handler
  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', currentUID);
      await updateDoc(userRef, {
        preferences: preferences,
        updatedAt: serverTimestamp()
      });
      
      alert('Preferences saved!');
    } catch (error) {
      alert('Error saving preferences: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Apply theme whenever preferences.theme changes
  useEffect(() => {
    if (preferences.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.theme]);

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSavePreferences();
    }
  };

  // Quick Logout - No confirmation, instant redirect
  const handleQuickLogout = async () => {
    try {
      // Clear localStorage first
      localStorage.removeItem('userProfile');
      localStorage.removeItem('searchMode');
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Force redirect to login page (main public site)
      window.location.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear localStorage and redirect anyway
      localStorage.clear();
      window.location.replace('/login');
    }
  };

  // Account Deactivation - Instant with 30-day auto-delete
  const handleDeactivateAccount = async () => {
    // Show confirmation dialog with clear warning
    const confirmed = window.confirm(
      '⚠️ WARNING: Account Deactivation\n\n' +
      'This will:\n' +
      '• Deactivate your account IMMEDIATELY\n' +
      '• Sign you out of all devices\n' +
      '• Give you 30 days to reactivate by logging in\n' +
      '• PERMANENTLY DELETE your account after 30 days if not reactivated\n\n' +
      'Are you absolutely sure you want to deactivate your account?'
    );
    
    if (!confirmed) {
      console.log('Account deactivation cancelled by user');
      return;
    }
    
    // Second confirmation for extra safety
    const doubleConfirmed = window.confirm(
      'Final Confirmation\n\n' +
      'This is your last chance!\n\n' +
      'Click OK to deactivate your account now, or Cancel to keep it active.'
    );
    
    if (!doubleConfirmed) {
      console.log('Account deactivation cancelled on second confirmation');
      return;
    }
    
    try {
      const userRef = doc(db, 'users', currentUID);
      
      console.log('Deactivating account for user:', currentUID);
      
      // Update status immediately in Firestore
      await updateDoc(userRef, {
        accountStatus: 'deactivated',
        deactivatedAt: serverTimestamp()
      });
      
      console.log('✅ Account status updated in Firestore. Will auto-delete in 30 days if not reactivated.');
      
      // Show success message
      alert(
        '✓ Account Deactivated Successfully\n\n' +
        'Your account has been deactivated.\n\n' +
        'You have 30 days to reactivate by logging in.\n' +
        'After 30 days, your account will be permanently deleted.'
      );
      
      // Clear localStorage
      localStorage.removeItem('userProfile');
      localStorage.removeItem('searchMode');
      
      // Sign out and redirect immediately
      await signOut(auth);
      console.log('✅ User signed out successfully');
      
      // Force redirect to login page (main public site)
      window.location.replace('/login');
    } catch (error) {
      console.error('❌ Deactivation error:', error);
      console.error('Error details:', error.message, error.code);
      alert(
        'Error: Failed to deactivate account\n\n' +
        error.message + '\n\n' +
        'Please try again or contact support if the problem persists.'
      );
      // Only sign out if deactivation was successful
      // Don't redirect on error
    }
  };

  const tabs = [
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'legal', label: 'Legal & Support', icon: FileText },
    { id: 'account', label: 'Account Management', icon: AlertCircle }
  ];

  // Render Security Tab Content
  const renderSecurityTab = () => (
    <div className="space-y-6">
      {/* User Basic Details */}
      <div className="bg-gradient-to-br from-white to-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <User className="text-indigo-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">User Details</h3>
            <p className="text-sm text-gray-500">Your basic account information</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-indigo-100 hover:border-indigo-300 transition-all">
            <div className="flex items-center gap-3">
              <User className="text-indigo-500" size={20} />
              <div>
                <p className="text-sm font-semibold text-gray-500">First Name</p>
                <p className="font-bold text-gray-800">{userDetails.name}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-indigo-100 hover:border-indigo-300 transition-all">
            <div className="flex items-center gap-3">
              <Mail className="text-indigo-500" size={20} />
              <div>
                <p className="text-sm font-semibold text-gray-500">Email</p>
                <p className="font-bold text-gray-800">{userDetails.email}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-indigo-100 hover:border-indigo-300 transition-all">
            <div className="flex items-center gap-3">
              <Clock className="text-indigo-500" size={20} />
              <div>
                <p className="text-sm font-semibold text-gray-500">Last Updated</p>
                <p className="font-bold text-gray-800">
                  {userDetails.lastUpdated ? new Date(userDetails.lastUpdated).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Password */}
      <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Lock className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Reset Password</h3>
            <p className="text-sm text-gray-500">Send password reset link to your email</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
            <p className="text-gray-700 mb-2">
              Click the button below to receive a password reset link at:
            </p>
            <p className="font-bold text-blue-600 flex items-center gap-2">
              <Mail size={18} />
              {userDetails.email}
            </p>
          </div>
          
          {resetEmailSent && (
            <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-green-700 font-semibold">
                ✓ Reset email sent! Check your inbox.
              </p>
            </div>
          )}
          
          <button
            onClick={handleSendPasswordReset}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105"
          >
            Send Reset Password Email
          </button>
        </div>
      </div>

    </div>
  );

  // Render Subscription Tab Content
  const renderSubscriptionTab = () => {
    const subscriptionType = userProfile?.subscriptionType || 'basic';
    const subscriptionPrice = userProfile?.subscriptionPrice || 0;
    const endDate = userProfile?.subscriptionEndDate ? 
      (userProfile.subscriptionEndDate.toDate ? userProfile.subscriptionEndDate.toDate() : new Date(userProfile.subscriptionEndDate)) : 
      null;
    const daysLeft = endDate ? Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    return (
      <div className="space-y-6">
        {/* Current Plan */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Crown size={32} />
              <div>
                <h3 className="text-2xl font-bold capitalize">{subscriptionType} Plan</h3>
                <p className="text-blue-100">Currently Active</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">₹{subscriptionPrice}</p>
              <p className="text-blue-100">/month</p>
            </div>
          </div>
          
          {endDate && (
            <div className="bg-white/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">Next Billing Date</p>
                  <p className="font-semibold">{endDate.toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-100">Days Remaining</p>
                  <p className="font-bold text-2xl">{daysLeft}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Subscription History */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="text-green-500" size={24} />
            Active Subscription History
          </h3>
          
          {userProfile?.subscriptionType && userProfile.subscriptionType.toLowerCase() !== 'basic' ? (
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">Active Subscription</p>
                  <p className="text-sm text-gray-500">
                    ₹{subscriptionPrice} / month
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-500 text-white text-sm rounded-full h-fit">Active</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">Transaction ID</p>
                  <p className="font-mono text-xs text-gray-800 break-all">
                    {(userProfile && userProfile.lastPayment && userProfile.lastPayment.razorpayPaymentId) || 'N/A'}
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">Amount Paid</p>
                  <p className="font-semibold text-gray-800">
                    ₹{userProfile?.lastPayment?.amount || subscriptionPrice} {userProfile?.lastPayment?.currency || 'INR'}
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">Subscription Start Date</p>
                  <p className="font-semibold text-gray-800">
                    {userProfile?.subscriptionStartDate ? 
                      (userProfile.subscriptionStartDate.toDate ? 
                        userProfile.subscriptionStartDate.toDate().toLocaleDateString() : 
                        new Date(userProfile.subscriptionStartDate).toLocaleDateString()
                      ) : 'N/A'}
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-medium mb-1">Subscription End Date</p>
                  <p className="font-semibold text-gray-800">
                    {endDate ? endDate.toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                
                {userProfile?.lastPayment?.razorpayOrderId && (
                  <div className="p-3 bg-gray-50 rounded-lg md:col-span-2">
                    <p className="text-gray-500 font-medium mb-1">Order ID</p>
                    <p className="font-mono text-xs text-gray-800 break-all">
                      {userProfile.lastPayment.razorpayOrderId}
                    </p>
                  </div>
                )}
                
                {userProfile?.lastPayment?.timestamp && (
                  <div className="p-3 bg-gray-50 rounded-lg md:col-span-2">
                    <p className="text-gray-500 font-medium mb-1">Payment Date</p>
                    <p className="font-semibold text-gray-800">
                      {userProfile.lastPayment.timestamp.toDate ? 
                        userProfile.lastPayment.timestamp.toDate().toLocaleString() : 
                        new Date(userProfile.lastPayment.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">You do not have any active subscriptions</p>
            </div>
          )}
        </div>

        {/* Upgrade/Cancel Options */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Manage Subscription</h3>
          <div className="space-y-3">
            <button 
              onClick={handleUpgradeClick}
              disabled={subscriptionType.toLowerCase() !== 'basic'}
              className={`w-full px-6 py-3 rounded-lg transition ${
                subscriptionType.toLowerCase() === 'basic'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:from-blue-600 hover:to-purple-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {subscriptionType.toLowerCase() === 'basic' ? 'Upgrade Plan' : 'Cancel Current Plan to Upgrade'}
            </button>
            
            {subscriptionType.toLowerCase() !== 'basic' && (
              <button 
                onClick={handleCancelSubscription}
                className="w-full px-6 py-3 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition font-semibold"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Notifications Tab Content
  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-white to-purple-50 border-2 border-purple-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Bell className="text-purple-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Notification Preferences</h3>
            <p className="text-sm text-gray-500">Manage how you receive updates</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {[
            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via email', icon: '📧' },
            { key: 'paymentAlerts', label: 'Payment Alerts', desc: 'Get notified about payments and billing', icon: '💳' },
            { key: 'searchAlerts', label: 'Search Alerts', desc: 'Alerts for new search results', icon: '🔍' },
            { key: 'systemAnnouncements', label: 'System Announcements', desc: 'Important platform updates', icon: '📢' }
          ].map(({ key, label, desc, icon }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border-2 border-purple-100 hover:border-purple-300 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="font-semibold text-gray-800">{label}</p>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings[key]}
                  onChange={(e) => setNotificationSettings({...notificationSettings, [key]: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
        
        <button
          onClick={handleSaveNotifications}
          className="mt-6 px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105"
        >
          Save Notification Settings
        </button>
      </div>
    </div>
  );

  // Render Preferences Tab Content
  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Palette className="text-purple-500" size={24} />
          App Preferences
        </h3>
        
        <div className="space-y-4" onKeyPress={handleKeyPress}>
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
            <div className="flex gap-3">
              <button
                onClick={() => setPreferences({...preferences, theme: 'light'})}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                  preferences.theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <Sun size={20} />
                Light
              </button>
              <button
                onClick={() => setPreferences({...preferences, theme: 'dark'})}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                  preferences.theme === 'dark' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <Moon size={20} />
                Dark
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={preferences.language}
              onChange={(e) => setPreferences({...preferences, language: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              value={preferences.timezone}
              onChange={(e) => setPreferences({...preferences, timezone: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST - Indian Standard Time)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST - Gulf Standard Time)</option>
              <option value="America/New_York">America/New York (EST - Eastern Time)</option>
              <option value="Europe/London">Europe/London (GMT - Greenwich Mean Time)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST - Japan Standard Time)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEST - Australian Eastern Time)</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
          <p className="text-sm text-gray-500">Press Enter to save</p>
        </div>
      </div>
    </div>
  );

  // Render Legal & Support Tab Content
  const renderLegalTab = () => (
    <div className="space-y-4">
      {legalLoading ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-xl p-4 shadow-sm">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mr-3"></div>
            <p className="text-blue-900 font-medium">Loading legal documents...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Legal Documents */}
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <FileText className="text-white" size={22} strokeWidth={2.5} />
                </div>
                Legal Documents
              </h3>
            </div>
            
            <div className="p-4 space-y-2">
              {/* Terms & Conditions */}
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                <button
                  onClick={() => setShowTerms(!showTerms)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 transition-all duration-200 ${
                    showTerms 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50' 
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${showTerms ? 'bg-blue-600' : 'bg-gray-700'}`}>
                      <FileText size={16} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="font-semibold text-gray-900">Terms & Conditions</span>
                  </div>
                  {showTerms ? 
                    <ChevronUp size={20} className="text-gray-700" strokeWidth={2.5} /> : 
                    <ChevronDown size={20} className="text-gray-700" strokeWidth={2.5} />
                  }
                </button>
                {showTerms && termsConditions && (
                  <div className="px-5 py-4 bg-white border-t-2 border-gray-200 max-h-96 overflow-y-auto">
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <h4 className="text-xl font-bold text-gray-900">{termsConditions.title}</h4>
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        Version {termsConditions.version} | Effective: {new Date(termsConditions.effectiveDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div 
                      className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: termsConditions.content }}
                    />
                  </div>
                )}
              </div>

              {/* Privacy Policy */}
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                <button
                  onClick={() => setShowPrivacy(!showPrivacy)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 transition-all duration-200 ${
                    showPrivacy 
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50' 
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${showPrivacy ? 'bg-purple-600' : 'bg-gray-700'}`}>
                      <Shield size={16} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="font-semibold text-gray-900">Privacy Policy</span>
                  </div>
                  {showPrivacy ? 
                    <ChevronUp size={20} className="text-gray-700" strokeWidth={2.5} /> : 
                    <ChevronDown size={20} className="text-gray-700" strokeWidth={2.5} />
                  }
                </button>
                {showPrivacy && privacyPolicy && (
                  <div className="px-5 py-4 bg-white border-t-2 border-gray-200 max-h-96 overflow-y-auto">
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <h4 className="text-xl font-bold text-gray-900">{privacyPolicy.title}</h4>
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        Version {privacyPolicy.version} | Effective: {new Date(privacyPolicy.effectiveDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div 
                      className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: privacyPolicy.content }}
                    />
                  </div>
                )}
              </div>

              {/* Cookie Policy */}
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                <button
                  onClick={() => setShowCookie(!showCookie)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 transition-all duration-200 ${
                    showCookie 
                      ? 'bg-gradient-to-r from-orange-50 to-amber-50' 
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${showCookie ? 'bg-orange-600' : 'bg-gray-700'}`}>
                      <Shield size={16} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="font-semibold text-gray-900">Cookie Policy</span>
                  </div>
                  {showCookie ? 
                    <ChevronUp size={20} className="text-gray-700" strokeWidth={2.5} /> : 
                    <ChevronDown size={20} className="text-gray-700" strokeWidth={2.5} />
                  }
                </button>
                {showCookie && cookiePolicy && (
                  <div className="px-5 py-4 bg-white border-t-2 border-gray-200 max-h-96 overflow-y-auto">
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <h4 className="text-xl font-bold text-gray-900">{cookiePolicy.title}</h4>
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        Version {cookiePolicy.version} | Effective: {new Date(cookiePolicy.effectiveDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div 
                      className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: cookiePolicy.content }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-300 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <HelpCircle className="text-white" size={22} strokeWidth={2.5} />
                </div>
                FAQ / Help Center
              </h3>
            </div>
            
            <div className="p-4 space-y-2">
              {faqs.length > 0 ? (
                faqs.map((faq) => (
                  <div key={faq.id} className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 transition-all duration-200 text-left ${
                        expandedFaq === faq.id
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-1.5 rounded-lg flex-shrink-0 ${expandedFaq === faq.id ? 'bg-green-600' : 'bg-gray-700'}`}>
                          <HelpCircle size={16} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="font-semibold text-gray-900">{faq.question}</span>
                      </div>
                      {expandedFaq === faq.id ? 
                        <ChevronUp size={20} className="text-gray-700 flex-shrink-0 ml-2" strokeWidth={2.5} /> : 
                        <ChevronDown size={20} className="text-gray-700 flex-shrink-0 ml-2" strokeWidth={2.5} />
                      }
                    </button>
                    {expandedFaq === faq.id && (
                      <div className="px-5 py-4 bg-white border-t-2 border-gray-200">
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{faq.answer}</p>
                        {faq.category && (
                          <span className="inline-block mt-3 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-200">
                            {faq.category}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-6 font-medium">No FAQs available</p>
              )}
            </div>

            <div className="p-4 pt-2 space-y-2 border-t border-gray-200">
              <a 
                href="mailto:support@globalip.com" 
                className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-900 transition-all duration-200 shadow-md hover:shadow-lg group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Mail size={16} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold">Contact Support</span>
                </div>
                <div className="p-1 bg-white/20 rounded group-hover:bg-white/30 transition-colors">
                  <Mail size={16} className="text-white" strokeWidth={2.5} />
                </div>
              </a>
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700 font-semibold">Version: 1.0.0</p>
                <p className="text-sm text-gray-600 font-medium">© 2025 Global IP Intelligence Platform</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Render Account Management Tab Content
  const renderAccountTab = () => (
    <div className="space-y-8">
      {/* Quick Logout Section - Enhanced with animations */}
      <div className="group bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border-3 border-blue-400 rounded-3xl p-8 shadow-2xl hover:shadow-blue-300/50 hover:scale-[1.02] transition-all duration-500 hover:border-blue-500">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            <LogOut className="text-white" size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Quick Account Switch</h3>
            <p className="text-base text-gray-700 font-medium mt-1">Logout and switch accounts instantly</p>
          </div>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm border-3 border-blue-300 rounded-2xl p-6 hover:shadow-xl hover:border-blue-400 transition-all duration-300 hover:bg-white">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg mt-1">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <p className="text-base text-gray-700 leading-relaxed">Instantly logout and return to login page. No confirmation needed - perfect for switching accounts.</p>
            </div>
          </div>
          
          <button
            onClick={handleQuickLogout}
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-3 text-lg group"
          >
            <LogOut size={24} className="group-hover:translate-x-1 transition-transform" />
            <span>Quick Logout</span>
          </button>
        </div>
      </div>

      {/* Danger Zone - Enhanced with warning visuals */}
      <div className="group bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-3 border-orange-400 rounded-3xl p-8 shadow-2xl hover:shadow-orange-300/50 hover:scale-[1.02] transition-all duration-500 hover:border-orange-500">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 animate-pulse">
            <AlertCircle className="text-white" size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">⚠️ Danger Zone</h3>
            <p className="text-base text-gray-700 font-medium mt-1">Proceed with extreme caution</p>
          </div>
        </div>
        
        <div className="bg-white border-2 border-orange-300 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="text-orange-600 flex-shrink-0 mt-1" size={24} />
            <div>
              <h4 className="font-bold text-gray-900 mb-2 text-lg">Deactivate Account</h4>
              <p className="text-gray-700 mb-4">Temporarily disable your account with 30-day grace period.</p>
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <ul className="space-y-2 text-sm text-gray-800">
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-0.5">•</span>
                <span>Account deactivated <strong>immediately</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Login within 30 days to <strong>reactivate</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                <span>Auto-deletes after 30 days if not reactivated</span>
              </li>
            </ul>
          </div>
          
          <button
            onClick={handleDeactivateAccount}
            className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 font-semibold flex items-center justify-center gap-2"
          >
            <AlertCircle size={20} />
            <span>Deactivate Account</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-3"></div>
            <p className="text-blue-800">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 px-8 py-10 text-white">
          <button
            onClick={onBack}
            className="mb-6 text-white/80 hover:text-white flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Settings size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-blue-100 mt-1">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === id 
                    ? 'border-blue-500 text-blue-600 font-semibold' 
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'subscription' && renderSubscriptionTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'preferences' && renderPreferencesTab()}
          {activeTab === 'legal' && renderLegalTab()}
          {activeTab === 'account' && renderAccountTab()}
        </div>
      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        userProfile={userProfile}
        onAddNotification={(msg) => console.log(msg)}
      />
    </div>
  );
};

export default SettingsPage;
