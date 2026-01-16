import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInWithCustomToken, getIdToken } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, onSnapshot, collection, query, orderBy, limit, serverTimestamp, updateDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { Lock, Crown, Sparkles, Bell, Shield, BarChart3, X, FileText } from 'lucide-react';
import { fetchUserNotifications, addUserNotification, clearUserNotification } from './utils/notifications';
import Sidebar from './components/Sidebar';
import HeaderBar from './components/HeaderBar';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import SearchResultsPage from './pages/SearchResultsPage';
import IPAssetPanel from './components/IPAssetPanel';
import ContactForm from './components/ContactForm';
import FeedbackForm from './components/FeedbackForm';
import PatentFilingForm from './components/PatentFilingForm';
import FilingTracker from './components/FilingTracker';
import AdminPatentManager from './components/AdminPatentManager';
import LegalStatusPage from './pages/LegalStatusPage';
import Leaderboard from './components/Leaderboard';

const App = () => {
  // Check URL parameters for auth data
  const checkURLParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('token');
    const userId = urlParams.get('uid');
    const userEmail = urlParams.get('email');
    
    if (authToken && userId && userEmail) {
      console.log('🔗 Found auth parameters in URL');
      return { token: authToken, uid: userId, email: userEmail };
    }
    return null;
  };
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState(() => {
    return localStorage.getItem('searchMode') || 'api';
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Initialize userProfile from localStorage if available
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        console.log('✅ Loaded user profile from localStorage');
        return JSON.parse(savedProfile);
      }
    } catch (error) {
      console.error('❌ Error loading profile from localStorage:', error);
    }
    
    // Return default values if nothing in localStorage
    return {
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      position: '',
      uid: '',
      photoURL: '',
      phoneNumber: '',
      emailVerified: false,
      creationTime: '',
      lastSignInTime: '',
      authProvider: '',
      createdAt: null,
      updatedAt: null
    };
  });

  // Dynamic authentication - using real user authentication
  const isDevelopmentMode = false; // Set to false in production
  const TEST_UID = "JBKwcX248aeStcb15EnK8M8jwSW2";

  // Save userProfile to localStorage whenever it changes
  useEffect(() => {
    if (userProfile.uid) {
      try {
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        console.log('💾 Saved user profile to localStorage');
      } catch (error) {
        console.error('❌ Error saving profile to localStorage:', error);
      }
    }
  }, [userProfile]);

  // Monitor authentication state
  useEffect(() => {
    console.log('🔄 Setting up auth listener...');
    console.log('🔍 Auth persistence:', auth.config?.authDomain);
    
    // Check URL parameters first for direct authentication
    const urlAuthData = checkURLParams();
    if (urlAuthData) {
      console.log('🔗 Found auth data in URL, authenticating...');
      const authUser = { uid: urlAuthData.uid, email: urlAuthData.email };
      setUser(authUser);
      
      // Also set a basic userProfile immediately to pass auth check
      setUserProfile(prev => ({
        ...prev,
        uid: urlAuthData.uid,
        email: urlAuthData.email
      }));
      
      fetchUserDataWithUID(urlAuthData.uid, authUser);
      setLoading(false);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    // Check localStorage for existing auth state first
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        if (profile.uid) {
          console.log('💾 Found saved user profile in localStorage:', profile.email);
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('❌ Error parsing saved profile:', error);
      }
    }
    
    // Give MORE time for Firebase to restore auth state from other app
    const timer = setTimeout(() => {
      if (!auth.currentUser) {
        console.log('⏰ Timeout: No authenticated user found after 8 seconds');
        console.log('👤 Auth currentUser:', auth.currentUser);
        console.log('💾 LocalStorage profile:', savedProfile ? 'exists' : 'none');
        
        // If we have a saved profile, try to use it
        if (savedProfile) {
          console.log('🔧 Using saved profile from localStorage');
          const profile = JSON.parse(savedProfile);
          if (profile.uid && profile.email) {
            console.log('✅ Valid profile found, continuing with saved data');
            setUser({ uid: profile.uid, email: profile.email });
            setUserProfile(profile);
            setLoading(false);
            return;
          }
        }
        
        console.log('👤 User must log in to access dashboard');
        setLoading(false);
      }
    }, 8000); // Increased timeout for auth state restoration
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(timer); // Clear timeout if auth state changes
      console.log("🔐 Dashboard auth state changed!");
      console.log("Current User Object:", currentUser);
      console.log("User UID:", currentUser?.uid);
      console.log("User Email:", currentUser?.email);
      console.log('User Display Name:', currentUser?.displayName);
      console.log('User Email Verified:', currentUser?.emailVerified);
      
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        console.log('✅ User authenticated, fetching profile data...');
        // Fetch user data from Firestore with real user
        fetchUserDataWithUID(currentUser.uid, currentUser);
      } else {
        console.log('❌ No authenticated user found');
        // Check if we have a saved profile to use
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
          try {
            const profile = JSON.parse(savedProfile);
            if (profile.uid) {
              console.log('💾 Using saved profile for user:', profile.email);
              setUserProfile(profile);
            }
          } catch (error) {
            console.error('❌ Error parsing saved profile:', error);
          }
        }
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  // Real-time subscription listener
  useEffect(() => {
    if (!userProfile?.uid) return;

    console.log('📡 Setting up real-time subscription listener for:', userProfile.uid);
    
    const userRef = doc(db, 'users', userProfile.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('🔄 Subscription updated:', data.subscriptionType);
        
        setUserProfile(prev => ({
          ...prev,
          subscriptionType: data.subscriptionType || 'basic',
          subscriptionPrice: data.subscriptionPrice || 0,
          subscriptionStartDate: data.subscriptionStartDate,
          subscriptionEndDate: data.subscriptionEndDate,
          subscriptionUpdatedAt: data.subscriptionUpdatedAt,
        }));
      }
    }, (error) => {
      console.error('❌ Error listening to subscription updates:', error);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  // Real-time notification listener
  useEffect(() => {
    if (!userProfile?.uid) {
      console.log('⏸️ Notification listener skipped - no user ID');
      return;
    }

    console.log('📡 Setting up real-time notification listener for:', userProfile.uid);
    
    try {
      const notificationsRef = collection(db, 'users', userProfile.uid, 'notifications');
      const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(3));
      
      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const notificationsData = [];
          querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            console.log('📄 Notification doc:', docSnapshot.id, data);
            notificationsData.push({
              id: docSnapshot.id,
              ...data,
              timestamp: data.createdAt?.toDate ? 
                data.createdAt.toDate().toLocaleString() : 
                new Date().toLocaleString()
            });
          });
          
          console.log(`🔔 Real-time update: ${notificationsData.length} notifications received`);
          console.log('Notifications data:', notificationsData);
          setNotifications(notificationsData);
        }, 
        (error) => {
          console.error('❌ Error listening to notifications:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
        }
      );

      return () => {
        console.log('🔌 Cleaning up notification listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('❌ Error setting up notification listener:', error);
    }
  }, [userProfile?.uid]);

  // Email verification monitoring and notification
  useEffect(() => {
    if (!user || !userProfile?.uid) {
      console.log('⏸️ Email verification monitor skipped - no user or profile');
      return;
    }

    console.log('🔍 Email verification monitor starting');
    console.log('Current user.emailVerified:', user.emailVerified);
    console.log('Current userProfile.emailVerified:', userProfile.emailVerified);

    // Check if email was just verified
    const checkEmailVerification = async () => {
      try {
        console.log('⏰ Checking email verification...');
        await user.reload();
        const isNowVerified = user.emailVerified;
        const wasVerified = userProfile.emailVerified;

        console.log(`Email status check - Now: ${isNowVerified}, Was: ${wasVerified}`);

        // If email was just verified (changed from false to true)
        if (isNowVerified && !wasVerified) {
          console.log('✉️ Email just verified! Adding notification...');
          
          try {
            // Update Firestore with verified status
            const userDocRef = doc(db, 'users', userProfile.uid);
            await updateDoc(userDocRef, {
              emailVerified: true,
              updatedAt: serverTimestamp()
            });
            console.log('✅ Updated user document with emailVerified: true');

            // Add notification directly to Firestore (will be picked up by listener)
            const notificationsRef = collection(db, 'users', userProfile.uid, 'notifications');
            const notificationData = {
              title: "✉️ Email Verified Successfully",
              message: `Your email address ${user.email} has been verified. You now have full access to all features.`,
              details: {
                verifiedEmail: user.email,
                verificationDate: new Date().toLocaleString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              },
              createdAt: serverTimestamp(),
              read: false
            };
            console.log('📝 Creating notification:', notificationData);
            const docRef = await addDoc(notificationsRef, notificationData);
            console.log('✅ Notification document created with ID:', docRef.id);

            console.log('✅ Notification document created with ID:', docRef.id);

            // Maintain notification limit
            console.log('🧹 Maintaining notification limit (max 3)...');
            const allNotificationsRef = collection(db, 'users', userProfile.uid, 'notifications');
            const allNotificationsQuery = query(allNotificationsRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(allNotificationsQuery);
            const allDocs = [];
            querySnapshot.forEach((doc) => allDocs.push(doc));
            
            console.log(`Found ${allDocs.length} total notifications`);
            if (allDocs.length > 3) {
              const docsToDelete = allDocs.slice(3);
              console.log(`Deleting ${docsToDelete.length} old notifications`);
              const deletePromises = docsToDelete.map((doc) => deleteDoc(doc.ref));
              await Promise.all(deletePromises);
              console.log('✅ Old notifications deleted');
            }

            // Update local profile state
            setUserProfile(prev => ({ ...prev, emailVerified: true }));
            
            console.log('✅ Email verification notification added successfully');
          } catch (error) {
            console.error('❌ Error creating verification notification:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
          }
        }
      } catch (error) {
        console.error('❌ Error checking email verification:', error);
      }
    };

    // Check immediately and then every 5 seconds
    console.log('✅ Starting email verification checks (every 5 seconds)');
    checkEmailVerification();
    const interval = setInterval(checkEmailVerification, 5000);

    return () => {
      console.log('🔌 Cleaning up email verification monitor');
      clearInterval(interval);
    };
  }, [user, userProfile?.uid, userProfile?.emailVerified]);

  // Handle URL query parameters for page navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    
    if (pageParam) {
      console.log('🔗 Found page parameter in URL:', pageParam);
      setCurrentPage(pageParam);
      setActiveItem(pageParam);
      // Clean URL by removing query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch user data from Firestore - works with or without authenticated user
  const fetchUserDataWithUID = async (uid, authenticatedUser = null) => {
    try {
      console.log('📥 Fetching user data for UID:', uid);
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const firestoreData = userDocSnap.data();
        console.log('✅ Firestore user data found:', firestoreData);
        
        const profileData = {
          firstName: firestoreData.firstName || '',
          lastName: firestoreData.lastName || '',
          email: firestoreData.email || authenticatedUser?.email || '',
          company: firestoreData.company || '',
          position: firestoreData.position || '',
          uid: uid,
          photoURL: firestoreData.photoURL || authenticatedUser?.photoURL || '',
          phoneNumber: firestoreData.phoneNumber || authenticatedUser?.phoneNumber || '',
          emailVerified: firestoreData.emailVerified ?? authenticatedUser?.emailVerified ?? false,
          creationTime: authenticatedUser?.metadata?.creationTime || '',
          lastSignInTime: authenticatedUser?.metadata?.lastSignInTime || '',
          authProvider: firestoreData.authProvider || '',
          createdAt: firestoreData.createdAt,
          updatedAt: firestoreData.updatedAt,
          subscriptionType: firestoreData.subscriptionType || 'basic',
          subscriptionPrice: firestoreData.subscriptionPrice || 0,
          subscriptionStartDate: firestoreData.subscriptionStartDate,
          subscriptionEndDate: firestoreData.subscriptionEndDate,
          subscriptionUpdatedAt: firestoreData.subscriptionUpdatedAt,
        };
        
        console.log('📝 Setting profile data:', profileData);
        console.log('✅ EmailVerified status:', profileData.emailVerified, '(from Firestore:', firestoreData.emailVerified, ', from Auth:', authenticatedUser?.emailVerified, ')');
        setUserProfile(profileData);
        
        // Note: Real-time notification listener is set up in separate useEffect
      } else {
        console.log('⚠️ No Firestore document found for UID:', uid);
        
        // Fallback to Firebase Auth data if available
        if (authenticatedUser) {
          console.log('Using Firebase Auth data as fallback');
          const displayName = authenticatedUser.displayName || '';
          let firstName = 'User';
          let lastName = '';
          
          if (displayName) {
            const nameParts = displayName.split(' ');
            firstName = nameParts[0] || 'User';
            lastName = nameParts.slice(1).join(' ') || '';
          } else if (authenticatedUser.email) {
            const emailName = authenticatedUser.email.split('@')[0];
            firstName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          }
          
          setUserProfile({
            firstName: firstName,
            lastName: lastName,
            email: authenticatedUser.email || '',
            company: '',
            position: '',
            uid: uid,
            photoURL: authenticatedUser.photoURL || '',
            phoneNumber: authenticatedUser.phoneNumber || '',
            emailVerified: authenticatedUser.emailVerified,
            creationTime: authenticatedUser.metadata.creationTime,
            lastSignInTime: authenticatedUser.metadata.lastSignInTime,
            authProvider: '',
            createdAt: null,
            updatedAt: null
          });
        } else {
          console.log('⚠️ No authenticated user data available');
          // Set minimal profile with just the UID
          setUserProfile(prev => ({
            ...prev,
            uid: uid
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching user data from Firestore:', error);
    }
  };



  // Handle logout
  const handleLogout = async () => {
    // Show confirmation dialog
    const confirmLogout = window.confirm(
      "Are you sure you want to log out?\n\nYou will be redirected to the login page."
    );
    
    if (!confirmLogout) {
      return; // User cancelled
    }

    try {
      console.log("Logging out user...");
      
      // Update user's online status in Firestore before signing out
      if (userProfile?.uid) {
        try {
          const userRef = doc(db, "users", userProfile.uid);
          await updateDoc(userRef, {
            isOnline: false,
            lastLogout: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log("User online status set to false");
        } catch (firestoreError) {
          console.error("Error updating online status:", firestoreError);
          // Continue with logout even if Firestore update fails
        }
      }
      
      await signOut(auth);
      console.log("User logged out successfully");
      
      // Clear any cached auth state
      setUser(null);
      setUserProfile({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        position: '',
        uid: '',
        photoURL: '',
        phoneNumber: '',
        emailVerified: false,
        creationTime: '',
        lastSignInTime: '',
        authProvider: '',
        createdAt: null,
        updatedAt: null
      });
      
      // Clear localStorage
      localStorage.removeItem('userProfile');
      console.log('🗑️ Cleared user profile from localStorage');
      
      // Show success message and redirect
      alert("Successfully logged out! Redirecting to login page...");
      
      // Redirect to login page after short delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
      
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Error signing out: " + error.message + "\n\nRedirecting to login page anyway...");
      
      // Force redirect even if signout fails
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    }
  };

  // Add notification
  const addNotification = async (notification) => {
    // Save to Firestore only - real-time listener will update UI
    if (userProfile?.uid) {
      console.log('➕ Adding notification to Firestore for user:', userProfile.uid);
      const savedNotification = await addUserNotification(userProfile.uid, notification);
      if (savedNotification) {
        console.log('✅ Notification saved to Firestore - real-time listener will update UI');
      } else {
        console.error('❌ Failed to save notification to Firestore');
      }
    } else {
      console.warn('⚠️ Cannot add notification - user not authenticated');
    }
  };

  // Dismiss notification
  const dismissNotification = async (index) => {
    const notificationToRemove = notifications[index];
    
    // Remove from local state
    setNotifications(prev => prev.filter((_, i) => i !== index));
    
    // Remove from Firestore if it has an ID
    if (notificationToRemove?.id && userProfile?.uid) {
      const success = await clearUserNotification(userProfile.uid, notificationToRemove.id);
      if (success) {
        console.log('✅ Notification cleared from Firestore');
      }
    }
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-purple-500">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-4"></div>
            <p className="text-gray-800 text-xl font-semibold">Loading Dashboard...</p>
            <p className="text-gray-600 text-sm mt-2">Checking authentication (this may take a few seconds)</p>
            <p className="text-gray-500 text-xs mt-3">If this takes too long, please refresh the page</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if authentication is required - allow if user exists OR we have valid profile data
  if (!user && !userProfile.uid && !loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-purple-500">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">⚠️ Not Authenticated</h2>
          <p className="text-gray-600 mb-4">You need to be logged in to access the dashboard.</p>
          <p className="text-sm text-gray-500 mb-6">Please login first, then the dashboard will load automatically.</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                console.log("Redirecting to login page...");
                window.location.href = "/login";
              }}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
            >
              Go to Login Page
            </button>
            <button
              onClick={() => {
                console.log("Refreshing page...");
                window.location.reload();
              }}
              className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-purple-500 overflow-hidden">

      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeItem={activeItem}
        setActiveItem={(item) => {
          setActiveItem(item);
          setCurrentPage(item);
          setSidebarOpen(false);
        }}
        onLogout={handleLogout}
        userProfile={userProfile}
      />

      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>

        <HeaderBar
          onMenuClick={() => setSidebarOpen(true)}
          onProfileClick={() => setCurrentPage('profile')}
          userProfile={userProfile}
          onSearch={(query) => {
            setSearchQuery(query);
            setCurrentPage('search');
            setActiveItem('search');
          }}
          currentPage={currentPage}
          sidebarOpen={sidebarOpen}
          notifications={notifications}
          onDismissNotification={dismissNotification}
        />

        <div className="flex-1 overflow-auto" onClick={() => sidebarOpen && setSidebarOpen(false)}>
          <div className="p-2 lg:p-3 w-full">

            {currentPage === 'dashboard' ? (
              <Dashboard 
                userProfile={userProfile} 
                searchMode={searchMode}
                setSearchMode={(mode) => {
                  setSearchMode(mode);
                  localStorage.setItem('searchMode', mode);
                }}
                onSearch={setSearchQuery}
                setCurrentPage={setCurrentPage}
              />
            ) : currentPage === 'profile' ? (
              <ProfilePage
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                onBack={() => {
                  setCurrentPage('dashboard');
                  setActiveItem('dashboard');
                }}
              />
            ) : currentPage === 'search' ? (
              <SearchResultsPage 
                query={searchQuery} 
                searchMode={searchMode}
                setSearchMode={(mode) => {
                  setSearchMode(mode);
                  localStorage.setItem('searchMode', mode);
                }}
                userProfile={userProfile}
                onBack={() => {
                  setCurrentPage('dashboard');
                  setActiveItem('dashboard');
                  setSearchQuery('');
                }} 
              />
            ) : currentPage === 'filing' ? (
              <FilingTracker 
                userProfile={userProfile}
                onAddNotification={addNotification}
                onBack={() => {
                  setCurrentPage('dashboard');
                  setActiveItem('dashboard');
                }}
                ref={(ref) => window.filingTrackerRef = ref}
              />
            ) : currentPage === 'legal' ? (
              // Legal Status - Show upgrade prompt for basic users
              !userProfile?.subscriptionType || userProfile?.subscriptionType.toLowerCase() === 'basic' ? (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Legal Status</h2>
                    <button
                      onClick={() => {
                        setCurrentPage('dashboard');
                        setActiveItem('dashboard');
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <X size={24} className="text-gray-600" />
                    </button>
                  </div>

                  {/* Upgrade Prompt for Basic Users */}
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full opacity-20 blur-2xl"></div>
                      <div className="relative p-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-2xl">
                        <Lock size={64} className="text-white" />
                      </div>
                    </div>
                    
                    <h3 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                      Premium Feature
                    </h3>
                    
                    <p className="text-lg text-gray-600 mb-2 text-center max-w-2xl">
                      Track and monitor the legal status of your intellectual property rights.
                    </p>
                    
                    <p className="text-md text-gray-500 mb-8 text-center max-w-2xl">
                      Upgrade to <span className="font-semibold text-blue-600">Pro</span> or <span className="font-semibold text-purple-600">Enterprise</span> plan to unlock:
                    </p>

                    <div className="grid md:grid-cols-2 gap-6 mb-10 max-w-3xl w-full">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-blue-500 rounded-lg">
                            <BarChart3 size={20} className="text-white" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Status Monitoring</h4>
                        </div>
                        <p className="text-sm text-gray-600">Real-time tracking of patent, trademark, and copyright statuses</p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-purple-500 rounded-lg">
                            <Bell size={20} className="text-white" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Status Alerts</h4>
                        </div>
                        <p className="text-sm text-gray-600">Receive notifications about status changes and important deadlines</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-green-500 rounded-lg">
                            <FileText size={20} className="text-white" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Legal Documentation</h4>
                        </div>
                        <p className="text-sm text-gray-600">Access and manage all legal documents and filings in one place</p>
                      </div>

                      <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border border-pink-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-pink-500 rounded-lg">
                            <Shield size={20} className="text-white" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Compliance Tracking</h4>
                        </div>
                        <p className="text-sm text-gray-600">Ensure compliance with legal requirements and renewal deadlines</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        // Show upgrade modal (you'll need to pass this state)
                        setCurrentPage('settings');
                        setActiveItem('settings');
                      }}
                      className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                      <div className="relative flex items-center gap-3">
                        <Crown size={24} className="animate-pulse" />
                        <span>Upgrade to Pro Now</span>
                        <Sparkles size={20} />
                      </div>
                    </button>

                    <p className="text-sm text-gray-500 mt-6">
                      Monitor your IP legal status with comprehensive tracking tools
                    </p>
                  </div>
                </div>
              ) : (
                <LegalStatusPage 
                  userProfile={userProfile} 
                  onNavigateToPatentFiling={() => {
                    setCurrentPage('patent-filing');
                    setActiveItem('patent-filing');
                  }}
                />
              )
            ) : currentPage === 'patent-filing' ? (
              <PatentFilingForm 
                onClose={() => {
                  // Navigate to filing tracker page after submission
                  setCurrentPage('filing');
                  setActiveItem('filing');
                }} 
                userProfile={userProfile}
                onAddNotification={addNotification}
                onFilingSuccess={async () => {
                  // Refresh the filing tracker data if it exists
                  if (window.filingTrackerRef?.fetchUserFilings) {
                    await window.filingTrackerRef.fetchUserFilings();
                  }
                }}
              />
            ) : currentPage === 'contact' ? (
              <ContactForm onClose={() => {
                setCurrentPage('dashboard');
                setActiveItem('dashboard');
              }} />
            ) : currentPage === 'feedback' ? (
              <FeedbackForm 
                userProfile={userProfile}
                onClose={() => {
                  setCurrentPage('dashboard');
                  setActiveItem('dashboard');
                }} 
              />
            ) : currentPage === 'settings' ? (
              <SettingsPage 
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                onBack={() => {
                  setCurrentPage('dashboard');
                  setActiveItem('dashboard');
                }} 
              />
            ) : currentPage === 'admin-patents' ? (
              <AdminPatentManager 
                onBack={() => {
                  setCurrentPage('dashboard');
                  setActiveItem('dashboard');
                }}
              />
            ) : currentPage === 'leaderboard' ? (
              // Leaderboard - Show upgrade prompt for basic users
              !userProfile?.subscriptionType || userProfile?.subscriptionType.toLowerCase() === 'basic' ? (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Leaderboard</h2>
                    <button
                      onClick={() => {
                        setCurrentPage('dashboard');
                        setActiveItem('dashboard');
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <X size={24} className="text-gray-600" />
                    </button>
                  </div>

                  {/* Upgrade Prompt for Basic Users */}
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-full opacity-20 blur-2xl"></div>
                      <div className="relative p-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full shadow-2xl">
                        <Lock size={64} className="text-white" />
                      </div>
                    </div>
                    
                    <h3 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                      Premium Feature
                    </h3>
                    
                    <p className="text-lg text-gray-600 mb-2 text-center max-w-2xl">
                      View the top patent innovators and see where you rank!
                    </p>
                    
                    <p className="text-md text-gray-500 mb-8 text-center max-w-2xl">
                      Upgrade to <span className="font-semibold text-blue-600">Pro</span> or <span className="font-semibold text-purple-600">Enterprise</span> plan to unlock:
                    </p>

                    <div className="grid md:grid-cols-2 gap-6 mb-10 max-w-3xl w-full">
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-yellow-500 rounded-lg">
                            <BarChart3 size={20} className="text-white" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Global Rankings</h4>
                        </div>
                        <p className="text-sm text-gray-600">See where you stand among top patent filers globally</p>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-orange-500 rounded-lg">
                            <Bell size={20} className="text-white" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Achievement Tracking</h4>
                        </div>
                        <p className="text-sm text-gray-600">Track your progress and compete with other innovators</p>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-blue-500 rounded-lg">
                            <FileText size={20} className="text-white" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Performance Insights</h4>
                        </div>
                        <p className="text-sm text-gray-600">Get detailed analytics on your filing performance</p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-purple-500 rounded-lg">
                            <Shield size={20} className="text-white" />
                          </div>
                          <h4 className="font-semibold text-gray-800">Recognition Badges</h4>
                        </div>
                        <p className="text-sm text-gray-600">Earn prestigious badges and recognition for your achievements</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentPage('settings');
                        setActiveItem('settings');
                      }}
                      className="group relative px-8 py-4 bg-gradient-to-r from-yellow-500 via-orange-600 to-red-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                      <div className="relative flex items-center gap-3">
                        <Crown size={24} className="animate-pulse" />
                        <span>Unlock Leaderboard Now</span>
                        <Sparkles size={20} />
                      </div>
                    </button>

                    <p className="text-sm text-gray-500 mt-6">
                      Join the elite group of top innovators today!
                    </p>
                  </div>
                </div>
              ) : (
                <Leaderboard 
                  userProfile={userProfile}
                  onBack={() => {
                    setCurrentPage('dashboard');
                    setActiveItem('dashboard');
                  }}
                  onNavigateToPatentFiling={() => {
                    setCurrentPage('patent-filing');
                    setActiveItem('patent-filing');
                  }}
                />
              )
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                  <Dashboard userProfile={userProfile} />
                </div>
                <div className="xl:col-span-1">
                  <IPAssetPanel />
                </div>
              </div>
            )}

          </div>

          {/* Enhanced Footer with Quick Links */}
          <footer className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-t border-indigo-200 py-12 px-6 mt-8 relative overflow-hidden">
            {/* Decorative Patent Icons Background */}
            <div className="absolute inset-0 opacity-5">
              <svg className="absolute top-4 left-10 w-16 h-16 text-indigo-600 transform rotate-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-3h8v-2H8v2zm0-4h8v-2H8v2z"/>
              </svg>
              <svg className="absolute top-20 right-20 w-20 h-20 text-purple-600 transform -rotate-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/>
              </svg>
              <svg className="absolute bottom-10 left-1/4 w-14 h-14 text-blue-600 transform rotate-45" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg className="absolute bottom-4 right-10 w-12 h-12 text-indigo-600 transform -rotate-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-3h8v-2H8v2zm0-4h8v-2H8v2z"/>
              </svg>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
              {/* Patent Innovation Badge */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-full shadow-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span className="font-semibold text-sm">Protecting Innovation Worldwide</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6 text-center">
                {/* About Section */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Global IP Platform
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Advanced intellectual property management and analytics platform for modern businesses.
                  </p>
                </div>

                {/* Quick Links */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                    </svg>
                    Quick Links
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <button
                        onClick={() => {
                          setCurrentPage('dashboard');
                          setActiveItem('dashboard');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Dashboard
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setCurrentPage('search');
                          setActiveItem('search');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Search Patents
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setCurrentPage('profile');
                          setActiveItem('profile');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        My Profile
                      </button>
                    </li>
                  </ul>
                </div>

                {/* Support */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
                    </svg>
                    Support
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <button
                        onClick={() => {
                          setCurrentPage('contact');
                          setActiveItem('contact');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Contact Support
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setCurrentPage('feedback');
                          setActiveItem('feedback');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Send Feedback
                      </button>
                    </li>
                    <li>
                      <a
                        href="mailto:vikaskumaryadav068@gmail.com"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Email Support
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Developer Info */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                    </svg>
                    Developer
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      <strong>Vikas Yadav</strong>
                    </p>
                    <p className="text-sm text-gray-600">
                      Full Stack Developer
                    </p>
                    <a
                      href="mailto:vikaskumaryadav068@gmail.com"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline block"
                    >
                      vikaskumaryadav068@gmail.com
                    </a>
                    <div className="flex gap-3 justify-center mt-2">
                      <a
                        href="https://github.com/Vikasyadav068"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-900 transition-all hover:scale-110 bg-white p-2 rounded-lg shadow-md hover:shadow-lg"
                        title="GitHub Profile"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </a>
                      <a
                        href="https://www.linkedin.com/in/vikas-kumar-2b695a276/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-blue-700 transition-all hover:scale-110 bg-white p-2 rounded-lg shadow-md hover:shadow-lg"
                        title="LinkedIn Profile"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="pt-8 border-t border-indigo-200 mt-8">
                <div className="flex flex-col md:flex-row justify-center items-center gap-4">
                  <p className="text-sm text-gray-600 text-center flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                    </svg>
                    © {new Date().getFullYear()} Global IP Intelligence Platform. All rights reserved.
                  </p>
                  <div className="flex gap-4">
                    <a href="/privacy-policy" className="text-sm text-gray-600 hover:text-gray-800 hover:underline">
                      Privacy Policy
                    </a>
                    <a href="/terms-of-service" className="text-sm text-gray-600 hover:text-gray-800 hover:underline">
                      Terms of Service
                    </a>
                    <a href="/cookie-policy" className="text-sm text-gray-600 hover:text-gray-800 hover:underline">
                      Cookie Policy
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </footer>

        </div>
      </div>

    </div>
  );
};

export default App;
