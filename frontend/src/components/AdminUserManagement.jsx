import React, { useState, useEffect } from 'react';
import { 
  Users, X, Mail, Lock, UserX, UserCheck, Ban, Shield, 
  Edit, CreditCard, Trash2, AlertTriangle, CheckCircle, 
  Search, Filter, RefreshCw, Eye, EyeOff, Calendar,
  Activity, DollarSign, Clock, ArrowLeft
} from 'lucide-react';
import { db, auth } from '../firebase';
import { addUserNotification } from '../utils/notifications';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { 
  sendPasswordResetEmail,
  updatePassword,
  getAuth
} from 'firebase/auth';

const AdminUserManagement = ({ onBack }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'week', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'verified', 'unverified', 'active', 'deactivated', 'suspended', 'banned'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [toasts, setToasts] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Fetch all users from Firebase
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by creation date (newest first)
      usersList.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      setUsers(usersList);
      setFilteredUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Failed to fetch users: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let filterStartDate = new Date();
      let filterEndDate = new Date();
      
      if (dateFilter === 'week') {
        filterStartDate.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        filterStartDate.setMonth(now.getMonth() - 1);
      } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
        filterStartDate = new Date(customStartDate);
        filterStartDate.setHours(0, 0, 0, 0);
        filterEndDate = new Date(customEndDate);
        filterEndDate.setHours(23, 59, 59, 999);
      } else if (dateFilter === 'custom') {
        // If custom is selected but dates not set, don't filter
        setFilteredUsers(filtered);
        setCurrentPage(1);
        return;
      }
      
      filtered = filtered.filter(user => {
        const userDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        if (dateFilter === 'custom') {
          return userDate >= filterStartDate && userDate <= filterEndDate;
        }
        return userDate >= filterStartDate;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'verified':
            return user.emailVerified === true;
          case 'unverified':
            return !user.emailVerified;
          case 'active':
            return user.accountStatus === 'active' || !user.accountStatus;
          case 'deactivated':
            return user.accountStatus === 'deactivated';
          case 'suspended':
            return user.accountStatus === 'suspended';
          case 'banned':
            return user.accountStatus === 'banned';
          default:
            return true;
        }
      });
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, dateFilter, customStartDate, customEndDate, statusFilter, users]);

  // Toast notification
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Confirm dialog
  const confirmActionDialog = (action, user) => {
    setConfirmAction(action);
    setSelectedUser(user);
    setShowConfirmDialog(true);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction || !selectedUser) return;

    setShowConfirmDialog(false);
    
    try {
      switch (confirmAction.type) {
        case 'resetPassword':
          await handleResetPassword(selectedUser);
          break;
        case 'deactivate':
          await handleDeactivateUser(selectedUser);
          break;
        case 'activate':
          await handleActivateUser(selectedUser);
          break;
        case 'ban':
          await handleBanUser(selectedUser);
          break;
        case 'unban':
          await handleUnbanUser(selectedUser);
          break;
        case 'suspend':
          await handleSuspendUser(selectedUser);
          break;
        case 'unsuspend':
          await handleUnsuspendUser(selectedUser);
          break;
        case 'cancelSubscription':
          await handleCancelSubscription(selectedUser);
          break;
        case 'deleteUser':
          await handleDeleteUser(selectedUser);
          break;
        case 'verifyEmail':
          await handleVerifyEmail(selectedUser);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error executing action:', error);
      showToast('Failed to execute action: ' + error.message, 'error');
    } finally {
      setConfirmAction(null);
      setSelectedUser(null);
    }
  };

  // Reset Password
  const handleResetPassword = async (user) => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      showToast(`Password reset email sent to ${user.email}`, 'success');
    } catch (error) {
      console.error('Error sending reset email:', error);
      showToast('Failed to send reset email: ' + error.message, 'error');
    }
  };

  // Deactivate User
  const handleDeactivateUser = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      const scheduledDeletion = new Date();
      scheduledDeletion.setDate(scheduledDeletion.getDate() + 30);
      
      await updateDoc(userRef, {
        accountStatus: 'deactivated',
        deactivatedAt: Timestamp.now(),
        scheduledDeletionDate: Timestamp.fromDate(scheduledDeletion),
        forceLogout: true // Flag to force logout the user
      });
      
      // Send notification to user about deactivation
      await addUserNotification(user.id, {
        title: '🚫 Account Deactivated',
        message: 'Your account has been deactivated by the admin. You have been logged out. If you do not login within 30 days, your account will be permanently deleted. Please contact support if you believe this is an error.',
        details: null
      });
      
      showToast(`User ${user.name} has been deactivated and logged out. Account will be deleted in 30 days if not reactivated.`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      showToast('Failed to deactivate user: ' + error.message, 'error');
    }
  };

  // Activate User
  const handleActivateUser = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        accountStatus: 'active',
        deactivatedAt: null,
        scheduledDeletionDate: null,
        bannedAt: null,
        forceLogout: false
      });
      
      showToast(`User ${user.name} has been activated`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error activating user:', error);
      showToast('Failed to activate user: ' + error.message, 'error');
    }
  };

  // Ban User
  const handleBanUser = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        accountStatus: 'banned',
        bannedAt: Timestamp.now(),
        banReason: 'Banned by admin'
      });
      
      showToast(`User ${user.name} has been banned`, 'warning');
      fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      showToast('Failed to ban user: ' + error.message, 'error');
    }
  };

  // Unban User
  const handleUnbanUser = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        accountStatus: 'active',
        bannedAt: null,
        banReason: null
      });
      
      showToast(`User ${user.name} has been unbanned`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      showToast('Failed to unban user: ' + error.message, 'error');
    }
  };

  // Suspend User
  const handleSuspendUser = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        accountStatus: 'suspended',
        suspendedAt: Timestamp.now(),
        suspendReason: 'Suspended by admin'
      });
      
      showToast(`User ${user.name} has been suspended`, 'warning');
      fetchUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      showToast('Failed to suspend user: ' + error.message, 'error');
    }
  };

  // Unsuspend User
  const handleUnsuspendUser = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        accountStatus: 'active',
        suspendedAt: null,
        suspendReason: null
      });
      
      showToast(`User ${user.name} has been unsuspended`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error unsuspending user:', error);
      showToast('Failed to unsuspend user: ' + error.message, 'error');
    }
  };

  // Cancel Subscription
  const handleCancelSubscription = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        subscriptionType: 'basic',
        subscriptionPlan: 'Basic',
        subscriptionStatus: 'cancelled',
        subscriptionEndDate: Timestamp.now(),
        localSearchCount: 0,
        apiSearchCount: 0
      });
      
      showToast(`Subscription cancelled for ${user.name}. Downgraded to Basic plan.`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      showToast('Failed to cancel subscription: ' + error.message, 'error');
    }
  };

  // Delete User
  const handleDeleteUser = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await deleteDoc(userRef);
      
      showToast(`User ${user.name} has been permanently deleted`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Failed to delete user: ' + error.message, 'error');
    }
  };

  // Verify Email
  const handleVerifyEmail = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        emailVerified: true
      });
      
      showToast(`Email verified for ${user.name || user.email}`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error verifying email:', error);
      showToast('Failed to verify email: ' + error.message, 'error');
    }
  };

  // Edit User
  const openEditModal = (user) => {
    setSelectedUser(user);
    const currentPlan = user.subscriptionType || user.subscriptionPlan || 'Basic';
    const normalizedPlan = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1).toLowerCase();
    
    // Capture all user fields from Firestore
    setEditFormData({
      firstName: user.firstName || user.name || user.displayName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      profilePicture: user.profilePicture || '',
      photoURL: user.photoURL || '',
      subscriptionPlan: normalizedPlan,
      subscriptionType: currentPlan.toLowerCase(),
      subscriptionStatus: user.subscriptionStatus || '',
      localSearchCount: user.localSearchCount || 0,
      apiSearchCount: user.apiSearchCount || 0,
      accountStatus: user.accountStatus || 'active',
      emailVerified: user.emailVerified || false,
      role: user.role || 'user',
      bio: user.bio || '',
      organization: user.organization || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      country: user.country || '',
      zipCode: user.zipCode || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, editFormData);
      
      showToast(`User ${editFormData.name} updated successfully`, 'success');
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Failed to update user: ' + error.message, 'error');
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      deactivated: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: UserX },
      banned: { color: 'bg-red-100 text-red-800 border-red-300', icon: Ban },
      suspended: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: AlertTriangle }
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status?.toUpperCase() || 'ACTIVE'}
      </span>
    );
  };

  // Get plan badge
  const getPlanBadge = (plan) => {
    // Normalize plan name (handle both 'pro' and 'Pro', 'basic' and 'Basic')
    const normalizedPlan = plan ? plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase() : 'Basic';
    
    const planConfig = {
      Basic: 'bg-gray-100 text-gray-800 border-gray-300',
      Pro: 'bg-blue-100 text-blue-800 border-blue-300',
      Enterprise: 'bg-purple-100 text-purple-800 border-purple-300'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${planConfig[normalizedPlan] || planConfig.Basic}`}>
        <CreditCard className="w-3 h-3" />
        {normalizedPlan}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="bg-white rounded-2xl shadow-xl p-5 border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                  <Users className="w-8 h-8 text-indigo-600" />
                  User Management
                </h1>
                <p className="text-gray-600 text-sm mt-1">Manage all user accounts and permissions</p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="group relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500/90 to-red-600/90 backdrop-blur-md text-white rounded-xl hover:from-red-600/95 hover:to-red-700/95 transition-all shadow-lg hover:shadow-2xl hover:scale-105 font-bold text-base border border-red-400/50 overflow-hidden"
            >
              {/* Animated background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <X className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Close User Management</span>
            </button>
          </div>

          {/* Search Only */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
            />
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-3 mt-4">
            <span className="text-sm font-semibold text-gray-700">Filter by join date:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  dateFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setDateFilter('week')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  dateFilter === 'week'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateFilter('month')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  dateFilter === 'month'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  dateFilter === 'custom'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-4 mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <label className="text-sm font-semibold text-gray-700">Start Date:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate || new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <label className="text-sm font-semibold text-gray-700">End Date:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium"
                />
              </div>
              {customStartDate && customEndDate && (
                <button
                  onClick={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm font-semibold"
                >
                  Clear Dates
                </button>
              )}
            </div>
          )}

          {/* Status Filters */}
          <div className="flex items-center gap-3 mt-4">
            <span className="text-sm font-semibold text-gray-700">Filter by status:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('verified')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  statusFilter === 'verified'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Email Verified
              </button>
              <button
                onClick={() => setStatusFilter('unverified')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  statusFilter === 'unverified'
                    ? 'bg-yellow-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Email Unverified
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  statusFilter === 'active'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('deactivated')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  statusFilter === 'deactivated'
                    ? 'bg-gray-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Deactivated
              </button>
              <button
                onClick={() => setStatusFilter('suspended')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  statusFilter === 'suspended'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Suspended
              </button>
              <button
                onClick={() => setStatusFilter('banned')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  statusFilter === 'banned'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Banned
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Cards */}
      <div className="max-w-7xl mx-auto space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border-2 border-indigo-100">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Users Found</h3>
            <p className="text-gray-500">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className="bg-white rounded-xl shadow-md p-3 border-2 border-indigo-100">
              <p className="text-sm text-gray-600">
                Showing <span className="font-bold text-indigo-600">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                <span className="font-bold text-indigo-600">
                  {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
                </span>{' '}
                of <span className="font-bold text-indigo-600">{filteredUsers.length}</span> users
              </p>
            </div>

            {/* User Cards for Current Page */}
            {filteredUsers
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-indigo-100 hover:border-indigo-300 overflow-hidden"
            >
              <div className="p-5 relative">
                {/* Warning Icon - Top Right */}
                <button
                  className="absolute top-4 right-4 p-2 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-all shadow-md hover:shadow-lg z-10"
                  title="Send Warning"
                  onClick={async () => {
                    try {
                      // Send warning notification to the user
                      await addUserNotification(user.id, {
                        title: '⚠️ Account Warning',
                        message: 'Your account is in danger. Strict action may be taken by the admin in future. Please review your activity and ensure compliance with our terms of service.',
                        details: null
                      });
                      showToast(`Warning notification sent to ${user.name || user.email}`, 'warning');
                    } catch (error) {
                      console.error('Error sending warning:', error);
                      showToast('Failed to send warning notification', 'error');
                    }
                  }}
                >
                  <AlertTriangle className="w-5 h-5" />
                </button>

                <div className="flex items-start justify-between mb-3 pr-12">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Avatar/Profile Picture */}
                    <div className="relative">
                      {user.profilePicture || user.photoURL ? (
                        <img 
                          src={user.profilePicture || user.photoURL} 
                          alt={user.name || user.displayName || 'User'} 
                          className="w-16 h-16 rounded-full object-cover shadow-lg ring-4 ring-indigo-100"
                          onError={(e) => {
                            // Fallback to initials if image fails to load
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                        style={{ display: (user.profilePicture || user.photoURL) ? 'none' : 'flex' }}
                      >
                        {(() => {
                          const name = user.name || user.displayName || user.email?.split('@')[0] || 'User';
                          const nameParts = name.trim().split(' ').filter(part => part.length > 0);
                          if (nameParts.length >= 2) {
                            return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
                          } else if (nameParts.length === 1) {
                            return nameParts[0].substring(0, 2).toUpperCase();
                          }
                          return 'U';
                        })()}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="text-xl font-bold text-gray-800">
                          {user.name || user.displayName || user.email?.split('@')[0] || 'Unnamed User'}
                        </h3>
                        {getStatusBadge(user.accountStatus || 'active')}
                        {getPlanBadge(user.subscriptionType || user.subscriptionPlan)}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Joined: {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons with Tooltips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-3 border-t border-gray-200">
                  {/* Reset Password */}
                  <button
                    onClick={() => confirmActionDialog({ type: 'resetPassword', title: 'Send Password Reset Email', message: `Send password reset email to ${user.email}?` }, user)}
                    className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold w-full"
                    title="Send password reset email"
                  >
                    <Mail className="w-4 h-4" />
                    Reset Password
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      📧 Send password reset email to user's inbox
                    </span>
                  </button>

                  {/* Verify Email - Only show if not verified */}
                  {!user.emailVerified && (
                    <button
                      onClick={() => confirmActionDialog({ type: 'verifyEmail', title: 'Verify Email', message: `Mark email as verified for ${user.email}?` }, user)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold w-full"
                      title="Verify user email"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Verify Email
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        ✅ Mark email as verified
                      </span>
                    </button>
                  )}

                  {/* Deactivate/Activate */}
                  {user.accountStatus === 'deactivated' ? (
                    <button
                      onClick={() => confirmActionDialog({ type: 'activate', title: 'Activate User', message: `Activate ${user.name || 'this user'}'s account?` }, user)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold w-full"
                      title="Activate user account"
                    >
                      <UserCheck className="w-4 h-4" />
                      Activate
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        ✅ Restore full account access
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => confirmActionDialog({ type: 'deactivate', title: 'Deactivate User', message: `Deactivate ${user.name || 'this user'}'s account? Account will be scheduled for deletion in 30 days.` }, user)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold w-full"
                      title="Deactivate user account"
                    >
                      <UserX className="w-4 h-4" />
                      Deactivate
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        ⏳ Schedule account for deletion in 30 days
                      </span>
                    </button>
                  )}

                  {/* Suspend/Unsuspend */}
                  {user.accountStatus === 'suspended' ? (
                    <button
                      onClick={() => confirmActionDialog({ type: 'unsuspend', title: 'Unsuspend User', message: `Unsuspend ${user.name || 'this user'}?` }, user)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold w-full"
                      title="Remove suspension"
                    >
                      <UserCheck className="w-4 h-4" />
                      Unsuspend
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        ✅ Remove suspension and restore access
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => confirmActionDialog({ type: 'suspend', title: 'Suspend User', message: `Suspend ${user.name || 'this user'}? User will be temporarily restricted.` }, user)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold w-full"
                      title="Suspend user temporarily"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Suspend
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        ⚠️ Temporarily suspend user access
                      </span>
                    </button>
                  )}

                  {/* Ban/Unban */}
                  {user.accountStatus === 'banned' ? (
                    <button
                      onClick={() => confirmActionDialog({ type: 'unban', title: 'Unban User', message: `Unban ${user.name || 'this user'}?` }, user)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold w-full"
                      title="Remove ban"
                    >
                      <UserCheck className="w-4 h-4" />
                      Unban
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        🔓 Remove ban and restore access
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => confirmActionDialog({ type: 'ban', title: 'Ban User', message: `Ban ${user.name || 'this user'}? This is a permanent action until unbanned.` }, user)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold w-full"
                      title="Ban user permanently"
                    >
                      <Ban className="w-4 h-4" />
                      Ban User
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        🚫 Permanently ban user until unbanned
                      </span>
                    </button>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(user)}
                    className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold w-full"
                    title="Edit user details"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Details
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      ✏️ Modify user information & settings
                    </span>
                  </button>

                  {/* Cancel Subscription */}
                  {((user.subscriptionType && user.subscriptionType.toLowerCase() !== 'basic') || (user.subscriptionPlan && user.subscriptionPlan !== 'Basic')) && (
                    <button
                      onClick={() => confirmActionDialog({ type: 'cancelSubscription', title: 'Cancel Subscription', message: `Cancel ${user.name || 'this user'}'s ${user.subscriptionType || user.subscriptionPlan} subscription? User will be downgraded to Basic plan.` }, user)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold w-full"
                      title="Cancel subscription"
                    >
                      <CreditCard className="w-4 h-4" />
                      Cancel Subscription
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        💳 Downgrade to Basic plan & reset limits
                      </span>
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => confirmActionDialog({ type: 'deleteUser', title: 'Delete User', message: `Permanently delete ${user.name || 'this user'}? This action cannot be undone!` }, user)}
                    className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg text-sm font-semibold w-full"
                    title="Delete user permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Users Data
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      🗑️ Permanently delete user data (irreversible)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {filteredUsers.length > itemsPerPage && (
            <div className="bg-white rounded-xl shadow-md p-4 border-2 border-indigo-100">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {Array.from(
                    { length: Math.ceil(filteredUsers.length / itemsPerPage) },
                    (_, i) => i + 1
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredUsers.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(filteredUsers.length / itemsPerPage)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    currentPage === Math.ceil(filteredUsers.length / itemsPerPage)
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                  }`}
                >
                  Next
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-2 border-red-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{confirmAction?.title}</h3>
                <p className="text-sm text-gray-600 mt-1">Confirm your action</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">{confirmAction?.message}</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg font-semibold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <Edit className="w-6 h-6 text-indigo-600" />
                Edit User Details
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">User ID</label>
                    <input
                      type="text"
                      value={selectedUser?.id || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-gray-600"
                      disabled
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      value={editFormData.firstName}
                      onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter user first name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Email (Locked)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={editFormData.email}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                        disabled
                      />
                      <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={editFormData.phoneNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Account Created</label>
                    <input
                      type="text"
                      value={formatDate(selectedUser?.createdAt)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-gray-600"
                      disabled
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Picture URL</label>
                    <input
                      type="url"
                      value={editFormData.profilePicture}
                      onChange={(e) => setEditFormData({ ...editFormData, profilePicture: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="https://example.com/profile.jpg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Photo URL (Alternative)</label>
                    <input
                      type="url"
                      value={editFormData.photoURL}
                      onChange={(e) => setEditFormData({ ...editFormData, photoURL: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={editFormData.bio}
                      onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows="3"
                      placeholder="User biography..."
                    />
                  </div>
                </div>
              </div>

              {/* Account & Subscription */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Account & Subscription
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subscription Plan</label>
                    <select
                      value={editFormData.subscriptionPlan}
                      onChange={(e) => {
                        const plan = e.target.value;
                        setEditFormData({ 
                          ...editFormData, 
                          subscriptionPlan: plan,
                          subscriptionType: plan.toLowerCase()
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Pro">Pro</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subscription Status</label>
                    <input
                      type="text"
                      value={editFormData.subscriptionStatus}
                      onChange={(e) => setEditFormData({ ...editFormData, subscriptionStatus: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="active, cancelled, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Account Status</label>
                    <select
                      value={editFormData.accountStatus}
                      onChange={(e) => setEditFormData({ ...editFormData, accountStatus: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="deactivated">Deactivated</option>
                      <option value="suspended">Suspended</option>
                      <option value="banned">Banned</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                    <select
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      Email Verified
                      <input
                        type="checkbox"
                        checked={editFormData.emailVerified}
                        onChange={(e) => setEditFormData({ ...editFormData, emailVerified: e.target.checked })}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Search Limits */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  Search Limits & Usage
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Local Search Count</label>
                    <input
                      type="number"
                      value={editFormData.localSearchCount}
                      onChange={(e) => setEditFormData({ ...editFormData, localSearchCount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">API Search Count</label>
                    <input
                      type="number"
                      value={editFormData.apiSearchCount}
                      onChange={(e) => setEditFormData({ ...editFormData, apiSearchCount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Organization & Location */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Organization & Location
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Organization</label>
                    <input
                      type="text"
                      value={editFormData.organization}
                      onChange={(e) => setEditFormData({ ...editFormData, organization: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Company/Organization name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Street address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">State/Province</label>
                    <input
                      type="text"
                      value={editFormData.state}
                      onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      value={editFormData.country}
                      onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ZIP/Postal Code</label>
                    <input
                      type="text"
                      value={editFormData.zipCode}
                      onChange={(e) => setEditFormData({ ...editFormData, zipCode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[320px] max-w-md p-4 rounded-xl shadow-2xl transform transition-all duration-500 animate-slide-in-right ${
              toast.type === 'success'
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
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {toast.type === 'info' && <Shield className="w-5 h-5" />}
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

export default AdminUserManagement;
