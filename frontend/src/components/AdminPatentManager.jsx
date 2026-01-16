import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Mail, RefreshCw, AlertCircle, LogIn, LogOut, User, Shield, Eye, EyeOff, X, ArrowLeft, Lightbulb, FileCheck, Upload, CreditCard, MessageCircle, Send, Bell, Clock, List, Filter, BarChart3, Users, Activity, Search, Database, Globe, Trophy, Award, Medal, Sparkles, UserCheck, UserX, Info, Server } from 'lucide-react';
import { addUserNotification } from '../utils/notifications';
import { db } from '../firebase';
import AdminUserManagement from './AdminUserManagement';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  Cell
} from 'recharts';

const AdminPatentManager = ({ onBack }) => {
  const [patents, setPatents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Quick filter state
  const [quickFilter, setQuickFilter] = useState('all'); // 'all', 'granted', 'rejected', 'deactivated', 'application'

  // Admin authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginAdminId, setLoginAdminId] = useState('');
  const [loginAdminName, setLoginAdminName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [adminData, setAdminData] = useState(null);
  const [showAdminTable, setShowAdminTable] = useState(false);
  const [allAdmins, setAllAdmins] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // Patent details fields for each patent
  const [patentDetails, setPatentDetails] = useState({});

  // Track which patents have details section open and form type ('grant' or 'reject')
  const [showDetailsFor, setShowDetailsFor] = useState({});
  const [formType, setFormType] = useState({}); // 'grant' or 'reject'

  // Track which patent's full details are being viewed
  const [viewingPatentDetails, setViewingPatentDetails] = useState(null);

  // Admin chat states
  const [showAdminChat, setShowAdminChat] = useState(false);
  const [selectedPatentForChat, setSelectedPatentForChat] = useState(null);
  const [adminReply, setAdminReply] = useState('');

  // New states for enhanced UI
  const [showPatentsList, setShowPatentsList] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Online users and statistics
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [searchStats, setSearchStats] = useState({
    localSearchCount: 0,
    apiSearchCount: 0,
    totalSearchCount: 0
  });

  // Leaderboard states
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardFilter, setLeaderboardFilter] = useState('granted'); // 'granted', 'rejected', 'deactivated', 'activated'
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  // User statistics states
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    basicUsers: 0,
    proUsers: 0,
    enterpriseUsers: 0,
    activeUsers: 0,
    deactivatedUsers: 0
  });

  // State-wise patent states
  const [selectedState, setSelectedState] = useState('Uttar Pradesh');
  const [statePatentCount, setStatePatentCount] = useState(0);
  const [loadingStateData, setLoadingStateData] = useState(false);

  // Revenue states
  const [revenueFilter, setRevenueFilter] = useState('monthly'); // 'weekly' or 'monthly'
  const [subscriptionRevenue, setSubscriptionRevenue] = useState({
    total: 0,
    byPlan: [] // [{planName, amount, count}]
  });
  const [patentFilingRevenue, setPatentFilingRevenue] = useState({
    total: 0,
    count: 0
  });
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  // Feedback states
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState('loading');
  const [allFeedbacks, setAllFeedbacks] = useState([]);

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    const toast = { id, message, type };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Track admin action in database
  const trackAdminAction = async (actionType) => {
    if (!adminData) return;

    try {
      const response = await fetch(`http://localhost:8080/api/admin/${adminData.adminId}/track-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actionType }),
      });

      if (response.ok) {
        console.log(`✅ Tracked ${actionType} action for admin ${adminData.adminId}`);
      }
    } catch (error) {
      console.error('Error tracking admin action:', error);
    }
  };

  // Filter patents based on quick filter selection
  const getFilteredPatents = () => {
    let filtered = patents;

    // Apply quick filter
    if (quickFilter === 'granted') {
      filtered = patents.filter(patent => patent.stage5Granted === true && patent.status !== 'Patent is Rejected');
    } else if (quickFilter === 'rejected') {
      filtered = patents.filter(patent => patent.status === 'Patent is Rejected');
    } else if (quickFilter === 'deactivated') {
      filtered = patents.filter(patent => patent.isActive === false);
    } else if (quickFilter === 'application') {
      filtered = patents.filter(patent => patent.stage5Granted !== true && patent.status !== 'Patent is Rejected');
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(patent =>
        patent.inventionTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patent.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patent.id?.toString().includes(searchQuery) ||
        patent.applicantEmail?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  // Get filtered patents
  const filteredPatents = getFilteredPatents();

  // Calculate pagination
  const totalPages = Math.ceil(filteredPatents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPatents = filteredPatents.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [quickFilter, patents.length]);

  useEffect(() => {
    if (isAuthenticated) {
      checkBackendHealth();
    }
  }, [isAuthenticated]);

  // Admin login function
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    // Frontend validation
    if (!loginAdminId || !loginAdminName || !loginEmail || !loginPassword) {
      setLoginError('All fields are required');
      return;
    }

    if (!/^\d+$/.test(loginAdminId)) {
      setLoginError('Admin ID must be a number');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      setLoginError('Please enter a valid email address');
      return;
    }

    try {
      console.log('Attempting login with:', {
        adminId: parseInt(loginAdminId),
        adminName: loginAdminName,
        email: loginEmail,
        password: '***'
      });

      const response = await fetch('http://localhost:8080/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: parseInt(loginAdminId),
          adminName: loginAdminName,
          email: loginEmail,
          password: loginPassword,
        }),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const adminInfo = await response.json();
        console.log('Login successful:', adminInfo);
        setAdminData(adminInfo);
        setIsAuthenticated(true);
        // Clear form
        setLoginAdminId('');
        setLoginAdminName('');
        setLoginEmail('');
        setLoginPassword('');
      } else {
        const errorText = await response.text();
        console.error('Login failed:', response.status, errorText);
        setLoginError(`Invalid credentials. Server responded: ${response.status}. ${errorText || 'Please verify all fields match your admin record.'}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(`Cannot connect to backend at http://localhost:8080. Please ensure backend server is running. Error: ${error.message}`);
    }
  };

  // Logout function
  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminData(null);
    setPatents([]);
    setShowAdminTable(false);
  };

  // Fetch all admins for display
  const fetchAllAdmins = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/admin/all', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const admins = await response.json();
        setAllAdmins(admins);
        setShowAdminTable(true);
      } else {
        setMessage('❌ Failed to fetch admin users');
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      setMessage('❌ Error fetching admin users');
    }
  };

  const checkBackendHealth = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        setBackendStatus('connected');
        fetchAllPatents();
      } else {
        setBackendStatus('error');
        setMessage('❌ Backend is not responding correctly');
      }
    } catch (error) {
      setBackendStatus('error');
      setMessage('❌ Cannot connect to backend at http://localhost:8080. Please restart the backend server.');
      console.error('Backend health check failed:', error);
    }
  };

  const fetchAllPatents = async () => {
    setLoading(true);
    setMessage('');
    try {
      console.log('Fetching from: http://localhost:8080/api/patent-filing/all');
      const response = await fetch('http://localhost:8080/api/patent-filing/all', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        setPatents(data);
        setMessage('');
        console.log('Fetched patents:', data);
        console.log('First patent userId check:', data.length > 0 ? data[0].userId : 'No patents');
      } else {
        const errorText = await response.text();
        setMessage(`❌ Failed to fetch patents: ${response.status} ${response.statusText}`);
        console.error('Response error:', errorText);
      }
    } catch (error) {
      console.error('Fetch error details:', error);
      setMessage(`❌ Error: ${error.message}. Try: 1) Check browser console (F12), 2) Clear cache and hard reload (Ctrl+Shift+R), 3) Verify backend is at http://localhost:8080`);
    } finally {
      setLoading(false);
    }
  };

  const updateStage = async (patentId, stageName, value) => {
    setMessage('Updating stage...');
    try {
      // If granting a stage, automatically grant all lower stages
      const stageUpdates = {
        [stageName]: value
      };

      if (value === true) {
        // Cascade granting: if a higher stage is granted, grant all lower stages
        const stageOrder = ['stage1Filed', 'stage2AdminReview', 'stage3TechnicalReview', 'stage4Verification', 'stage5Granted'];
        const currentStageIndex = stageOrder.indexOf(stageName);

        // Grant all lower stages
        for (let i = 0; i <= currentStageIndex; i++) {
          stageUpdates[stageOrder[i]] = true;
        }
      }

      console.log('Updating stage with cascade:', patentId, stageUpdates);

      const response = await fetch(`http://localhost:8080/api/patent-filing/${patentId}/stages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stageUpdates),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Update result:', result);

        if (result.emailSent) {
          setMessage(`✅ Patent ${patentId} granted! Email sent to applicant.`);
        } else {
          setMessage(`✅ Stage updated for patent ${patentId}`);
        }

        // Refresh the list
        await fetchAllPatents();
      } else {
        const errorText = await response.text();
        setMessage(`❌ Failed to update stage for patent ${patentId}: ${response.status}`);
        console.error('Update error:', errorText);
      }
    } catch (error) {
      console.error('Error updating stage:', error);
      setMessage(`❌ Error: ${error.message}. Check if backend is running.`);
    }
  };

  const grantAllStages = async (patent) => {
    // If details section is not open, open it first
    if (!showDetailsFor[patent.id]) {
      setShowDetailsFor({
        ...showDetailsFor,
        [patent.id]: true
      });
      setFormType({
        ...formType,
        [patent.id]: 'grant'
      });
      setMessage('📝 Please fill in the required patent details below before granting the patent.');
      setTimeout(() => {
        setMessage('');
      }, 4000);
      return;
    }

    // Validate required fields
    const details = patentDetails[patent.id] || {};
    const missingFields = [];

    if (!details.patentNumber || details.patentNumber.trim() === '') {
      missingFields.push('Patent Number');
    }
    if (!details.grantedPersonName || details.grantedPersonName.trim() === '') {
      missingFields.push('Granted Patent Person Name');
    }
    if (!details.location || details.location.trim() === '') {
      missingFields.push('Location');
    }

    if (missingFields.length > 0) {
      setMessage(`❌ Cannot grant patent! Please fill in the following required fields: ${missingFields.join(', ')}`);
      // Scroll to the patent details section
      setTimeout(() => {
        setMessage('');
      }, 5000);
      return;
    }

    setMessage('Granting patent and sending email...');
    try {
      const stageUpdates = {
        stage1Filed: true,
        stage2AdminReview: true,
        stage3TechnicalReview: true,
        stage4Verification: true,
        stage5Granted: true,
        patentNumber: details.patentNumber,
        grantedPatentPersonName: details.grantedPersonName,
        location: details.location
      };

      console.log('Granting all stages for patent:', patent.id);
      console.log('Patent details:', details);

      const response = await fetch(`http://localhost:8080/api/patent-filing/${patent.id}/stages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stageUpdates),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Grant result:', result);
        console.log('Patent object:', patent);
        console.log('Patent userId:', patent.userId);
        console.log('Patent details:', details);

        // Extract userId - try multiple possible field names
        const userId = patent.userId || patent.user_id || patent.UserId;
        console.log('Extracted userId:', userId);

        // Add Firestore notification for the user
        if (userId) {
          try {
            console.log('🔔 Attempting to add notification for userId:', userId);

            // Fetch user profile to get subscription details
            let userSubscriptionDetails = {
              plan: 'Basic',
              amount: '₹0',
              validUntil: 'N/A'
            };

            try {
              const userDocRef = doc(db, 'users', userId);
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                console.log('User subscription data:', userData);

                // Get subscription type (basic, pro, enterprise)
                const subType = userData.subscriptionType || 'basic';

                // Get amount from subscriptionPrice field (correct field name in Firestore)
                let amountDisplay = '₹0';  // Default for basic plan
                if (userData.subscriptionPrice) {
                  const price = userData.subscriptionPrice;
                  // Handle number or string format
                  if (typeof price === 'number') {
                    amountDisplay = `₹${price}`;
                  } else {
                    // String format - check if ₹ symbol already exists
                    amountDisplay = price.toString().includes('₹') ? price : `₹${price}`;
                  }
                }
                console.log('Subscription details:', { type: subType, price: amountDisplay });

                // Get expiry date - handle Firestore Timestamp and string formats
                let expiryDisplay = 'N/A';
                if (userData.subscriptionEndDate) {
                  const endDate = userData.subscriptionEndDate;
                  if (endDate.toDate && typeof endDate.toDate === 'function') {
                    // Firestore Timestamp
                    expiryDisplay = endDate.toDate().toLocaleDateString('en-IN');
                  } else if (endDate.seconds) {
                    // Firestore Timestamp object format
                    expiryDisplay = new Date(endDate.seconds * 1000).toLocaleDateString('en-IN');
                  } else if (typeof endDate === 'string') {
                    // String date
                    const dateObj = new Date(endDate);
                    if (!isNaN(dateObj.getTime())) {
                      expiryDisplay = dateObj.toLocaleDateString('en-IN');
                    }
                  } else if (endDate instanceof Date) {
                    expiryDisplay = endDate.toLocaleDateString('en-IN');
                  }
                }

                userSubscriptionDetails = {
                  plan: subType,
                  amount: amountDisplay,
                  validUntil: expiryDisplay
                };

                console.log('Processed subscription details:', userSubscriptionDetails);
              }
            } catch (profileError) {
              console.warn('Could not fetch user profile, using defaults:', profileError);
            }

            const notificationResult = await addUserNotification(userId, {
              title: "🎉 Patent Granted!",
              message: `Congratulations! Your patent "${patent.inventionTitle}" has been granted.`,
              details: {
                patentNumber: details.patentNumber,
                grantedTo: details.grantedPersonName,
                location: details.location,
                status: 'Granted',
                filingId: patent.id,
                plan: userSubscriptionDetails.plan,
                amount: userSubscriptionDetails.amount,
                validUntil: userSubscriptionDetails.validUntil
              }
            });
            console.log('✅ Firestore notification added for patent grant:', notificationResult);
          } catch (notifError) {
            console.error('❌ Failed to add Firestore notification:', notifError);
            console.error('Error details:', notifError.message, notifError.stack);
          }
        } else {
          console.warn('⚠️ No userId found in patent object - cannot send notification');
          console.log('Available patent fields:', Object.keys(patent));
          console.log('Full patent object:', JSON.stringify(patent, null, 2));
        }

        // Hide the patent details form
        setShowDetailsFor({
          ...showDetailsFor,
          [patent.id]: false
        });

        // Scroll to the top of the page
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Track action and show toast
        await trackAdminAction('granted');

        if (result.emailSent) {
          showToast(`🎉 Patent "${patent.inventionTitle}" GRANTED! Email sent to ${patent.applicantEmail}`, 'success');
          showToast('📧 Email successfully sent to applicant', 'info');
          setMessage(`🎉 Patent "${patent.inventionTitle}" GRANTED! Email sent to ${patent.applicantEmail}`);
        } else if (result.allStagesComplete) {
          showToast(`✅ Patent "${patent.inventionTitle}" granted`, 'success');
          setMessage(`✅ Patent "${patent.inventionTitle}" granted (email may have been sent previously)`);
        } else {
          showToast(`✅ Patent "${patent.inventionTitle}" updated`, 'success');
          setMessage(`✅ Patent "${patent.inventionTitle}" updated`);
        }

        // Refresh the list
        await fetchAllPatents();
      } else {
        const errorText = await response.text();
        setMessage(`❌ Failed to grant patent ${patent.id}: ${response.status}`);
        console.error('Grant error:', errorText);
      }
    } catch (error) {
      console.error('Error granting patent:', error);
      setMessage(`❌ Error: ${error.message}. Check if backend is running.`);
    }
  };

  const rejectPatent = async (patent) => {
    // If details section is not open, open it first
    if (!showDetailsFor[patent.id]) {
      setShowDetailsFor({
        ...showDetailsFor,
        [patent.id]: true
      });
      setFormType({
        ...formType,
        [patent.id]: 'reject'
      });
      setMessage('📝 Please fill in the required rejection details below before rejecting the patent.');
      setTimeout(() => {
        setMessage('');
      }, 4000);
      return;
    }

    // Validate required fields for rejection
    const details = patentDetails[patent.id] || {};
    const missingFields = [];

    if (!details.rejectedPatentNumber || details.rejectedPatentNumber.trim() === '') {
      missingFields.push('Rejected Patent Number');
    }
    if (!details.rejectedPersonName || details.rejectedPersonName.trim() === '') {
      missingFields.push('Rejected Patent Person Name');
    }
    if (!details.location || details.location.trim() === '') {
      missingFields.push('Location');
    }

    if (missingFields.length > 0) {
      setMessage(`❌ Cannot reject patent! Please fill in the following required fields: ${missingFields.join(', ')}`);
      setTimeout(() => {
        setMessage('');
      }, 5000);
      return;
    }

    setMessage('Rejecting patent and sending email...');
    try {
      const response = await fetch(`http://localhost:8080/api/patent-filing/${patent.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectedPatentNumber: details.rejectedPatentNumber,
          rejectedPersonName: details.rejectedPersonName,
          location: details.location,
          status: 'Patent is Rejected',
          applicantEmail: patent.applicantEmail,
          inventionTitle: patent.inventionTitle
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Rejection result:', result);
        console.log('Patent object:', patent);
        console.log('Patent userId:', patent.userId);
        console.log('Rejection details:', details);

        // Extract userId - try multiple possible field names
        const userId = patent.userId || patent.user_id || patent.UserId;
        console.log('Extracted userId:', userId);

        // Add Firestore notification for the user
        if (userId) {
          try {
            console.log('🔔 Attempting to add rejection notification for userId:', userId);

            // Fetch user profile to get subscription details
            let userSubscriptionDetails = {
              plan: 'Basic',
              amount: '₹0',
              validUntil: 'N/A'
            };

            try {
              const userDocRef = doc(db, 'users', userId);
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                console.log('User subscription data:', userData);

                // Get subscription type (basic, pro, enterprise)
                const subType = userData.subscriptionType || 'basic';

                // Get amount from subscriptionPrice field (correct field name in Firestore)
                let amountDisplay = '₹0';  // Default for basic plan
                if (userData.subscriptionPrice) {
                  const price = userData.subscriptionPrice;
                  // Handle number or string format
                  if (typeof price === 'number') {
                    amountDisplay = `₹${price}`;
                  } else {
                    // String format - check if ₹ symbol already exists
                    amountDisplay = price.toString().includes('₹') ? price : `₹${price}`;
                  }
                }
                console.log('Subscription details for rejection:', { type: subType, price: amountDisplay });

                // Get expiry date - handle Firestore Timestamp and string formats
                let expiryDisplay = 'N/A';
                if (userData.subscriptionEndDate) {
                  const endDate = userData.subscriptionEndDate;
                  if (endDate.toDate && typeof endDate.toDate === 'function') {
                    // Firestore Timestamp
                    expiryDisplay = endDate.toDate().toLocaleDateString('en-IN');
                  } else if (endDate.seconds) {
                    // Firestore Timestamp object format
                    expiryDisplay = new Date(endDate.seconds * 1000).toLocaleDateString('en-IN');
                  } else if (typeof endDate === 'string') {
                    // String date
                    const dateObj = new Date(endDate);
                    if (!isNaN(dateObj.getTime())) {
                      expiryDisplay = dateObj.toLocaleDateString('en-IN');
                    }
                  } else if (endDate instanceof Date) {
                    expiryDisplay = endDate.toLocaleDateString('en-IN');
                  }
                }

                userSubscriptionDetails = {
                  plan: subType,
                  amount: amountDisplay,
                  validUntil: expiryDisplay
                };

                console.log('Processed subscription details for rejection:', userSubscriptionDetails);
              }
            } catch (profileError) {
              console.warn('Could not fetch user profile, using defaults:', profileError);
            }

            const notificationResult = await addUserNotification(userId, {
              title: "❌ Patent Rejected",
              message: `Your patent application "${patent.inventionTitle}" has been rejected.`,
              details: {
                rejectedPatentNumber: details.rejectedPatentNumber,
                rejectedBy: details.rejectedPersonName,
                location: details.location,
                status: 'Rejected',
                filingId: patent.id,
                plan: userSubscriptionDetails.plan,
                amount: userSubscriptionDetails.amount,
                validUntil: userSubscriptionDetails.validUntil
              }
            });
            console.log('✅ Firestore notification added for patent rejection:', notificationResult);
          } catch (notifError) {
            console.error('❌ Failed to add Firestore notification:', notifError);
            console.error('Error details:', notifError.message, notifError.stack);
          }
        } else {
          console.warn('⚠️ No userId found in patent object - cannot send notification');
          console.log('Available patent fields:', Object.keys(patent));
          console.log('Full patent object:', JSON.stringify(patent, null, 2));
        }

        // Hide the patent details form
        setShowDetailsFor({
          ...showDetailsFor,
          [patent.id]: false
        });

        // Track action and show toast
        await trackAdminAction('rejected');

        // Scroll to the top of the page
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (result.emailSent) {
          showToast(`❌ Patent "${patent.inventionTitle}" REJECTED!`, 'error');
          showToast('📧 Rejection email successfully sent to applicant', 'info');
          setMessage(`❌ Patent "${patent.inventionTitle}" REJECTED! Email sent to ${patent.applicantEmail}`);
        } else {
          showToast(`❌ Patent "${patent.inventionTitle}" rejected`, 'error');
          setMessage(`❌ Patent "${patent.inventionTitle}" rejected`);
        }

        // Refresh the list
        await fetchAllPatents();
      } else {
        const errorText = await response.text();
        setMessage(`❌ Failed to reject patent ${patent.id}: ${response.status}`);
        console.error('Rejection error:', errorText);
      }
    } catch (error) {
      console.error('Error rejecting patent:', error);
      setMessage(`❌ Error: ${error.message}. Check if backend is running.`);
    }
  };

  const resetStages = async (patentId) => {
    setMessage('Resetting stages...');
    try {
      const stageUpdates = {
        stage1Filed: true,
        stage2AdminReview: false,
        stage3TechnicalReview: false,
        stage4Verification: false,
        stage5Granted: false
      };

      const response = await fetch(`http://localhost:8080/api/patent-filing/${patentId}/stages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stageUpdates),
      });

      if (response.ok) {
        setMessage(`🔄 Reset stages for patent ${patentId}`);
        await fetchAllPatents();
      } else {
        const errorText = await response.text();
        setMessage(`❌ Failed to reset stages: ${response.status}`);
        console.error('Reset error:', errorText);
      }
    } catch (error) {
      console.error('Error resetting stages:', error);
      setMessage(`❌ Error: ${error.message}. Check if backend is running.`);
    }
  };

  // Admin Chat Functions
  const openAdminChat = (patent) => {
    console.log('Opening admin chat for patent:', patent);
    setSelectedPatentForChat(patent);
    setShowAdminChat(true);
    setAdminReply('');
  };

  const closeAdminChat = () => {
    setShowAdminChat(false);
    setSelectedPatentForChat(null);
    setAdminReply('');
  };

  const getReplyCount = (patent) => {
    if (!patent) return 0;
    let count = 0;
    ['r1', 'r2', 'r3', 'r4'].forEach(field => {
      if (patent[field] && patent[field].trim() !== '') {
        count++;
      }
    });
    return count;
  };

  const sendAdminReply = async () => {
    if (!adminReply.trim() || !selectedPatentForChat) {
      return;
    }

    const replyCount = getReplyCount(selectedPatentForChat);
    if (replyCount >= 4) {
      alert('Maximum 4 replies already sent for this patent!');
      return;
    }

    try {
      const replyField = `r${replyCount + 1}`;
      console.log(`Sending admin reply to ${replyField}:`, adminReply);

      const response = await fetch(`http://localhost:8080/api/patent-filing/${selectedPatentForChat.id}/reply`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          replyField: replyField,
          replyContent: adminReply.trim()
        }),
      });

      if (response.ok) {
        const updatedPatent = await response.json();
        console.log('Reply saved successfully:', updatedPatent);

        // Update patents list
        setPatents(patents.map(p => p.id === updatedPatent.id ? updatedPatent : p));
        setSelectedPatentForChat(updatedPatent);
        setAdminReply('');
        setMessage('✅ Reply sent successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        console.error('Failed to send reply:', response.status);
        alert('Failed to send reply. Please try again.');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Error sending reply. Please check your connection.');
    }
  };

  // Count unread user messages (messages without admin replies)
  const getUnreadMessagesCount = (patent) => {
    if (!patent) return 0;
    let unreadCount = 0;

    for (let i = 1; i <= 5; i++) {
      const userMsg = patent[`m${i}`];
      const adminReply = patent[`r${i}`];

      // If user sent a message but admin hasn't replied yet
      if (userMsg && userMsg.trim() !== '' && (!adminReply || adminReply.trim() === '')) {
        unreadCount++;
      }
    }

    return unreadCount;
  };

  // Fetch online users count from Firestore
  const fetchOnlineUsers = () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('isOnline', '==', true));

      // Real-time listener for online users
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setOnlineUsersCount(snapshot.size);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching online users:', error);
      return null;
    }
  };

  // Fetch search statistics from Firestore
  const fetchSearchStats = async () => {
    try {
      const statsDoc = await getDoc(doc(db, 'globalStats', 'searchCounter'));
      if (statsDoc.exists()) {
        const data = statsDoc.data();
        setSearchStats({
          localSearchCount: data.localSearchCount || 0,
          apiSearchCount: data.apiSearchCount || 0,
          totalSearchCount: data.totalSearchCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching search stats:', error);
    }
  };

  // Fetch leaderboard data from backend
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/admin/all', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const admins = await response.json();
        console.log('Fetched admins:', admins); // Debug log

        // Convert snake_case to camelCase for field names
        const filterFieldMap = {
          'granted': 'patentsGranted',
          'rejected': 'patentsRejected',
          'activated': 'patentsActivated',
          'deactivated': 'patentsDeactivated'
        };

        const fieldName = filterFieldMap[leaderboardFilter];
        console.log('Sorting by field:', fieldName); // Debug log

        // Sort based on current filter using camelCase field names
        const sorted = admins.sort((a, b) => {
          const aValue = a[fieldName] || 0;
          const bValue = b[fieldName] || 0;
          console.log(`${a.adminName}: ${aValue}, ${b.adminName}: ${bValue}`); // Debug log
          return bValue - aValue;
        }).slice(0, 5); // Get top 5

        console.log('Sorted leaderboard:', sorted); // Debug log
        setLeaderboardData(sorted);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  // Fetch user statistics from Firebase Firestore
  const fetchUserStatistics = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      let total = 0;
      let basic = 0;
      let pro = 0;
      let enterprise = 0;
      let active = 0;
      let deactivated = 0;

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        total++;

        // Count by subscription type
        const subscription = (userData.subscriptionType || 'basic').toLowerCase();
        if (subscription === 'basic') {
          basic++;
        } else if (subscription === 'pro') {
          pro++;
        } else if (subscription === 'enterprise') {
          enterprise++;
        } else {
          // Default to basic if unknown
          basic++;
        }

        // Check if user is deactivated
        if (userData.isDeactivated === true || userData.accountStatus === 'deactivated') {
          deactivated++;
        } else {
          active++;
        }
      });

      const newStats = {
        totalUsers: total,
        basicUsers: basic,
        proUsers: pro,
        enterpriseUsers: enterprise,
        activeUsers: active,
        deactivatedUsers: deactivated
      };

      setUserStats(newStats);

      console.log('User statistics fetched:', { total, basic, pro, enterprise, active, deactivated });

      // Calculate subscription revenue based on updated stats
      if (isAuthenticated) {
        calculateSubscriptionRevenue(newStats);
      }
    } catch (error) {
      console.error('Error fetching user statistics:', error);
    }
  };

  // Fetch patent count by state
  const fetchStatePatentCount = async (state) => {
    if (!state) {
      setStatePatentCount(0);
      return;
    }

    try {
      setLoadingStateData(true);
      const response = await fetch(`http://localhost:8080/api/patents/count-by-state?state=${encodeURIComponent(state)}`);

      if (response.ok) {
        const count = await response.json();
        setStatePatentCount(count || 0);
      } else {
        setStatePatentCount(0);
      }
    } catch (error) {
      console.error('Error fetching state patent count:', error);
      setStatePatentCount(0);
    } finally {
      setLoadingStateData(false);
    }
  };

  // Calculate subscription revenue based on user stats
  const calculateSubscriptionRevenue = (stats) => {
    try {
      const planPrices = {
        'Pro': 49,
        'Enterprise': 199,
        'Basic': 0
      };

      // Calculate revenue based on passed stats
      const proRevenue = stats.proUsers * planPrices['Pro'];
      const enterpriseRevenue = stats.enterpriseUsers * planPrices['Enterprise'];
      const totalRevenue = proRevenue + enterpriseRevenue;

      const byPlan = [];

      if (stats.basicUsers > 0) {
        byPlan.push({
          planName: 'Basic',
          amount: 0,
          count: stats.basicUsers
        });
      }

      if (stats.proUsers > 0) {
        byPlan.push({
          planName: 'Pro',
          amount: proRevenue,
          count: stats.proUsers
        });
      }

      if (stats.enterpriseUsers > 0) {
        byPlan.push({
          planName: 'Enterprise',
          amount: enterpriseRevenue,
          count: stats.enterpriseUsers
        });
      }

      setSubscriptionRevenue({ total: totalRevenue, byPlan });
      console.log('Subscription revenue calculated:', { totalRevenue, byPlan });
    } catch (error) {
      console.error('Error calculating subscription revenue:', error);
      setSubscriptionRevenue({ total: 0, byPlan: [] });
    }
  };

  // Calculate patent filing revenue from patents array
  const calculatePatentFilingRevenue = () => {
    const patentFilingPrice = 500; // ₹500 per patent filing
    const count = patents.length;
    const total = count * patentFilingPrice;

    setPatentFilingRevenue({ total, count });
  };

  // Effect to fetch online users and search stats when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Fetch online users with real-time updates
      const unsubscribe = fetchOnlineUsers();

      // Fetch search stats initially
      fetchSearchStats();

      // Fetch user statistics
      fetchUserStatistics();

      // Refresh search stats every 30 seconds
      const statsInterval = setInterval(fetchSearchStats, 30000);

      // Refresh user stats every 60 seconds
      const userStatsInterval = setInterval(fetchUserStatistics, 60000);

      return () => {
        if (unsubscribe) unsubscribe();
        clearInterval(statsInterval);
        clearInterval(userStatsInterval);
      };
    }
  }, [isAuthenticated]);

  // Effect to fetch leaderboard when filter changes
  useEffect(() => {
    if (showLeaderboard) {
      fetchLeaderboard();
    }
  }, [leaderboardFilter, showLeaderboard]);

  // Effect to fetch patent count when state is selected
  useEffect(() => {
    if (selectedState) {
      fetchStatePatentCount(selectedState);
    }
  }, [selectedState]);

  // Effect to calculate patent filing revenue when patents change
  useEffect(() => {
    if (isAuthenticated && patents.length > 0) {
      calculatePatentFilingRevenue();
    }
  }, [patents.length, isAuthenticated]);

  // Effect to fetch feedback analytics
  useEffect(() => {
    if (isAuthenticated) {
      const fetchFeedbackAnalytics = async () => {
        setFeedbackStatus('loading');
        try {
          console.log('🔄 Admin Panel: Fetching feedback analytics from backend...');

          // Fetch stats
          const statsResponse = await fetch('http://localhost:8080/api/feedback/stats');
          console.log('📊 Stats Response Status:', statsResponse.status);

          if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('✅ Feedback stats received:', stats);
            setFeedbackStats(stats);
          } else {
            console.error('❌ Failed to fetch feedback stats:', statsResponse.statusText);
          }

          // Fetch all feedbacks
          const allResponse = await fetch('http://localhost:8080/api/feedback/all');
          console.log('📝 All Feedbacks Response Status:', allResponse.status);

          if (allResponse.ok) {
            const feedbacks = await allResponse.json();
            console.log('✅ All feedbacks received. Count:', feedbacks.length);
            setAllFeedbacks(feedbacks);
          } else {
            console.error('❌ Failed to fetch all feedbacks:', allResponse.statusText);
          }

          setFeedbackStatus('success');
          console.log('✨ Feedback analytics loaded successfully!');
        } catch (error) {
          console.error('💥 Error fetching feedback analytics:', error);
          setFeedbackStatus('error');
        }
      };

      fetchFeedbackAnalytics();

      // Refresh every 60 seconds
      const interval = setInterval(fetchFeedbackAnalytics, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Activate patent (make it visible to users)
  const activatePatent = async (patentId) => {
    setMessage('Activating patent...');
    try {
      const response = await fetch(`http://localhost:8080/api/patent-filing/${patentId}/activate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Activate result:', result);

        // Track action and show toast
        await trackAdminAction('activated');
        showToast(`✅ Patent ${patentId} activated successfully!`, 'success');
        setMessage(`✅ Patent ${patentId} activated successfully!`);

        // Refresh the list
        await fetchAllPatents();

        setTimeout(() => {
          setMessage('');
        }, 3000);
      } else {
        const errorText = await response.text();
        setMessage(`❌ Failed to activate patent ${patentId}: ${response.status}`);
        console.error('Activate error:', errorText);
      }
    } catch (error) {
      console.error('Error activating patent:', error);
      setMessage(`❌ Error: ${error.message}. Check if backend is running.`);
    }
  };

  // Deactivate patent (hide it from users)
  const deactivatePatent = async (patentId) => {
    setMessage('Deactivating patent...');
    try {
      // Find the patent to get user details
      const patent = patents.find(p => p.id === patentId);

      const response = await fetch(`http://localhost:8080/api/patent-filing/${patentId}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Deactivate result:', result);

        // Track action and show toast
        await trackAdminAction('deactivated');
        showToast(`⚠️ Patent ${patentId} deactivated successfully!`, 'warning');
        setMessage(`✅ Patent ${patentId} deactivated successfully!`);

        // Send notification to user
        if (patent && patent.userId) {
          try {
            console.log('🔔 Sending deactivation notification to userId:', patent.userId);
            await addUserNotification(patent.userId, {
              title: 'Patent Deactivated',
              message: `Your patent application "${patent.inventionTitle}" has been temporarily deactivated by the admin.`,
              details: `Patent ID: ${patent.id}. Please contact support for more information.`
            });
            console.log('✅ Deactivation notification sent successfully');
          } catch (notificationError) {
            console.error('❌ Failed to send deactivation notification:', notificationError);
            // Continue even if notification fails
          }
        } else {
          console.warn('⚠️ No userId found for patent, notification not sent');
        }

        // Refresh the list
        await fetchAllPatents();

        setTimeout(() => {
          setMessage('');
        }, 3000);
      } else {
        const errorText = await response.text();
        setMessage(`❌ Failed to deactivate patent ${patentId}: ${response.status}`);
        console.error('Deactivate error:', errorText);
      }
    } catch (error) {
      console.error('Error deactivating patent:', error);
      setMessage(`❌ Error: ${error.message}. Check if backend is running.`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {!isAuthenticated ? (
        // Admin Login Full Page Form
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">

            {/* Left Side - Branding & Info */}
            <div className="hidden md:block space-y-8">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start mb-6">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg">
                    <Shield className="w-16 h-16 text-white" />
                  </div>
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Admin Portal
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  Secure Access to Patent Management System
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <span>Manage patent applications</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <span>Review and approve filings</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <span>Track application stages</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <span>Send automated notifications</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full">
              <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20 overflow-hidden" style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), 0 0 1px rgba(31, 38, 135, 0.1)',
              }}>
                {/* Top Strip with Back to Dashboard Button */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 flex items-center justify-between border-b border-blue-700">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold">Admin Login</span>
                  </div>
                  <button
                    type="button"
                    onClick={onBack || (() => window.history.back())}
                    className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all backdrop-blur-sm border border-white/30 text-sm font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                  </button>
                </div>

                <div className="p-8 md:p-10">
                  <div className="md:hidden flex items-center justify-center mb-6">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl">
                      <Shield className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
                    Welcome Back
                  </h2>
                  <p className="text-center text-gray-700 mb-8 font-medium">
                    Sign in to access the admin dashboard
                  </p>

                  {loginError && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Login Failed</p>
                        <p className="text-sm">{loginError}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleAdminLogin} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Admin ID <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={loginAdminId}
                          onChange={(e) => setLoginAdminId(e.target.value)}
                          className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium placeholder:text-gray-500 shadow-sm"
                          placeholder="Enter your admin ID"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Admin Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={loginAdminName}
                          onChange={(e) => setLoginAdminName(e.target.value)}
                          className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium placeholder:text-gray-500 shadow-sm"
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium placeholder:text-gray-500 shadow-sm"
                          placeholder="admin@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-12 bg-white/60 backdrop-blur-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium placeholder:text-gray-500 shadow-sm"
                          placeholder="Enter your password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 focus:outline-none transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 border border-blue-700"
                    >
                      <LogIn className="w-5 h-5" />
                      Login to Admin Panel
                    </button>
                  </form>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-700 font-medium">
                      <Shield className="w-4 h-4 inline mr-1" />
                      Secure admin access • All activities are logged
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : showUserManagement ? (
        // User Management View
        <AdminUserManagement onBack={() => setShowUserManagement(false)} />
      ) : (
        // Admin Panel Content (after login)
        <div className="max-w-7xl mx-auto">
          {/* Admin Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Admin Patent Manager</h1>
                {adminData && (
                  <div className="flex items-center gap-2 mt-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>Logged in as: <strong>{adminData.adminName}</strong> ({adminData.email})</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUserManagement(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 shadow-lg"
                >
                  <Users className="w-4 h-4" />
                  Manage Users
                </button>
                <button
                  onClick={() => {
                    fetchAllAdmins();
                    setShowAdminTable(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  <User className="w-4 h-4" />
                  View Admin Users
                </button>
                <button
                  onClick={fetchAllPatents}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Patents
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>

            {message && (
              <div className={`mt-4 p-4 rounded-lg ${message.includes('❌') ? 'bg-red-100 text-red-800' :
                message.includes('🎉') ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {message}
                </div>
              </div>
            )}

            <p className="text-gray-600 mt-4">
              Manage patent filing stages. When all 5 stages are complete, an email will be automatically sent to the applicant.
            </p>
          </div>

          {/* System Health Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Card 1: Backend / API Health */}
            {/* Card 1: Backend / API Health */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-100 rounded-xl shadow-lg p-6 border-2 border-teal-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-teal-700 mb-2">
                    <Server className="w-5 h-5" />
                    <p className="text-sm font-semibold uppercase tracking-wide">Backend / API Health</p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold text-teal-800">45ms</p>
                    <span className="text-sm font-medium text-teal-600">Avg Response</span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 mb-3">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600"></span>
                    </span>
                    <span className="text-xs font-bold text-teal-700">Healthy</span>
                    <span className="text-teal-400 mx-1">•</span>
                    <span className="text-xs text-teal-700 font-medium">Uptime: 99.9%</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-teal-600 pt-2 border-t border-teal-200">
                    <span className="flex items-center gap-1" title="Max Response Time">
                      <Activity className="w-3 h-3" /> Max: 120ms
                    </span>
                    <span className="flex items-center gap-1">
                      v2.4.0
                    </span>
                    <div className="ml-auto flex items-center gap-1 opacity-80">
                      Last checked: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="self-start ml-4">
                  <div className="bg-teal-200 p-4 rounded-xl shadow-inner">
                    <Server className="w-10 h-10 text-teal-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Database Health */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-100 rounded-xl shadow-lg p-6 border-2 border-teal-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-teal-700 mb-2">
                    <Database className="w-5 h-5" />
                    <p className="text-sm font-semibold uppercase tracking-wide">Database Health</p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold text-teal-800">85</p>
                    <span className="text-sm font-medium text-teal-600">Active Conn.</span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 mb-3">
                    {backendStatus === 'connected' ? (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600"></span>
                        </span>
                        <span className="text-xs font-bold text-green-700">Connected</span>
                      </>
                    ) : backendStatus === 'checking' ? (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                        </span>
                        <span className="text-xs font-bold text-yellow-700">Checking...</span>
                      </>
                    ) : (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                        </span>
                        <span className="text-xs font-bold text-red-700">Disconnected</span>
                      </>
                    )}
                    <span className="text-teal-400 mx-1">•</span>
                    <span className="text-xs text-teal-700 font-medium">Latency: 12ms</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-teal-600 pt-2 border-t border-teal-200">
                    <span className="font-semibold bg-white/40 px-1.5 py-0.5 rounded">PostgreSQL</span>
                    <span className="flex items-center gap-1">
                      Perf: <span className="font-bold text-green-700">Normal</span>
                    </span>
                    <div className="ml-auto opacity-75 bg-teal-200/50 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-teal-800">
                      Production
                    </div>
                  </div>
                </div>

                <div className="self-start ml-4">
                  <div className="bg-teal-200 p-4 rounded-xl shadow-inner">
                    <Database className="w-10 h-10 text-teal-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Online Users Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-lg p-6 border-2 border-green-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <Users className="w-5 h-5" />
                    <p className="text-sm font-semibold uppercase tracking-wide">Online Users</p>
                  </div>
                  <p className="text-4xl font-bold text-green-700">{onlineUsersCount}</p>
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <Activity className="w-3 h-3 animate-pulse" />
                    Live status • Real-time
                  </p>
                </div>
                <div className="bg-green-200 p-4 rounded-xl">
                  <Users className="w-10 h-10 text-green-700" />
                </div>
              </div>
            </div>

            {/* Local Database Searches Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg p-6 border-2 border-blue-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Database className="w-5 h-5" />
                    <p className="text-sm font-semibold uppercase tracking-wide">Local DB Searches</p>
                  </div>
                  <p className="text-4xl font-bold text-blue-700">{searchStats.localSearchCount}</p>
                  <p className="text-xs text-blue-600 mt-2">Database mode searches</p>
                </div>
                <div className="bg-blue-200 p-4 rounded-xl">
                  <Database className="w-10 h-10 text-blue-700" />
                </div>
              </div>
            </div>

            {/* External API Searches Card */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl shadow-lg p-6 border-2 border-purple-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <Globe className="w-5 h-5" />
                    <p className="text-sm font-semibold uppercase tracking-wide">External API Searches</p>
                  </div>
                  <p className="text-4xl font-bold text-purple-700">{searchStats.apiSearchCount}</p>
                  <p className="text-xs text-purple-600 mt-2">External API searches</p>
                </div>
                <div className="bg-purple-200 p-4 rounded-xl">
                  <Globe className="w-10 h-10 text-purple-700" />
                </div>
              </div>
            </div>

            {/* Total Searches Card */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl shadow-lg p-6 border-2 border-orange-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <Search className="w-5 h-5" />
                    <p className="text-sm font-semibold uppercase tracking-wide">Total Searches</p>
                  </div>
                  <p className="text-4xl font-bold text-orange-700">{searchStats.totalSearchCount}</p>
                  <p className="text-xs text-orange-600 mt-2">Combined all searches</p>
                </div>
                <div className="bg-orange-200 p-4 rounded-xl">
                  <Search className="w-10 h-10 text-orange-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Admin Users Table */}
          {/* Admin Users Modal */}
          {showAdminTable && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border-2 border-purple-200">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl shadow-lg backdrop-blur-sm">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-white">
                        Admin Users
                      </h2>
                      <p className="text-purple-100 mt-1">Total Admins: {allAdmins.length}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAdminTable(false)}
                    className="p-3 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all shadow-lg hover:scale-110"
                    title="Close"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Content with Scroll */}
                <div className="p-8 overflow-y-auto max-h-[calc(90vh-100px)]">
                  <div className="space-y-4">
                    {allAdmins.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-200">
                        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-xl font-semibold text-gray-700">No admin users found</p>
                        <p className="text-gray-500 mt-2">Admin users will appear here once registered</p>
                      </div>
                    ) : (
                      allAdmins.map((admin) => (
                        <div
                          key={admin.adminId}
                          className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all p-6 border-l-4 border-purple-500"
                        >
                          <div className="flex items-center justify-between">
                            {/* Admin Info */}
                            <div className="flex items-center gap-4 flex-1">
                              {/* Avatar */}
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-purple-100">
                                {admin.adminName?.charAt(0)?.toUpperCase() || 'A'}
                              </div>

                              {/* Details */}
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-xl font-bold text-gray-800">{admin.adminName}</h3>
                                  <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-full text-xs font-bold border border-purple-300">
                                    Admin #{admin.adminId}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="w-4 h-4 text-purple-500" />
                                    <span className="font-medium">{admin.email}</span>
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Clock className="w-4 h-4 text-indigo-500" />
                                    <span>Joined: {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Activity className="w-4 h-4 text-green-500" />
                                    <span>Status: <span className="text-green-600 font-semibold">Active</span></span>
                                  </div>
                                </div>

                                {/* Admin Stats */}
                                {(admin.patentsGranted || admin.patentsRejected || admin.patentsActivated || admin.patentsDeactivated) && (
                                  <div className="flex gap-3 mt-3">
                                    {admin.patentsGranted > 0 && (
                                      <span className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-semibold border border-green-200">
                                        <CheckCircle className="w-3 h-3" />
                                        Granted: {admin.patentsGranted}
                                      </span>
                                    )}
                                    {admin.patentsRejected > 0 && (
                                      <span className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-200">
                                        <X className="w-3 h-3" />
                                        Rejected: {admin.patentsRejected}
                                      </span>
                                    )}
                                    {admin.patentsActivated > 0 && (
                                      <span className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
                                        <UserCheck className="w-3 h-3" />
                                        Activated: {admin.patentsActivated}
                                      </span>
                                    )}
                                    {admin.patentsDeactivated > 0 && (
                                      <span className="flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold border border-gray-200">
                                        <UserX className="w-3 h-3" />
                                        Deactivated: {admin.patentsDeactivated}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Patent Statistics Chart */}
          {!loading && patents.length > 0 && (
            <div className="bg-gradient-to-br from-white via-indigo-50 to-purple-50 rounded-2xl shadow-2xl p-8 mb-6 border-2 border-indigo-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Patent Statistics Overview
                    </h2>
                    <p className="text-sm text-gray-600 font-medium">Total: {patents.length} Patents</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {/* Leaderboard Button */}
                  <button
                    onClick={() => {
                      setShowLeaderboard(true);
                      fetchLeaderboard();
                    }}
                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white rounded-xl font-bold text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  >
                    <Trophy className="w-5 h-5" />
                    Admin Leaderboard
                  </button>

                  {/* Show Patents Button */}
                  <button
                    onClick={() => setShowPatentsList(true)}
                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl font-bold text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  >
                    <List className="w-5 h-5" />
                    Show All Patents
                    <span className="ml-1 px-2.5 py-0.5 bg-white/20 rounded-full text-sm">
                      {patents.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Chart Visualization */}
              <div className="grid grid-cols-5 gap-4 h-64">
                {/* Total Bar */}
                <div className="flex flex-col items-center justify-end">
                  <div className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-xl shadow-lg relative group hover:from-indigo-600 hover:to-indigo-500 transition-all"
                    style={{ height: `${(patents.length / Math.max(patents.length, 10)) * 100}%`, minHeight: '60px' }}>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      {patents.length}
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{patents.length}</p>
                    <p className="text-xs font-semibold text-gray-600 uppercase mt-1">Total</p>
                  </div>
                </div>

                {/* Granted Bar */}
                <div className="flex flex-col items-center justify-end">
                  <div className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-xl shadow-lg relative group hover:from-green-600 hover:to-green-500 transition-all"
                    style={{ height: `${(patents.filter(p => p.stage5Granted === true && p.status !== 'Patent is Rejected').length / Math.max(patents.length, 10)) * 100}%`, minHeight: '60px' }}>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      {patents.filter(p => p.stage5Granted === true && p.status !== 'Patent is Rejected').length}
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{patents.filter(p => p.stage5Granted === true && p.status !== 'Patent is Rejected').length}</p>
                    <p className="text-xs font-semibold text-gray-600 uppercase mt-1">Granted</p>
                  </div>
                </div>

                {/* Rejected Bar */}
                <div className="flex flex-col items-center justify-end">
                  <div className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t-xl shadow-lg relative group hover:from-red-600 hover:to-red-500 transition-all"
                    style={{ height: `${(patents.filter(p => p.status === 'Patent is Rejected').length / Math.max(patents.length, 10)) * 100}%`, minHeight: '60px' }}>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      {patents.filter(p => p.status === 'Patent is Rejected').length}
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{patents.filter(p => p.status === 'Patent is Rejected').length}</p>
                    <p className="text-xs font-semibold text-gray-600 uppercase mt-1">Rejected</p>
                  </div>
                </div>

                {/* Application Bar */}
                <div className="flex flex-col items-center justify-end">
                  <div className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-xl shadow-lg relative group hover:from-orange-600 hover:to-orange-500 transition-all"
                    style={{ height: `${(patents.filter(p => p.stage5Granted !== true && p.status !== 'Patent is Rejected').length / Math.max(patents.length, 10)) * 100}%`, minHeight: '60px' }}>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      {patents.filter(p => p.stage5Granted !== true && p.status !== 'Patent is Rejected').length}
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-2xl font-bold text-orange-600">{patents.filter(p => p.stage5Granted !== true && p.status !== 'Patent is Rejected').length}</p>
                    <p className="text-xs font-semibold text-gray-600 uppercase mt-1">Application</p>
                  </div>
                </div>

                {/* Deactivated Bar */}
                <div className="flex flex-col items-center justify-end">
                  <div className="w-full bg-gradient-to-t from-gray-500 to-gray-400 rounded-t-xl shadow-lg relative group hover:from-gray-600 hover:to-gray-500 transition-all"
                    style={{ height: `${(patents.filter(p => p.isActive === false).length / Math.max(patents.length, 10)) * 100}%`, minHeight: '60px' }}>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-600 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      {patents.filter(p => p.isActive === false).length}
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-2xl font-bold text-gray-600">{patents.filter(p => p.isActive === false).length}</p>
                    <p className="text-xs font-semibold text-gray-600 uppercase mt-1">Deactivated</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Statistics and State-wise Patents Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* User Statistics Chart */}
            <div className="bg-gradient-to-br from-white via-blue-50 to-cyan-50 rounded-2xl shadow-2xl p-6 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-3 rounded-xl shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    User Statistics
                  </h2>
                  <p className="text-xs text-gray-600 font-medium">Real-time user data from Firestore</p>
                </div>
              </div>

              {/* Chart Bars */}
              <div className="grid grid-cols-3 gap-4 h-56">
                {/* Total Users */}
                <div className="flex flex-col items-center justify-end">
                  <div className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-xl shadow-lg relative group hover:from-blue-600 hover:to-blue-500 transition-all"
                    style={{ height: `${userStats.totalUsers > 0 ? (userStats.totalUsers / Math.max(userStats.totalUsers, 10)) * 100 : 20}%`, minHeight: '60px' }}>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {userStats.totalUsers}
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{userStats.totalUsers}</p>
                    <p className="text-xs font-semibold text-gray-600 uppercase mt-1">Total Users</p>
                  </div>
                </div>

                {/* Active Users */}
                <div className="flex flex-col items-center justify-end">
                  <div className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-xl shadow-lg relative group hover:from-green-600 hover:to-green-500 transition-all"
                    style={{ height: `${userStats.totalUsers > 0 ? (userStats.activeUsers / userStats.totalUsers) * 100 : 20}%`, minHeight: '60px' }}>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {userStats.activeUsers}
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{userStats.activeUsers}</p>
                    <p className="text-xs font-semibold text-gray-600 uppercase mt-1">Active Users</p>
                  </div>
                </div>

                {/* Deactivated Users */}
                <div className="flex flex-col items-center justify-end">
                  <div className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t-xl shadow-lg relative group hover:from-red-600 hover:to-red-500 transition-all"
                    style={{ height: `${userStats.totalUsers > 0 ? (userStats.deactivatedUsers / userStats.totalUsers) * 100 : 20}%`, minHeight: '60px' }}>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {userStats.deactivatedUsers}
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{userStats.deactivatedUsers}</p>
                    <p className="text-xs font-semibold text-gray-600 uppercase mt-1">Deactivated</p>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="mt-6 pt-6 border-t-2 border-blue-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-r from-green-100 to-green-200 rounded-lg p-3 border border-green-300">
                    <p className="text-xs text-green-700 font-semibold mb-1">Active Rate</p>
                    <p className="text-xl font-bold text-green-700">
                      {userStats.totalUsers > 0 ? Math.round((userStats.activeUsers / userStats.totalUsers) * 100) : 0}%
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-red-100 to-red-200 rounded-lg p-3 border border-red-300">
                    <p className="text-xs text-red-700 font-semibold mb-1">Deactivation Rate</p>
                    <p className="text-xl font-bold text-red-700">
                      {userStats.totalUsers > 0 ? Math.round((userStats.deactivatedUsers / userStats.totalUsers) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* State-wise Patent Counter */}
            <div className="bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-2xl shadow-2xl p-6 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg">
                  <Globe className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    State-wise Patents
                  </h2>
                  <p className="text-xs text-gray-600 font-medium">Patents by Indian States & UTs</p>
                </div>
              </div>

              {/* State Selector */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Select State/UT
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition-all text-gray-700 font-medium shadow-md"
                >
                  <option value="">-- Select a State or UT --</option>
                  <optgroup label="States">
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                  </optgroup>
                  <optgroup label="Union Territories">
                    <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                    <option value="Puducherry">Puducherry</option>
                  </optgroup>
                </select>
              </div>

              {/* Patent Count Display */}
              {selectedState ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-8 text-center shadow-2xl border-2 border-purple-400 transform hover:scale-105 transition-all">
                    {loadingStateData ? (
                      <div className="flex justify-center items-center">
                        <RefreshCw className="w-12 h-12 text-white animate-spin" />
                      </div>
                    ) : (
                      <>
                        <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                          <FileCheck className="w-9 h-9 text-white" />
                        </div>
                        <p className="text-6xl font-bold text-white mb-3 drop-shadow-2xl">{statePatentCount}</p>
                        <p className="text-lg font-semibold text-white/90 uppercase tracking-wide drop-shadow-lg">
                          {statePatentCount === 1 ? 'Patent' : 'Patents'}
                        </p>
                        <p className="text-sm text-white/80 mt-2 font-medium">
                          from {selectedState}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="bg-white rounded-xl p-4 border-2 border-purple-200 shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-semibold text-gray-700">Data Source</span>
                      </div>
                      <span className="text-xs font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                        PostgreSQL Database
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-8 text-center border-2 border-purple-200">
                  <Globe className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-600 font-medium">
                    Select a state or UT from the dropdown to view patent count
                  </p>
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

              {userStats.totalUsers === 0 ? (
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
                  {/* Bar Chart */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-inner border border-blue-100">
                    <h4 className="text-lg font-bold text-gray-800 mb-4 text-center flex items-center justify-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
                      User Distribution Overview
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 animate-pulse"></div>
                    </h4>
                    <div className="h-[450px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              category: 'Total',
                              value: userStats.totalUsers,
                              color: '#6366f1'
                            },
                            {
                              category: 'Basic',
                              value: userStats.basicUsers,
                              color: '#94a3b8'
                            },
                            {
                              category: 'Pro',
                              value: userStats.proUsers,
                              color: '#3b82f6'
                            },
                            {
                              category: 'Enterprise',
                              value: userStats.enterpriseUsers,
                              color: '#a855f7'
                            },
                            {
                              category: 'Active',
                              value: userStats.activeUsers,
                              color: '#10b981'
                            }
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <defs>
                            <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.7} />
                            </linearGradient>
                            <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#64748b" stopOpacity={0.7} />
                            </linearGradient>
                            <linearGradient id="barGradient3" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.7} />
                            </linearGradient>
                            <linearGradient id="barGradient4" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#9333ea" stopOpacity={0.7} />
                            </linearGradient>
                            <linearGradient id="barGradient5" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={2} />
                          <XAxis
                            dataKey="category"
                            tick={{ fill: '#1e293b', fontSize: 13, fontWeight: 700 }}
                            angle={-15}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                            label={{ value: 'Number of Users', angle: -90, position: 'insideLeft', style: { fill: '#1e293b', fontWeight: 'bold' } }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.98)',
                              border: '3px solid #6366f1',
                              borderRadius: '16px',
                              padding: '16px',
                              boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)'
                            }}
                            labelStyle={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}
                            formatter={(value, name, props) => [
                              <span className="font-bold text-indigo-700 text-base">
                                {value} users
                                {props.payload.category !== 'Total' && userStats.totalUsers > 0
                                  ? ` (${Math.round((value / userStats.totalUsers) * 100)}%)`
                                  : ''
                                }
                              </span>,
                              props.payload.category
                            ]}
                          />
                          <Bar
                            dataKey="value"
                            radius={[12, 12, 0, 0]}
                            animationDuration={1500}
                            animationBegin={100}
                          >
                            {[
                              { color: 'url(#barGradient1)' },
                              { color: 'url(#barGradient2)' },
                              { color: 'url(#barGradient3)' },
                              { color: 'url(#barGradient4)' },
                              { color: 'url(#barGradient5)' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
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

                </div>
              )}
            </div>
          </div>

          {/* Revenue Analytics Section */}
          <div className="mb-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border-2 border-indigo-200">
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-800">Revenue Analytics</h2>
              </div>
            </div>

            {/* Revenue Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Subscription Revenue */}
              <div className="bg-gradient-to-br from-white via-indigo-50 to-purple-50 rounded-2xl shadow-xl p-5 border-2 border-indigo-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-indigo-700">Subscription Revenue</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-indigo-600">₹{subscriptionRevenue.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-600 font-medium">{subscriptionRevenue.byPlan.reduce((sum, p) => sum + p.count, 0)} users</p>
                  </div>
                </div>

                {loadingRevenue ? (
                  <div className="flex justify-center items-center h-40">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                  </div>
                ) : subscriptionRevenue.byPlan.length > 0 ? (
                  <div className="space-y-3">
                    {subscriptionRevenue.byPlan.map((plan) => {
                      const maxCount = Math.max(...subscriptionRevenue.byPlan.map(p => p.count));
                      const barWidth = maxCount > 0 ? (plan.count / maxCount) * 100 : 0;

                      // Color coding for different plans
                      const planColors = {
                        'Basic': {
                          bg: 'from-gray-400 to-gray-500',
                          text: 'text-gray-700',
                          icon: '🆓'
                        },
                        'Pro': {
                          bg: 'from-blue-400 to-cyan-500',
                          text: 'text-blue-700',
                          icon: '⭐'
                        },
                        'Enterprise': {
                          bg: 'from-purple-400 to-pink-500',
                          text: 'text-purple-700',
                          icon: '👑'
                        }
                      };

                      const colors = planColors[plan.planName] || planColors['Basic'];

                      return (
                        <div key={plan.planName} className="relative">
                          <div className="flex items-center justify-between mb-1 text-sm font-semibold">
                            <span className={colors.text}>{colors.icon} {plan.planName}</span>
                            <span className="text-gray-700">
                              {plan.amount > 0 ? `₹${plan.amount.toLocaleString()}` : 'Free'}
                            </span>
                          </div>
                          <div className="relative h-12 bg-white rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
                            <div
                              className={`h-full flex items-center justify-between px-3 transition-all duration-700 bg-gradient-to-r ${colors.bg}`}
                              style={{ width: `${Math.max(barWidth, 15)}%`, minWidth: '100px' }}
                            >
                              <span className="text-white font-bold text-sm drop-shadow-lg">{plan.count} user{plan.count !== 1 ? 's' : ''}</span>
                              {subscriptionRevenue.total > 0 && plan.amount > 0 && (
                                <span className="text-white font-bold drop-shadow-lg">
                                  {Math.round((plan.amount / subscriptionRevenue.total) * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No subscription data</p>
                  </div>
                )}
              </div>

              {/* Patent Filing Revenue */}
              <div className="bg-gradient-to-br from-white via-green-50 to-emerald-50 rounded-2xl shadow-xl p-5 border-2 border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 rounded-lg">
                      <FileCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-700">Patent Filing Revenue</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-600">₹{patentFilingRevenue.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-600 font-medium">{patentFilingRevenue.count} filing{patentFilingRevenue.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {loadingRevenue ? (
                  <div className="flex justify-center items-center h-40">
                    <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
                  </div>
                ) : patentFilingRevenue.count > 0 ? (
                  <div className="space-y-3">
                    {/* Single bar showing filing count with segments */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1 text-sm font-semibold">
                        <span className="text-green-700">Patent Filings</span>
                        <span className="text-gray-700">{patentFilingRevenue.count} × ₹500</span>
                      </div>
                      <div className="relative h-12 bg-white rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
                        <div
                          className="h-full flex items-center justify-between px-3 bg-gradient-to-r from-green-400 to-emerald-500"
                          style={{ width: '100%' }}
                        >
                          <span className="text-white font-bold text-sm drop-shadow-lg">{patentFilingRevenue.count} filing{patentFilingRevenue.count !== 1 ? 's' : ''}</span>
                          <span className="text-white font-bold drop-shadow-lg">₹{patentFilingRevenue.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-medium">Rate per filing:</span>
                        <span className="text-green-700 font-bold">₹500</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No patent filing revenue</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Feedback & Quality Metrics Section */}
          <div className="mb-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border-2 border-pink-200">
              <div className="flex items-center gap-3">
                <Info className="w-6 h-6 text-pink-600" />
                <h2 className="text-xl font-bold text-gray-800">User Feedback Analytics</h2>
              </div>
            </div>

            {/* FEEDBACK ANALYTICS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              </div>

              {/* Feedback Overview - Right Side (1/3 width) */}
              {feedbackStatus === 'success' && feedbackStats && (
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
              )}
            </div>

            {/* Recent User Feedback - Last 5 Feedbacks */}
            {feedbackStatus === 'success' && feedbackStats && allFeedbacks.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 shadow-lg border border-amber-100 mt-6">
                <h3 className="font-bold text-lg text-amber-900 mb-2">Last 5 User Feedbacks</h3>
                <p className="text-sm text-amber-700 mb-4 italic">
                  "Recent testimonials from IP professionals using our services."
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {allFeedbacks.slice(-5).reverse().map((feedback) => (
                    <div key={feedback.id} className="bg-white/70 rounded-lg p-4 border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-semibold text-amber-900 truncate">
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
            )}
          </div>

          {/* Patents Modal */}
          {showPatentsList && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowPatentsList(false)}>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[98vw] h-[95vh] flex flex-col border-4 border-indigo-300" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6 rounded-t-3xl flex-shrink-0 border-b-4 border-indigo-400">
                  {/* Header Top Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                        <List className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-white">Patent Management Dashboard</h2>
                        <p className="text-indigo-100 font-medium mt-1">Manage and review all patent applications</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPatentsList(false)}
                      className="group bg-white/10 hover:bg-red-500 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border-2 border-white/20 hover:border-red-400 hover:scale-110"
                    >
                      <X className="w-8 h-8 text-white group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>

                  {/* Quick Filters in Header - Compact */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">Filter:</span>
                      <button
                        onClick={() => setQuickFilter('all')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-300 ${quickFilter === 'all'
                          ? 'bg-white text-indigo-700 shadow-lg'
                          : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                          }`}
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        All
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${quickFilter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-white/20 text-white'
                          }`}>
                          {patents.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setQuickFilter('granted')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-300 ${quickFilter === 'granted'
                          ? 'bg-green-500 text-white shadow-lg'
                          : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                          }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Granted
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${quickFilter === 'granted' ? 'bg-white/30' : 'bg-white/20'
                          }`}>
                          {patents.filter(p => p.stage5Granted === true && p.status !== 'Patent is Rejected').length}
                        </span>
                      </button>

                      <button
                        onClick={() => setQuickFilter('rejected')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-300 ${quickFilter === 'rejected'
                          ? 'bg-red-500 text-white shadow-lg'
                          : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                          }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Rejected
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${quickFilter === 'rejected' ? 'bg-white/30' : 'bg-white/20'
                          }`}>
                          {patents.filter(p => p.status === 'Patent is Rejected').length}
                        </span>
                      </button>

                      <button
                        onClick={() => setQuickFilter('application')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-300 ${quickFilter === 'application'
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                          }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Application
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${quickFilter === 'application' ? 'bg-white/30' : 'bg-white/20'
                          }`}>
                          {patents.filter(p => p.stage5Granted !== true && p.status !== 'Patent is Rejected').length}
                        </span>
                      </button>

                      <button
                        onClick={() => setQuickFilter('deactivated')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-300 ${quickFilter === 'deactivated'
                          ? 'bg-gray-600 text-white shadow-lg'
                          : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                          }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Deactivated
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${quickFilter === 'deactivated' ? 'bg-white/30' : 'bg-white/20'
                          }`}>
                          {patents.filter(p => p.isActive === false).length}
                        </span>
                      </button>
                    </div>

                    {/* Status Info - Compact */}
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-sm font-semibold text-white">
                        <span className="text-white">{filteredPatents.length}</span> / <span className="text-indigo-100">{patents.length}</span> patents
                      </span>
                      {quickFilter !== 'all' && (
                        <span className="px-2 py-0.5 rounded-full font-bold text-xs bg-white/30 text-white">
                          {quickFilter === 'granted' && 'Granted'}
                          {quickFilter === 'rejected' && 'Rejected'}
                          {quickFilter === 'application' && 'Application'}
                          {quickFilter === 'deactivated' && 'Deactivated'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Patents List Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-indigo-50">
                  {loading && patents.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading patents...</p>
                    </div>
                  ) : filteredPatents.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                      <p className="text-gray-600 text-lg">
                        {searchQuery
                          ? 'No patents found matching your search.'
                          : quickFilter === 'granted'
                            ? 'No granted patents found.'
                            : quickFilter === 'non-granted'
                              ? 'No non-granted patents found.'
                              : 'No patents found in the system.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        {currentPatents.map((patent) => (
                          <div key={patent.id} className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-2xl p-8 border-2 border-indigo-100 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
                            {/* Header Section */}
                            <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-indigo-200">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
                                    <CheckCircle className="w-6 h-6 text-white" />
                                  </div>
                                  <h3 className="text-2xl font-bold text-gray-900">
                                    {patent.inventionTitle || 'Untitled Patent'}
                                  </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                                  <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg shadow-sm">
                                    <span className="text-gray-600 block mb-1 font-semibold">Applicant:</span>
                                    <span className="font-bold text-gray-900">{patent.applicantName}</span>
                                  </div>
                                  <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg shadow-sm">
                                    <span className="text-gray-600 block mb-1 font-semibold">Email:</span>
                                    <span className="font-bold text-blue-600">{patent.applicantEmail}</span>
                                  </div>
                                  <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg shadow-sm">
                                    <span className="text-gray-600 block mb-1 font-semibold">Filing ID:</span>
                                    <span className="font-mono font-bold text-gray-900">#{patent.id}</span>
                                  </div>
                                  <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg shadow-sm">
                                    <span className="text-gray-600 block mb-1 font-semibold">Status:</span>
                                    <span className={`font-bold px-3 py-1 rounded-full inline-block ${patent.status === 'Granted' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                      }`}>
                                      {patent.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Additional Patent Details Fields - Only shown when details are being filled */}
                            {showDetailsFor[patent.id] && (
                              <div className={`mb-6 p-6 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border-2 ${formType[patent.id] === 'reject' ? 'border-red-300' : 'border-indigo-300'} animate-fadeIn`}>
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Shield className={`w-5 h-5 ${formType[patent.id] === 'reject' ? 'text-red-600' : 'text-indigo-600'}`} />
                                    {formType[patent.id] === 'reject' ? 'Rejection Details' : 'Patent Details'}
                                    <span className="text-sm text-red-600">
                                      (Required for {formType[patent.id] === 'reject' ? 'rejecting' : 'granting'} patent)
                                    </span>
                                  </h4>
                                  <button
                                    onClick={() => {
                                      setShowDetailsFor({
                                        ...showDetailsFor,
                                        [patent.id]: false
                                      });
                                      setFormType({
                                        ...formType,
                                        [patent.id]: null
                                      });
                                    }}
                                    className="text-gray-500 hover:text-gray-700 transition-colors"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {formType[patent.id] === 'grant' && (
                                    <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Patent Number <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={patentDetails[patent.id]?.patentNumber || ''}
                                        onChange={(e) => setPatentDetails({
                                          ...patentDetails,
                                          [patent.id]: { ...patentDetails[patent.id], patentNumber: e.target.value }
                                        })}
                                        placeholder="Enter patent number"
                                        className="w-full px-4 py-2.5 bg-white border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 font-medium placeholder:text-gray-400 shadow-sm"
                                      />
                                    </div>
                                  )}

                                  {formType[patent.id] === 'reject' && (
                                    <>
                                      <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                          Rejected Patent Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          type="text"
                                          value={patentDetails[patent.id]?.rejectedPatentNumber || ''}
                                          onChange={(e) => setPatentDetails({
                                            ...patentDetails,
                                            [patent.id]: { ...patentDetails[patent.id], rejectedPatentNumber: e.target.value }
                                          })}
                                          placeholder="Enter rejected patent number"
                                          className="w-full px-4 py-2.5 bg-white border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 font-medium placeholder:text-gray-400 shadow-sm"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                          Rejected Patent Person Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          type="text"
                                          value={patentDetails[patent.id]?.rejectedPersonName || ''}
                                          onChange={(e) => setPatentDetails({
                                            ...patentDetails,
                                            [patent.id]: { ...patentDetails[patent.id], rejectedPersonName: e.target.value }
                                          })}
                                          placeholder="Enter person name"
                                          className="w-full px-4 py-2.5 bg-white border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 font-medium placeholder:text-gray-400 shadow-sm"
                                        />
                                      </div>
                                    </>
                                  )}

                                  {formType[patent.id] === 'grant' && (
                                    <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Granted Patent Person Name <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={patentDetails[patent.id]?.grantedPersonName || ''}
                                        onChange={(e) => setPatentDetails({
                                          ...patentDetails,
                                          [patent.id]: { ...patentDetails[patent.id], grantedPersonName: e.target.value }
                                        })}
                                        placeholder="Enter person name"
                                        className="w-full px-4 py-2.5 bg-white border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900 font-medium placeholder:text-gray-400 shadow-sm"
                                      />
                                    </div>
                                  )}

                                  <div className={formType[patent.id] === 'grant' ? 'md:col-span-2' : ''}>                          <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Location <span className="text-red-500">*</span>
                                  </label>
                                    <input
                                      type="text"
                                      value={patentDetails[patent.id]?.location || ''}
                                      onChange={(e) => setPatentDetails({
                                        ...patentDetails,
                                        [patent.id]: { ...patentDetails[patent.id], location: e.target.value }
                                      })}
                                      placeholder={`Enter location where patent was ${formType[patent.id] === 'reject' ? 'rejected' : 'granted'}`}
                                      className="w-full px-4 py-2.5 bg-white border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 font-medium placeholder:text-gray-400 shadow-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Stages */}
                            <div className="border-t-2 border-indigo-200 pt-6 mb-6">
                              <h4 className="font-bold text-gray-800 mb-4 text-lg">Patent Stages:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
                                {[
                                  { key: 'stage1Filed', label: '1. Filed', name: 'stage1Filed' },
                                  { key: 'stage2AdminReview', label: '2. Admin Review', name: 'stage2AdminReview' },
                                  { key: 'stage3TechnicalReview', label: '3. Technical', name: 'stage3TechnicalReview' },
                                  { key: 'stage4Verification', label: '4. Verification', name: 'stage4Verification' },
                                ].map((stage) => (
                                  <button
                                    key={stage.key}
                                    onClick={() => !patent.stage5Granted && patent.status !== 'Patent is Rejected' && patent.isActive !== false && updateStage(patent.id, stage.name, !patent[stage.key])}
                                    disabled={patent.stage5Granted || patent.status === 'Patent is Rejected' || patent.isActive === false}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all transform shadow-md ${patent.stage5Granted || patent.status === 'Patent is Rejected'
                                      ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-500 text-green-800 shadow-green-200 cursor-not-allowed opacity-75'
                                      : patent.isActive === false
                                        ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-400 text-gray-500 cursor-not-allowed opacity-60'
                                        : patent[stage.key]
                                          ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-500 text-green-800 shadow-green-200 hover:scale-105'
                                          : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 hover:scale-105'
                                      }`}
                                  >
                                    {patent[stage.key] ? (
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-gray-400" />
                                    )}
                                    <span className="text-sm font-bold whitespace-nowrap">{stage.label}</span>
                                  </button>
                                ))}

                                {/* Stage 5: Grant & Send Email Button */}
                                {patent.status !== 'Patent is Rejected' && (
                                  <button
                                    onClick={() => grantAllStages(patent)}
                                    disabled={patent.stage5Granted || patent.isActive === false}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 transform shadow-2xl font-bold ${patent.stage5Granted
                                      ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-500 text-green-800 shadow-green-300 cursor-not-allowed opacity-75'
                                      : patent.isActive === false
                                        ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-400 text-gray-500 cursor-not-allowed opacity-60'
                                        : 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 text-white border-emerald-400 hover:from-emerald-600 hover:via-green-600 hover:to-teal-700 hover:scale-110 hover:shadow-emerald-400/50 active:scale-95 animate-pulse-slow'
                                      }`}
                                    style={!patent.stage5Granted && patent.isActive !== false ? {
                                      boxShadow: '0 10px 40px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.3)',
                                    } : {}}
                                  >
                                    {patent.stage5Granted ? (
                                      <>
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-sm font-bold whitespace-nowrap">5. Granted</span>
                                      </>
                                    ) : (
                                      <>
                                        <Mail className="w-5 h-5 animate-bounce" />
                                        <span className="text-sm font-extrabold tracking-wide whitespace-nowrap">5. Grant & Send Email</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Show Rejected Status */}
                                {patent.status === 'Patent is Rejected' && (
                                  <div className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 bg-gradient-to-br from-red-50 to-rose-100 border-red-500 text-red-800 shadow-red-300">
                                    <X className="w-5 h-5 text-red-600" />
                                    <span className="text-sm font-bold whitespace-nowrap">Patent is Rejected</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className={`grid grid-cols-1 ${patent.status === 'Patent is Rejected' ? 'md:grid-cols-4' : patent.stage5Granted ? 'md:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-5'} gap-3 pt-6 border-t-2 border-indigo-200`}>
                              {/* Activate/Deactivate Button */}
                              {patent.isActive === false ? (
                                <button
                                  onClick={() => activatePatent(patent.id)}
                                  className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                  Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => deactivatePatent(patent.id)}
                                  className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                                >
                                  <X className="w-5 h-5" />
                                  Deactivate
                                </button>
                              )}

                              <button
                                onClick={() => setViewingPatentDetails(patent)}
                                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                              >
                                <Eye className="w-5 h-5" />
                                View Details
                              </button>

                              {!patent.stage5Granted && patent.status !== 'Patent is Rejected' && (
                                <button
                                  onClick={() => rejectPatent(patent)}
                                  disabled={patent.isActive === false}
                                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold shadow-lg transition-all transform ${patent.isActive === false
                                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-gray-200 cursor-not-allowed opacity-60'
                                    : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 hover:shadow-xl hover:-translate-y-1'
                                    }`}
                                >
                                  <X className="w-5 h-5" />
                                  Reject Patent
                                </button>
                              )}

                              <button
                                onClick={() => resetStages(patent.id)}
                                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-gray-400 to-gray-600 text-white rounded-xl hover:from-gray-500 hover:to-gray-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                              >
                                <RefreshCw className="w-5 h-5" />
                                Reset Stages
                              </button>

                              <button
                                onClick={() => openAdminChat(patent)}
                                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 relative"
                              >
                                <MessageCircle className="w-5 h-5" />
                                View Chat
                                {getUnreadMessagesCount(patent) > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse shadow-lg">
                                    {getUnreadMessagesCount(patent)}
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {filteredPatents.length > 0 && (
                        <div className="mt-8 flex flex-col items-center gap-4 pb-6">
                          {/* Pagination Buttons */}
                          <div className="flex items-center justify-center gap-2">
                            {/* Previous Button */}
                            <button
                              onClick={() => {
                                setCurrentPage(prev => Math.max(1, prev - 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              disabled={currentPage === 1}
                              className="px-4 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 hover:shadow-md disabled:hover:bg-white"
                            >
                              ← Previous
                            </button>

                            {/* Page Numbers */}
                            <div className="flex items-center gap-2">
                              {[...Array(totalPages)].map((_, index) => {
                                const pageNumber = index + 1;

                                // Show first page, last page, current page, and pages around current
                                if (
                                  pageNumber === 1 ||
                                  pageNumber === totalPages ||
                                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                                ) {
                                  return (
                                    <button
                                      key={pageNumber}
                                      onClick={() => {
                                        setCurrentPage(pageNumber);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      className={`w-10 h-10 rounded-lg font-bold transition-all duration-300 ${currentPage === pageNumber
                                        ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg scale-110'
                                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md'
                                        }`}
                                    >
                                      {pageNumber}
                                    </button>
                                  );
                                }
                                // Show ellipsis
                                if (
                                  pageNumber === currentPage - 2 ||
                                  pageNumber === currentPage + 2
                                ) {
                                  return (
                                    <span key={pageNumber} className="text-gray-400 font-bold">
                                      ...
                                    </span>
                                  );
                                }
                                return null;
                              })}
                            </div>

                            {/* Next Button */}
                            <button
                              onClick={() => {
                                setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              disabled={currentPage === totalPages}
                              className="px-4 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 hover:shadow-md disabled:hover:bg-white"
                            >
                              Next →
                            </button>
                          </div>

                          {/* Results Info */}
                          <div className="text-center text-sm text-gray-600 bg-white px-6 py-2 rounded-lg shadow-sm border border-gray-200">
                            Showing {startIndex + 1} - {Math.min(endIndex, filteredPatents.length)} of {filteredPatents.length} patent{filteredPatents.length !== 1 ? 's' : ''}
                            {quickFilter !== 'all' && (
                              <span className="ml-2 text-indigo-600 font-semibold">
                                ({quickFilter === 'granted' ? 'Granted' : 'Non-Granted'})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patent Details Modal */}
      {viewingPatentDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={() => setViewingPatentDetails(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header - Fixed */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-t-2xl flex items-center justify-between flex-shrink-0 z-10">
              <div>
                <h2 className="text-lg font-bold mb-1">Patent Full Details</h2>
                <p className="text-indigo-100 text-sm">Filing ID: #{viewingPatentDetails.id}</p>
              </div>
              <button
                onClick={() => setViewingPatentDetails(null)}
                className="text-white hover:text-red-300 hover:rotate-90 transition-all duration-300 transform hover:scale-110"
                aria-label="Close"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Step 1: Applicant Information */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-5 border-2 border-cyan-200">
                <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <User className="w-6 h-6 text-cyan-600" />
                  Step 1: Applicant Information
                </h3>

                {/* Basic Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Applicant Type</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.applicantType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Full Name</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.applicantName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Email Address</label>
                    <p className="text-blue-600 font-bold mt-1 break-all">{viewingPatentDetails.applicantEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Phone Number</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.applicantPhone || viewingPatentDetails.phoneNumber || 'N/A'}</p>
                  </div>
                  {viewingPatentDetails.organizationName && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Organization Name</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.organizationName}</p>
                    </div>
                  )}
                </div>

                {/* Personal Details */}
                {viewingPatentDetails.applicantType === 'individual' && (
                  <div className="border-t-2 border-cyan-300 pt-4 mt-4">
                    <h4 className="text-md font-bold text-gray-800 mb-3">Personal Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Date of Birth</label>
                        <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.dateOfBirth ? new Date(viewingPatentDetails.dateOfBirth).toLocaleDateString() : 'Not Provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Age</label>
                        <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.age || 'Not Provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Gender</label>
                        <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.gender || 'Not Provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Occupation/Profession</label>
                        <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.occupation || 'Not Provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Educational Qualification</label>
                        <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.educationalQualification || 'Not Provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Designation/Position</label>
                        <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.designation || 'Not Provided'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address Information */}
                <div className="border-t-2 border-cyan-300 pt-4 mt-4">
                  <h4 className="text-md font-bold text-gray-800 mb-3">Address Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-600">Address</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.applicantAddress || viewingPatentDetails.address || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">City</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.applicantCity || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">State</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.applicantState || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Pincode</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.applicantPincode || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Country</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.applicantCountry || viewingPatentDetails.nationality || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Contact Information */}
                <div className="border-t-2 border-cyan-300 pt-4 mt-4">
                  <h4 className="text-md font-bold text-gray-800 mb-3">Additional Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Alternate Phone Number</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.alternatePhone || 'Not Provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Alternate Email Address</label>
                      <p className="text-blue-600 font-bold mt-1 break-all">{viewingPatentDetails.alternateEmail || 'Not Provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Identity & Tax Information */}
                <div className="border-t-2 border-cyan-300 pt-4 mt-4">
                  <h4 className="text-md font-bold text-gray-800 mb-3">Identity & Tax Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Government ID Type *</label>
                      <p className="text-gray-900 font-bold mt-1 capitalize">{viewingPatentDetails.govtIdType || 'Not Provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Government ID Number *</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.govtIdNumber || 'Not Provided'}</p>
                    </div>
                    {viewingPatentDetails.govtIdType === 'passport' && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Passport Country</label>
                        <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.passportCountry || 'Not Provided'}</p>
                      </div>
                    )}
                    {viewingPatentDetails.govtIdType === 'drivingLicense' && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Driving License State</label>
                        <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.drivingLicenseState || 'Not Provided'}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Aadhaar Number</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.aadhaarNumber || 'Not Provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">PAN Number</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.panNumber || 'Not Provided'}</p>
                    </div>
                    {viewingPatentDetails.applicantType === 'organization' && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">GSTIN</label>
                        <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.gstin || 'Not Provided'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Correspondence Address */}
                <div className="border-t-2 border-cyan-300 pt-4 mt-4">
                  <h4 className="text-md font-bold text-gray-800 mb-3">Correspondence Address</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-600">Same as Applicant Address</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.sameAsApplicantAddress ? '✓ Yes' : '✗ No'}</p>
                    </div>
                    {!viewingPatentDetails.sameAsApplicantAddress && (
                      <>
                        <div className="md:col-span-2">
                          <label className="text-sm font-semibold text-gray-600">Correspondence Address</label>
                          <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.correspondenceAddress || 'Not Provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">City</label>
                          <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.correspondenceCity || 'Not Provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">State</label>
                          <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.correspondenceState || 'Not Provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Pincode</label>
                          <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.correspondencePincode || 'Not Provided'}</p>
                        </div>
                      </>
                    )}
                    {viewingPatentDetails.sameAsApplicantAddress && (
                      <div className="md:col-span-2">
                        <p className="text-gray-600 italic bg-blue-50 p-3 rounded-lg">ℹ️ Using the same address as applicant address</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Application Date */}
                <div className="border-t-2 border-cyan-300 pt-4 mt-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-4">
                    <label className="text-sm font-semibold text-gray-600">Application Submission Date *</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.applicationDate ? new Date(viewingPatentDetails.applicationDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Not Available'}</p>
                  </div>
                </div>
              </div>


              {/* Step 2: Invention Details */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200">
                <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Lightbulb className="w-6 h-6 text-purple-600" />
                  Step 2: Invention Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-600">Invention Title *</label>
                    <p className="text-gray-900 font-bold mt-1 text-lg">{viewingPatentDetails.inventionTitle || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Field of Invention *</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.inventionField || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Target Industry</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.targetIndustry || 'Not Provided'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-600">Detailed Description of Invention *</label>
                    <p className="text-gray-900 font-bold mt-1 whitespace-pre-wrap leading-relaxed">{viewingPatentDetails.inventionDescription || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-600">Keywords</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.keywords || 'Not Provided'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-600">Technical Problem Addressed *</label>
                    <p className="text-gray-900 font-bold mt-1 whitespace-pre-wrap">{viewingPatentDetails.technicalProblem || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-600">Proposed Solution *</label>
                    <p className="text-gray-900 font-bold mt-1 whitespace-pre-wrap">{viewingPatentDetails.proposedSolution || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-600">Advantages *</label>
                    <p className="text-gray-900 font-bold mt-1 whitespace-pre-wrap">{viewingPatentDetails.advantages || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-600">Prior Art</label>
                    <p className="text-gray-900 font-bold mt-1 whitespace-pre-wrap">{viewingPatentDetails.priorArt || 'Not Provided'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-600">Commercial Application</label>
                    <p className="text-gray-900 font-bold mt-1 whitespace-pre-wrap">{viewingPatentDetails.commercialApplication || 'Not Provided'}</p>
                  </div>
                </div>
              </div>

              {/* Step 3: Patent Details */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200">
                <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <FileCheck className="w-6 h-6 text-green-600" />
                  Step 3: Patent Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Patent Type *</label>
                    <p className="text-gray-900 font-bold mt-1 capitalize">{viewingPatentDetails.patentType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Filing Type *</label>
                    <p className="text-gray-900 font-bold mt-1 capitalize">{viewingPatentDetails.filingType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Number of Claims *</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.numberOfClaims || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Number of Drawings</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.numberOfDrawings !== null && viewingPatentDetails.numberOfDrawings !== undefined ? viewingPatentDetails.numberOfDrawings : 'Not Provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Claims Priority</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.claimsPriority ? '✓ Yes' : '✗ No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Priority Date</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.priorityDate ? new Date(viewingPatentDetails.priorityDate).toLocaleDateString() : 'Not Applicable'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-600">Priority Number</label>
                    <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.priorityNumber || 'Not Applicable'}</p>
                  </div>
                </div>
              </div>

              {/* Step 4: Documents Upload */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border-2 border-orange-200">
                <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Upload className="w-6 h-6 text-orange-600" />
                  Step 4: Documents Upload
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Description Document *</label>
                    {viewingPatentDetails.descriptionFileUrl ? (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border-2 border-orange-200">
                        <p className="text-blue-600 font-medium flex-1 break-all text-sm">
                          {viewingPatentDetails.descriptionFileUrl}
                        </p>
                        <a
                          href={viewingPatentDetails.descriptionFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </a>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic bg-gray-100 p-3 rounded-lg">No file provided</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Claims Document *</label>
                    {viewingPatentDetails.claimsFileUrl ? (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border-2 border-orange-200">
                        <p className="text-blue-600 font-medium flex-1 break-all text-sm">
                          {viewingPatentDetails.claimsFileUrl}
                        </p>
                        <a
                          href={viewingPatentDetails.claimsFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </a>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic bg-gray-100 p-3 rounded-lg">No file provided</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Abstract Document *</label>
                    {viewingPatentDetails.abstractFileUrl ? (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border-2 border-orange-200">
                        <p className="text-blue-600 font-medium flex-1 break-all text-sm">
                          {viewingPatentDetails.abstractFileUrl}
                        </p>
                        <a
                          href={viewingPatentDetails.abstractFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </a>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic bg-gray-100 p-3 rounded-lg">No file provided</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Drawings Document</label>
                    {viewingPatentDetails.drawingsFileUrl ? (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border-2 border-orange-200">
                        <p className="text-blue-600 font-medium flex-1 break-all text-sm">
                          {viewingPatentDetails.drawingsFileUrl}
                        </p>
                        <a
                          href={viewingPatentDetails.drawingsFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </a>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic bg-gray-100 p-3 rounded-lg">Not Provided</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 5: Review & Payment */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border-2 border-indigo-200">
                <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-indigo-600" />
                  Step 5: Review & Payment
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {viewingPatentDetails.paymentAmount && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Payment Amount</label>
                      <p className="text-gray-900 font-bold mt-1">
                        {viewingPatentDetails.paymentCurrency || 'INR'} {viewingPatentDetails.paymentAmount}
                      </p>
                    </div>
                  )}
                  {viewingPatentDetails.agreedToTerms !== undefined && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Agreed to Terms</label>
                      <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.agreedToTerms ? '✓ Yes' : '✗ No'}</p>
                    </div>
                  )}
                </div>

                {/* Payment Transaction Details */}
                {(viewingPatentDetails.paymentId || viewingPatentDetails.paymentOrderId || viewingPatentDetails.paymentStatus) && (
                  <div className="border-t-2 border-indigo-300 pt-4 mt-4">
                    <h4 className="text-md font-bold text-gray-800 mb-3">Payment Transaction Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {viewingPatentDetails.paymentId && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Payment ID</label>
                          <p className="text-gray-900 font-bold mt-1 break-all">{viewingPatentDetails.paymentId}</p>
                        </div>
                      )}
                      {viewingPatentDetails.paymentOrderId && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Payment Order ID</label>
                          <p className="text-gray-900 font-bold mt-1 break-all">{viewingPatentDetails.paymentOrderId}</p>
                        </div>
                      )}
                      {viewingPatentDetails.paymentStatus && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Payment Status</label>
                          <p className={`font-bold mt-1 inline-block px-3 py-1 rounded-full ${viewingPatentDetails.paymentStatus === 'completed' || viewingPatentDetails.paymentStatus === 'success'
                            ? 'bg-green-100 text-green-700'
                            : viewingPatentDetails.paymentStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                            }`}>
                            {viewingPatentDetails.paymentStatus}
                          </p>
                        </div>
                      )}
                      {viewingPatentDetails.paymentTimestamp && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Payment Timestamp</label>
                          <p className="text-gray-900 font-bold mt-1">{new Date(viewingPatentDetails.paymentTimestamp).toLocaleString()}</p>
                        </div>
                      )}
                      {viewingPatentDetails.paymentSignature && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-semibold text-gray-600">Payment Signature</label>
                          <p className="text-gray-900 font-mono text-xs mt-1 break-all bg-gray-100 p-2 rounded">{viewingPatentDetails.paymentSignature}</p>
                        </div>
                      )}
                      {viewingPatentDetails.paymentCurrency && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Payment Currency</label>
                          <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.paymentCurrency}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Account Information */}
              {(viewingPatentDetails.userId || viewingPatentDetails.userEmail || viewingPatentDetails.userName) && (
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-5 border-2 border-teal-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <User className="w-6 h-6 text-teal-600" />
                    User Account Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingPatentDetails.userId && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">User ID</label>
                        <p className="text-gray-900 font-bold mt-1 break-all">{viewingPatentDetails.userId}</p>
                      </div>
                    )}
                    {viewingPatentDetails.userEmail && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">User Email</label>
                        <p className="text-blue-600 font-bold mt-1 break-all">{viewingPatentDetails.userEmail}</p>
                      </div>
                    )}
                    {viewingPatentDetails.userName && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">User Name</label>
                        <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.userName}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Admin Processing Information */}
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-5 border-2 border-rose-200">
                <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-rose-600" />
                  Admin Processing Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Filing ID</label>
                    <p className="text-gray-900 font-bold mt-1">#{viewingPatentDetails.id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Current Status</label>
                    <p className={`font-bold mt-1 inline-block px-3 py-1 rounded-full ${viewingPatentDetails.status === 'Granted' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                      {viewingPatentDetails.status || 'Under Review'}
                    </p>
                  </div>
                </div>

                {/* Stage Progress */}
                <div className="border-t-2 border-rose-300 pt-4 mt-4">
                  <h4 className="text-md font-bold text-gray-800 mb-3">Stage Progress</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className={`p-3 rounded-lg text-center ${viewingPatentDetails.stage1Filed ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-gray-300'}`}>
                      <p className="text-xs font-semibold text-gray-600">Stage 1</p>
                      <p className="text-sm font-bold mt-1">Filed</p>
                      <p className="text-lg mt-1">{viewingPatentDetails.stage1Filed ? '✓' : '○'}</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${viewingPatentDetails.stage2AdminReview ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-gray-300'}`}>
                      <p className="text-xs font-semibold text-gray-600">Stage 2</p>
                      <p className="text-sm font-bold mt-1">Admin Review</p>
                      <p className="text-lg mt-1">{viewingPatentDetails.stage2AdminReview ? '✓' : '○'}</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${viewingPatentDetails.stage3TechnicalReview ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-gray-300'}`}>
                      <p className="text-xs font-semibold text-gray-600">Stage 3</p>
                      <p className="text-sm font-bold mt-1">Technical Review</p>
                      <p className="text-lg mt-1">{viewingPatentDetails.stage3TechnicalReview ? '✓' : '○'}</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${viewingPatentDetails.stage4Verification ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-gray-300'}`}>
                      <p className="text-xs font-semibold text-gray-600">Stage 4</p>
                      <p className="text-sm font-bold mt-1">Verification</p>
                      <p className="text-lg mt-1">{viewingPatentDetails.stage4Verification ? '✓' : '○'}</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${viewingPatentDetails.stage5Granted ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-gray-300'}`}>
                      <p className="text-xs font-semibold text-gray-600">Stage 5</p>
                      <p className="text-sm font-bold mt-1">Granted</p>
                      <p className="text-lg mt-1">{viewingPatentDetails.stage5Granted ? '✓' : '○'}</p>
                    </div>
                  </div>
                </div>

                {/* Patent Registration Details (filled by admin during grant) */}
                {patentDetails[viewingPatentDetails.id] && (
                  <div className="border-t-2 border-rose-300 pt-4 mt-4">
                    <h4 className="text-md font-bold text-gray-800 mb-3">Patent Registration Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {patentDetails[viewingPatentDetails.id]?.patentNumber && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Patent Number</label>
                          <p className="text-gray-900 font-bold mt-1">{patentDetails[viewingPatentDetails.id].patentNumber}</p>
                        </div>
                      )}
                      {patentDetails[viewingPatentDetails.id]?.grantedPersonName && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Granted to Person Name</label>
                          <p className="text-gray-900 font-bold mt-1">{patentDetails[viewingPatentDetails.id].grantedPersonName}</p>
                        </div>
                      )}
                      {patentDetails[viewingPatentDetails.id]?.location && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Grant/Reject Location</label>
                          <p className="text-gray-900 font-bold mt-1">{patentDetails[viewingPatentDetails.id].location}</p>
                        </div>
                      )}
                      {patentDetails[viewingPatentDetails.id]?.rejectedPatentNumber && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Rejected Patent Number</label>
                          <p className="text-gray-900 font-bold mt-1">{patentDetails[viewingPatentDetails.id].rejectedPatentNumber}</p>
                        </div>
                      )}
                      {patentDetails[viewingPatentDetails.id]?.rejectedPersonName && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Rejected Person Name</label>
                          <p className="text-gray-900 font-bold mt-1">{patentDetails[viewingPatentDetails.id].rejectedPersonName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dates & Timestamps */}
                <div className="border-t-2 border-rose-300 pt-4 mt-4">
                  <h4 className="text-md font-bold text-gray-800 mb-3">Dates & Timestamps</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingPatentDetails.filingDate && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Filing Date</label>
                        <p className="text-gray-900 font-bold mt-1">{new Date(viewingPatentDetails.filingDate).toLocaleString()}</p>
                      </div>
                    )}
                    {viewingPatentDetails.submittedAt && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Submitted At</label>
                        <p className="text-gray-900 font-bold mt-1">{new Date(viewingPatentDetails.submittedAt).toLocaleString()}</p>
                      </div>
                    )}
                    {viewingPatentDetails.createdAt && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Created At</label>
                        <p className="text-gray-900 font-bold mt-1">{new Date(viewingPatentDetails.createdAt).toLocaleString()}</p>
                      </div>
                    )}
                    {viewingPatentDetails.updatedAt && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Last Updated</label>
                        <p className="text-gray-900 font-bold mt-1">{new Date(viewingPatentDetails.updatedAt).toLocaleString()}</p>
                      </div>
                    )}
                    {viewingPatentDetails.grantedDate && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Granted Date</label>
                        <p className="text-gray-900 font-bold mt-1">{new Date(viewingPatentDetails.grantedDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {viewingPatentDetails.expiryDate && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Expiry Date</label>
                        <p className="text-gray-900 font-bold mt-1">{new Date(viewingPatentDetails.expiryDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {viewingPatentDetails.applicationNumber && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Application Number</label>
                        <p className="text-gray-900 font-bold mt-1">{viewingPatentDetails.applicationNumber}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Filing Status Information */}
                {viewingPatentDetails.filingStatus && (
                  <div className="border-t-2 border-rose-300 pt-4 mt-4">
                    <h4 className="text-md font-bold text-gray-800 mb-3">Filing Status Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Filing Status</label>
                        <p className={`font-bold mt-1 inline-block px-3 py-1 rounded-full ${viewingPatentDetails.filingStatus === 'approved' || viewingPatentDetails.filingStatus === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : viewingPatentDetails.filingStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : viewingPatentDetails.filingStatus === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                          {viewingPatentDetails.filingStatus}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {(viewingPatentDetails.notes || viewingPatentDetails.adminNotes) && (
                  <div className="border-t-2 border-rose-300 pt-4 mt-4">
                    <h4 className="text-md font-bold text-gray-800 mb-3">Notes & Comments</h4>
                    <div className="space-y-4">
                      {viewingPatentDetails.notes && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">General Notes</label>
                          <p className="text-gray-900 font-bold mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{viewingPatentDetails.notes}</p>
                        </div>
                      )}
                      {viewingPatentDetails.adminNotes && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Admin Notes</label>
                          <p className="text-gray-900 font-bold mt-1 whitespace-pre-wrap bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-500">{viewingPatentDetails.adminNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Admin Chat Modal */}
      {showAdminChat && selectedPatentForChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeAdminChat}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slideIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1">Admin Chat</h3>
                <p className="text-purple-100 text-sm">Patent: {selectedPatentForChat.inventionTitle}</p>
                <p className="text-purple-100 text-xs mt-1">Filing ID: #{selectedPatentForChat.id}</p>
              </div>
              <button
                onClick={closeAdminChat}
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
              {/* Display user messages and admin replies */}
              {['m1', 'm2', 'm3', 'm4', 'm5'].map((msgField, index) => {
                const userMessage = selectedPatentForChat[msgField];
                const replyField = `r${index + 1}`;
                const adminReplyMsg = selectedPatentForChat[replyField];

                return (
                  <div key={msgField}>
                    {/* User Message - LEFT side (from user) */}
                    {userMessage && userMessage.trim() !== '' && (
                      <div className="flex justify-start mb-3">
                        <div className="max-w-[75%] bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-tl-sm px-5 py-3 shadow-lg">
                          <p className="text-xs font-semibold mb-1 opacity-90">User Message {index + 1}</p>
                          <p className="text-sm leading-relaxed">{userMessage}</p>
                        </div>
                      </div>
                    )}

                    {/* Admin Reply - RIGHT side (from you) */}
                    {adminReplyMsg && adminReplyMsg.trim() !== '' && (
                      <div className="flex justify-end mb-3">
                        <div className="max-w-[75%] bg-gradient-to-r from-purple-100 to-pink-100 text-gray-800 rounded-2xl rounded-tr-sm px-5 py-3 shadow-md border border-purple-200">
                          <p className="text-xs font-semibold mb-1 text-purple-600">Admin Reply {index + 1}</p>
                          <p className="text-sm leading-relaxed">{adminReplyMsg}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* No messages */}
              {!['m1', 'm2', 'm3', 'm4', 'm5'].some(field => selectedPatentForChat[field] && selectedPatentForChat[field].trim() !== '') && (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No messages from user yet</p>
                </div>
              )}
            </div>

            {/* Reply Input Area */}
            <div className="bg-white p-6 rounded-b-2xl border-t-2 border-purple-100">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-gray-700">
                  Replies: {getReplyCount(selectedPatentForChat)}/4
                </span>
                {getReplyCount(selectedPatentForChat) >= 4 && (
                  <span className="text-xs text-red-600 font-medium">
                    Maximum replies reached
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendAdminReply();
                    }
                  }}
                  placeholder={getReplyCount(selectedPatentForChat) >= 4 ? "Maximum replies sent" : "Type your reply..."}
                  disabled={getReplyCount(selectedPatentForChat) >= 4}
                  className="flex-1 px-4 py-3 bg-gray-50 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-gray-900 font-medium placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={sendAdminReply}
                  disabled={!adminReply.trim() || getReplyCount(selectedPatentForChat) >= 4}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowLeaderboard(false)}>
          <div className="bg-gradient-to-br from-white via-amber-50 to-yellow-50 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col border-4 border-amber-300" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 px-8 py-6 rounded-t-3xl flex items-center justify-between flex-shrink-0 border-b-4 border-amber-400 relative overflow-hidden">
              {/* Animated background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-orange-400/20 animate-pulse"></div>

              <div className="flex items-center gap-4 relative z-10">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg animate-bounce">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white drop-shadow-lg">Admin Leaderboard</h2>
                  <p className="text-amber-100 font-medium mt-1 drop-shadow">🏆 Top 5 performing admins</p>
                </div>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="group bg-white/10 hover:bg-red-500 p-3 rounded-xl transition-all duration-300 backdrop-blur-sm border-2 border-white/20 hover:border-red-400 hover:scale-110"
              >
                <X className="w-8 h-8 text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Filter Buttons */}
            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 px-8 py-5 border-b-2 border-amber-200 flex-shrink-0">
              <div className="flex items-center gap-3 justify-center flex-wrap">
                <button
                  onClick={() => setLeaderboardFilter('granted')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all duration-300 transform ${leaderboardFilter === 'granted'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl scale-105 ring-4 ring-green-300'
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-500 hover:text-green-600 hover:scale-105 hover:shadow-lg'
                    }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  Patents Granted
                </button>

                <button
                  onClick={() => setLeaderboardFilter('rejected')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all duration-300 transform ${leaderboardFilter === 'rejected'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl scale-105 ring-4 ring-red-300'
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-red-500 hover:text-red-600 hover:scale-105 hover:shadow-lg'
                    }`}
                >
                  <X className="w-5 h-5" />
                  Patents Rejected
                </button>

                <button
                  onClick={() => setLeaderboardFilter('deactivated')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all duration-300 transform ${leaderboardFilter === 'deactivated'
                    ? 'bg-gradient-to-r from-gray-600 to-slate-700 text-white shadow-xl scale-105 ring-4 ring-gray-400'
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-500 hover:text-gray-600 hover:scale-105 hover:shadow-lg'
                    }`}
                >
                  <AlertCircle className="w-5 h-5" />
                  Patents Deactivated
                </button>

                <button
                  onClick={() => setLeaderboardFilter('activated')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all duration-300 transform ${leaderboardFilter === 'activated'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl scale-105 ring-4 ring-blue-300'
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 hover:scale-105 hover:shadow-lg'
                    }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  Patents Activated
                </button>
              </div>
            </div>

            {/* Leaderboard Content - Top 3 in Ladder Format */}
            <div className="flex-1 overflow-y-auto p-8">
              {leaderboardData.length === 0 ? (
                <div className="text-center py-20">
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                    <Trophy className="relative w-20 h-20 text-gray-400 mx-auto" />
                  </div>
                  <p className="text-gray-600 text-xl font-semibold mb-2">No leaderboard data available</p>
                  <p className="text-gray-500 text-sm">Patent actions will appear here once admins start processing patents</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Podium Display for Top 3 */}
                  <div className="flex items-end justify-center gap-4 max-w-5xl mx-auto">
                    {/* 2nd Place */}
                    {leaderboardData[1] && (
                      <div className="flex flex-col items-center w-64">
                        <div className="bg-gradient-to-br from-gray-300 to-gray-500 text-white rounded-xl p-5 shadow-2xl border-3 border-gray-600 w-full text-center transform hover:scale-105 transition-all ring-4 ring-gray-400/50">
                          <div className="bg-white/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ring-2 ring-white/40 shadow-lg">
                            <Medal className="w-9 h-9 text-white drop-shadow-md" />
                          </div>
                          <p className="text-3xl font-bold mb-2 drop-shadow-lg">🥈 2nd</p>
                          <p className="text-base font-bold mb-1 drop-shadow-md">{leaderboardData[1].adminName}</p>
                          <p className="text-xs opacity-95 truncate drop-shadow">{leaderboardData[1].email}</p>
                          <div className="mt-3 bg-white/30 rounded-lg p-3 backdrop-blur-sm shadow-inner">
                            <p className="text-2xl font-bold drop-shadow-lg">{leaderboardData[1][{
                              'granted': 'patentsGranted',
                              'rejected': 'patentsRejected',
                              'activated': 'patentsActivated',
                              'deactivated': 'patentsDeactivated'
                            }[leaderboardFilter]] || 0}</p>
                            <p className="text-xs uppercase mt-1 font-semibold tracking-wide drop-shadow">Patents</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 1st Place */}
                    {leaderboardData[0] && (
                      <div className="flex flex-col items-center w-72">
                        <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 text-white rounded-xl p-6 shadow-2xl border-3 border-yellow-700 w-full text-center transform hover:scale-105 transition-all relative ring-4 ring-yellow-400/60">
                          {/* Floating trophy */}
                          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-yellow-600 rounded-full p-3 shadow-xl animate-bounce ring-4 ring-yellow-400/50">
                            <Trophy className="w-7 h-7 text-white drop-shadow-md" />
                          </div>

                          {/* Sparkle effects */}
                          <div className="absolute top-3 right-3 text-white animate-pulse drop-shadow-lg">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <div className="absolute top-3 left-3 text-white animate-pulse drop-shadow-lg" style={{ animationDelay: '0.5s' }}>
                            <Sparkles className="w-5 h-5" />
                          </div>

                          <div className="bg-white/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 mt-3 ring-2 ring-white/40 shadow-lg">
                            <Award className="w-11 h-11 text-white drop-shadow-md" />
                          </div>
                          <p className="text-4xl font-bold mb-2 drop-shadow-xl">🥇 1st</p>
                          <p className="text-lg font-bold mb-2 drop-shadow-lg">{leaderboardData[0].adminName}</p>
                          <p className="text-sm opacity-95 truncate drop-shadow-md px-2">{leaderboardData[0].email}</p>
                          <div className="mt-4 bg-white/35 rounded-xl p-4 backdrop-blur-sm shadow-lg">
                            <p className="text-3xl font-bold drop-shadow-xl">{leaderboardData[0][{
                              'granted': 'patentsGranted',
                              'rejected': 'patentsRejected',
                              'activated': 'patentsActivated',
                              'deactivated': 'patentsDeactivated'
                            }[leaderboardFilter]] || 0}</p>
                            <p className="text-sm uppercase mt-1 font-semibold tracking-wider drop-shadow-md">Patents</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {leaderboardData[2] && (
                      <div className="flex flex-col items-center w-64">
                        <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-xl p-5 shadow-2xl border-3 border-orange-700 w-full text-center transform hover:scale-105 transition-all ring-4 ring-orange-400/50">
                          <div className="bg-white/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ring-2 ring-white/40 shadow-lg">
                            <Medal className="w-9 h-9 text-white drop-shadow-md" />
                          </div>
                          <p className="text-3xl font-bold mb-2 drop-shadow-lg">🥉 3rd</p>
                          <p className="text-base font-bold mb-1 drop-shadow-md">{leaderboardData[2].adminName}</p>
                          <p className="text-xs opacity-95 truncate drop-shadow">{leaderboardData[2].email}</p>
                          <div className="mt-3 bg-white/30 rounded-lg p-3 backdrop-blur-sm shadow-inner">
                            <p className="text-2xl font-bold drop-shadow-lg">{leaderboardData[2][{
                              'granted': 'patentsGranted',
                              'rejected': 'patentsRejected',
                              'activated': 'patentsActivated',
                              'deactivated': 'patentsDeactivated'
                            }[leaderboardFilter]] || 0}</p>
                            <p className="text-xs uppercase mt-1 font-semibold tracking-wide drop-shadow">Patents</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remaining Admins (4th and 5th) */}
                  {leaderboardData.length > 3 && (
                    <div className="mt-6 space-y-2">
                      <h3 className="text-lg font-bold text-gray-800 mb-3 text-center flex items-center justify-center gap-2">
                        <Award className="w-5 h-5 text-indigo-600" />
                        Other Top Performers
                        <Award className="w-5 h-5 text-indigo-600" />
                      </h3>
                      {leaderboardData.slice(3, 5).map((admin, index) => (
                        <div key={admin.adminId} className="bg-gradient-to-r from-white to-indigo-50 rounded-lg p-3 shadow-md border border-indigo-200 hover:border-indigo-400 hover:shadow-lg transition-all flex items-center justify-between transform hover:scale-[1.02]">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-base">
                              {index + 4}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-gray-800">{admin.adminName}</p>
                              <p className="text-xs text-gray-600 truncate">{admin.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-indigo-600">{admin[{
                              'granted': 'patentsGranted',
                              'rejected': 'patentsRejected',
                              'activated': 'patentsActivated',
                              'deactivated': 'patentsDeactivated'
                            }[leaderboardFilter]] || 0}</p>
                            <p className="text-xs text-gray-500 uppercase mt-0.5">Patents</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[320px] max-w-md p-4 rounded-xl shadow-2xl transform transition-all duration-500 animate-slide-in-right ${toast.type === 'success'
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
              : toast.type === 'error'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                : toast.type === 'warning'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
              }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                {toast.type === 'error' && <X className="w-5 h-5" />}
                {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                {toast.type === 'info' && <Bell className="w-5 h-5" />}
              </div>
              <p className="flex-1 font-semibold text-sm leading-relaxed">{toast.message}</p>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default AdminPatentManager;
