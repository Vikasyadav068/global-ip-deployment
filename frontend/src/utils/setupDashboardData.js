// Setup script to add dashboard data to Firestore
// Run this in browser console or create a setup page

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const setupDashboardData = async (userId) => {
  try {
    const dashboardData = {
      portfolioValue: '$1.2M',
      portfolioGrowth: 'Up 7.5% this quarter',
      activeSubscriptions: 12,
      recentFilings: 45,
      openAlerts: 3,
      lastUpdated: new Date().toISOString()
    };

    await setDoc(doc(db, 'dashboardData', userId), dashboardData);
    console.log('✅ Dashboard data setup complete!');
    return true;
  } catch (error) {
    console.error('❌ Error setting up dashboard data:', error);
    return false;
  }
};

// Example usage in console:
// import { setupDashboardData } from './utils/setupDashboardData';
// setupDashboardData('YOUR_USER_ID');
