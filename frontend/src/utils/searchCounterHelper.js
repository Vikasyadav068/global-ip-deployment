/**
 * Search Counter Helper - Utility functions to update Firestore search statistics
 * 
 * Import this file in your search components and call the appropriate function
 * whenever a search is performed.
 */

import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Increment the local database search counter
 * Call this function when user performs a search in local database mode
 */
export const incrementLocalSearchCount = async () => {
  try {
    await updateDoc(doc(db, 'globalStats', 'searchCounter'), {
      localSearchCount: increment(1),
      totalSearchCount: increment(1),
      lastUpdated: serverTimestamp()
    });
    console.log('Local search count incremented');
  } catch (error) {
    console.error('Error incrementing local search count:', error);
  }
};

/**
 * Increment the external API search counter
 * Call this function when user performs a search via external API
 */
export const incrementApiSearchCount = async () => {
  try {
    await updateDoc(doc(db, 'globalStats', 'searchCounter'), {
      apiSearchCount: increment(1),
      totalSearchCount: increment(1),
      lastUpdated: serverTimestamp()
    });
    console.log('API search count incremented');
  } catch (error) {
    console.error('Error incrementing API search count:', error);
  }
};

/**
 * Example usage in your search component:
 * 
 * import { incrementLocalSearchCount, incrementApiSearchCount } from '../utils/searchCounterHelper';
 * 
 * // In your local database search function:
 * const handleLocalSearch = async (searchTerm) => {
 *   try {
 *     // Your existing search logic here
 *     const results = await searchLocalDatabase(searchTerm);
 *     
 *     // Increment counter after successful search
 *     await incrementLocalSearchCount();
 *     
 *     return results;
 *   } catch (error) {
 *     console.error('Search error:', error);
 *   }
 * };
 * 
 * // In your external API search function:
 * const handleApiSearch = async (searchTerm) => {
 *   try {
 *     // Your existing API search logic here
 *     const results = await searchExternalApi(searchTerm);
 *     
 *     // Increment counter after successful search
 *     await incrementApiSearchCount();
 *     
 *     return results;
 *   } catch (error) {
 *     console.error('Search error:', error);
 *   }
 * };
 */
