/**
 * Notification Management Utilities for Firestore
 * 
 * This module provides functions to manage user notifications in Firestore
 * - Stores the last 3 notifications per user
 * - Handles adding, fetching, and clearing notifications
 */

import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

/**
 * Fetch the last 3 notifications for a user
 * @param {string} userId - The user's UID
 * @returns {Promise<Array>} Array of notification objects
 */
export const fetchUserNotifications = async (userId) => {
  try {
    if (!userId) {
      console.warn('⚠️ No userId provided to fetchUserNotifications');
      return [];
    }

    console.log('📥 Fetching notifications for user:', userId);
    
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(3));
    
    const querySnapshot = await getDocs(q);
    const notifications = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
        timestamp: data.createdAt?.toDate ? 
          data.createdAt.toDate().toLocaleString() : 
          new Date().toLocaleString()
      });
    });
    
    console.log(`✅ Fetched ${notifications.length} notifications`);
    return notifications;
    
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return [];
  }
};

/**
 * Add a new notification for a user
 * Automatically maintains only the last 3 notifications
 * @param {string} userId - The user's UID
 * @param {Object} notification - The notification object {title, message, details}
 * @returns {Promise<Object|null>} The created notification object or null
 */
export const addUserNotification = async (userId, notification) => {
  try {
    if (!userId) {
      console.warn('⚠️ No userId provided to addUserNotification');
      return null;
    }

    console.log('➕ Adding notification for user:', userId);
    console.log('Notification data:', notification);
    
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    console.log('Firestore path:', `users/${userId}/notifications`);
    
    // Create notification document
    const notificationData = {
      title: notification.title || 'Notification',
      message: notification.message || '',
      details: notification.details || null,
      createdAt: serverTimestamp(),
      read: false
    };
    
    console.log('Notification document to save:', notificationData);
    
    const docRef = await addDoc(notificationsRef, notificationData);
    console.log('✅ Notification added with ID:', docRef.id);
    console.log('Full Firestore path:', `users/${userId}/notifications/${docRef.id}`);
    
    // Maintain only last 3 notifications - delete older ones
    await maintainNotificationLimit(userId);
    
    // Return the notification with ID
    return {
      id: docRef.id,
      ...notification,
      timestamp: new Date().toLocaleString()
    };
    
  } catch (error) {
    console.error('❌ Error adding notification:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return null;
  }
};

/**
 * Maintain only the last 3 notifications for a user
 * Deletes older notifications beyond the limit
 * @param {string} userId - The user's UID
 */
const maintainNotificationLimit = async (userId) => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const allDocs = [];
    
    querySnapshot.forEach((doc) => {
      allDocs.push(doc);
    });
    
    // If more than 3 notifications, delete the oldest ones
    if (allDocs.length > 3) {
      console.log(`🗑️ Deleting ${allDocs.length - 3} old notifications`);
      
      // Delete all notifications beyond the first 3
      const deletePromises = allDocs.slice(3).map((doc) => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
      console.log('✅ Old notifications deleted');
    }
    
  } catch (error) {
    console.error('❌ Error maintaining notification limit:', error);
  }
};

/**
 * Clear/delete a specific notification
 * @param {string} userId - The user's UID
 * @param {string} notificationId - The notification document ID
 * @returns {Promise<boolean>} Success status
 */
export const clearUserNotification = async (userId, notificationId) => {
  try {
    if (!userId || !notificationId) {
      console.warn('⚠️ Missing userId or notificationId for clearUserNotification');
      return false;
    }

    console.log('🗑️ Clearing notification:', notificationId, 'for user:', userId);
    
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await deleteDoc(notificationRef);
    
    console.log('✅ Notification cleared from Firestore');
    return true;
    
  } catch (error) {
    console.error('❌ Error clearing notification:', error);
    return false;
  }
};

/**
 * Clear all notifications for a user
 * @param {string} userId - The user's UID
 * @returns {Promise<boolean>} Success status
 */
export const clearAllUserNotifications = async (userId) => {
  try {
    if (!userId) {
      console.warn('⚠️ No userId provided to clearAllUserNotifications');
      return false;
    }

    console.log('🗑️ Clearing all notifications for user:', userId);
    
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const querySnapshot = await getDocs(notificationsRef);
    
    const deletePromises = [];
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    console.log(`✅ Cleared ${deletePromises.length} notifications`);
    return true;
    
  } catch (error) {
    console.error('❌ Error clearing all notifications:', error);
    return false;
  }
};
