import { doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Initialize search counters for a new user
 * @param {string} userId - The user's UID
 */
export const initializeSearchCounters = async (userId) => {
  try {
    const userSearchRef = doc(db, 'searchCounters', userId);
    const docSnap = await getDoc(userSearchRef);
    
    if (!docSnap.exists()) {
      await setDoc(userSearchRef, {
        apiSearchCount: 0,
        localSearchCount: 0,
        totalSearchCount: 0,
        createdAt: new Date(),
        lastUpdated: new Date()
      });
      console.log('✅ Search counters initialized for user:', userId);
    }
  } catch (error) {
    console.error('❌ Error initializing search counters:', error);
    throw error;
  }
};

/**
 * Get search counters for a user
 * @param {string} userId - The user's UID
 * @returns {Object} - Object containing apiSearchCount, localSearchCount, totalSearchCount
 */
export const getSearchCounters = async (userId) => {
  try {
    if (!userId) {
      console.warn('⚠️ No userId provided to getSearchCounters');
      return { apiSearchCount: 0, localSearchCount: 0, totalSearchCount: 0 };
    }

    const userSearchRef = doc(db, 'searchCounters', userId);
    const docSnap = await getDoc(userSearchRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        apiSearchCount: data.apiSearchCount || 0,
        localSearchCount: data.localSearchCount || 0,
        totalSearchCount: data.totalSearchCount || 0
      };
    } else {
      // Initialize if doesn't exist
      await initializeSearchCounters(userId);
      return { apiSearchCount: 0, localSearchCount: 0, totalSearchCount: 0 };
    }
  } catch (error) {
    console.error('❌ Error getting search counters:', error);
    return { apiSearchCount: 0, localSearchCount: 0, totalSearchCount: 0 };
  }
};

/**
 * Increment search counter for a specific mode
 * @param {string} userId - The user's UID
 * @param {string} searchMode - 'api' or 'local'
 */
export const incrementSearchCounter = async (userId, searchMode) => {
  try {
    if (!userId) {
      console.warn('⚠️ No userId provided to incrementSearchCounter');
      return;
    }

    const userSearchRef = doc(db, 'searchCounters', userId);
    const docSnap = await getDoc(userSearchRef);
    
    // Initialize if doesn't exist
    if (!docSnap.exists()) {
      await initializeSearchCounters(userId);
    }
    
    // Prepare the update fields
    const updateFields = {
      totalSearchCount: increment(1),
      lastUpdated: new Date()
    };
    
    if (searchMode === 'api') {
      updateFields.apiSearchCount = increment(1);
    } else if (searchMode === 'local') {
      updateFields.localSearchCount = increment(1);
    }
    
    // Update user counter
    await updateDoc(userSearchRef, updateFields);
    console.log(`✅ ${searchMode} search counter incremented for user:`, userId);
    
    // Also increment global counter
    await incrementGlobalSearchCounter(searchMode);
  } catch (error) {
    console.error('❌ Error incrementing search counter:', error);
    throw error;
  }
};

/**
 * Reset search counters for a user (admin function)
 * @param {string} userId - The user's UID
 */
export const resetSearchCounters = async (userId) => {
  try {
    if (!userId) {
      console.warn('⚠️ No userId provided to resetSearchCounters');
      return;
    }

    const userSearchRef = doc(db, 'searchCounters', userId);
    await setDoc(userSearchRef, {
      apiSearchCount: 0,
      localSearchCount: 0,
      totalSearchCount: 0,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
    
    console.log('✅ Search counters reset for user:', userId);
  } catch (error) {
    console.error('❌ Error resetting search counters:', error);
    throw error;
  }
};

/**
 * Get search statistics for all users (admin function)
 * @returns {Array} - Array of user search statistics
 */
export const getAllSearchCounters = async () => {
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const searchCountersRef = collection(db, 'searchCounters');
    const snapshot = await getDocs(searchCountersRef);
    
    const stats = [];
    snapshot.forEach((doc) => {
      stats.push({
        userId: doc.id,
        ...doc.data()
      });
    });
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting all search counters:', error);
    return [];
  }
};

/**
 * Get global search statistics (total across all users)
 * @returns {Object} - Object containing total apiSearchCount, localSearchCount, totalSearchCount
 */
export const getGlobalSearchStats = async () => {
  try {
    const globalCounterRef = doc(db, 'globalStats', 'searchCounter');
    const docSnap = await getDoc(globalCounterRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        apiSearchCount: data.apiSearchCount || 0,
        localSearchCount: data.localSearchCount || 0,
        totalSearchCount: data.totalSearchCount || 0,
        lastUpdated: data.lastUpdated
      };
    } else {
      // Initialize if doesn't exist
      await setDoc(globalCounterRef, {
        apiSearchCount: 0,
        localSearchCount: 0,
        totalSearchCount: 0,
        createdAt: new Date(),
        lastUpdated: new Date()
      });
      return {
        apiSearchCount: 0,
        localSearchCount: 0,
        totalSearchCount: 0
      };
    }
  } catch (error) {
    console.error('❌ Error getting global search stats:', error);
    return {
      apiSearchCount: 0,
      localSearchCount: 0,
      totalSearchCount: 0
    };
  }
};

/**
 * Increment global search counter
 * @param {string} searchMode - 'api' or 'local'
 */
export const incrementGlobalSearchCounter = async (searchMode) => {
  try {
    const globalCounterRef = doc(db, 'globalStats', 'searchCounter');
    const docSnap = await getDoc(globalCounterRef);
    
    // Initialize if doesn't exist
    if (!docSnap.exists()) {
      await setDoc(globalCounterRef, {
        apiSearchCount: 0,
        localSearchCount: 0,
        totalSearchCount: 0,
        createdAt: new Date(),
        lastUpdated: new Date()
      });
    }
    
    // Prepare the update fields
    const updateFields = {
      totalSearchCount: increment(1),
      lastUpdated: new Date()
    };
    
    if (searchMode === 'api') {
      updateFields.apiSearchCount = increment(1);
    } else if (searchMode === 'local') {
      updateFields.localSearchCount = increment(1);
    }
    
    await updateDoc(globalCounterRef, updateFields);
    console.log(`✅ Global ${searchMode} search counter incremented`);
  } catch (error) {
    console.error('❌ Error incrementing global search counter:', error);
    // Don't throw - we don't want to break the user's search if global counter fails
  }
};
