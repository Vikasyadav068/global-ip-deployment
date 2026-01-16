package com.example.backend.service;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.google.firebase.cloud.FirestoreClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Service
public class FirebaseUserManagementService {
    
    private static final Logger logger = LoggerFactory.getLogger(FirebaseUserManagementService.class);
    
    private boolean isFirebaseInitialized() {
        try {
            return FirebaseAuth.getInstance() != null;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Deactivate a user account
     * - Disables the account in Firebase Auth
     * - Updates Firestore with deactivated status and schedules deletion
     * - User data remains intact but cannot log in
     */
    public Map<String, Object> deactivateUser(String userId) {
        Map<String, Object> result = new HashMap<>();
        
        if (!isFirebaseInitialized()) {
            result.put("success", false);
            result.put("message", "Firebase is not initialized. Please configure firebase-service-account.json");
            return result;
        }
        
        try {
            // Disable user in Firebase Authentication
            UserRecord.UpdateRequest request = new UserRecord.UpdateRequest(userId)
                .setDisabled(true);
            
            FirebaseAuth.getInstance().updateUser(request);
            logger.info("✅ User {} disabled in Firebase Auth", userId);
            
            // Update Firestore document
            Firestore firestore = FirestoreClient.getFirestore();
            DocumentReference userRef = firestore.collection("users").document(userId);
            
            Map<String, Object> updates = new HashMap<>();
            updates.put("accountStatus", "deactivated");
            updates.put("deactivatedAt", com.google.cloud.Timestamp.now());
            updates.put("forceLogout", true);
            
            // Schedule deletion in 30 days
            long thirtyDaysInMillis = 30L * 24 * 60 * 60 * 1000;
            com.google.cloud.Timestamp scheduledDeletion = com.google.cloud.Timestamp.ofTimeMicroseconds(
                (System.currentTimeMillis() + thirtyDaysInMillis) * 1000
            );
            updates.put("scheduledDeletionDate", scheduledDeletion);
            
            userRef.update(updates).get();
            logger.info("✅ User {} deactivated in Firestore", userId);
            
            result.put("success", true);
            result.put("message", "User deactivated successfully. Account will be deleted in 30 days if not reactivated.");
            result.put("userId", userId);
            
        } catch (FirebaseAuthException e) {
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
            logger.error("❌ Firebase Auth error deactivating user {}: {}", userId, errorMessage);
            result.put("success", false);
            result.put("message", "Failed to deactivate user in Firebase Auth: " + errorMessage);
        } catch (InterruptedException | ExecutionException e) {
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
            logger.error("❌ Firestore error deactivating user {}: {}", userId, errorMessage);
            result.put("success", false);
            result.put("message", "Failed to update user status in Firestore: " + errorMessage);
        }
        
        return result;
    }
    
    /**
     * Activate a previously deactivated user account
     * -if (!isFirebaseInitialized()) {
            result.put("success", false);
            result.put("message", "Firebase is not initialized. Please configure firebase-service-account.json");
            return result;
        }
        
         Re-enables the account in Firebase Auth
     * - Updates Firestore to active status
     */
    public Map<String, Object> activateUser(String userId) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Enable user in Firebase Authentication
            UserRecord.UpdateRequest request = new UserRecord.UpdateRequest(userId)
                .setDisabled(false);
            
            FirebaseAuth.getInstance().updateUser(request);
            logger.info("✅ User {} enabled in Firebase Auth", userId);
            
            // Update Firestore document
            Firestore firestore = FirestoreClient.getFirestore();
            DocumentReference userRef = firestore.collection("users").document(userId);
            
            Map<String, Object> updates = new HashMap<>();
            updates.put("accountStatus", "active");
            updates.put("deactivatedAt", null);
            updates.put("scheduledDeletionDate", null);
            updates.put("bannedAt", null);
            updates.put("forceLogout", false);
            
            userRef.update(updates).get();
            logger.info("✅ User {} activated in Firestore", userId);
            
            result.put("success", true);
            result.put("message", "User activated successfully.");
            result.put("userId", userId);
            
        } catch (FirebaseAuthException e) {
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
            logger.error("❌ Firebase Auth error activating user {}: {}", userId, errorMessage);
            result.put("success", false);
            result.put("message", "Failed to activate user in Firebase Auth: " + errorMessage);
        } catch (InterruptedException | ExecutionException e) {
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
            logger.error("❌ Firestore error activating user {}: {}", userId, errorMessage);
            result.put("success", false);
            result.put("message", "Failed to update user status in Firestore: " + errorMessage);
        }
        
        return result;
    }
    
    /**
     * Ban a user permanently
     * - Disables the account in Firebase Auth
     * -if (!isFirebaseInitialized()) {
            result.put("success", false);
            result.put("message", "Firebase is not initialized. Please configure firebase-service-account.json");
            return result;
        }
        
         Sets custom claim "banned": true
     * - Updates Firestore with banned status
     */
    public Map<String, Object> banUser(String userId, String reason) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Disable user in Firebase Authentication
            UserRecord.UpdateRequest request = new UserRecord.UpdateRequest(userId)
                .setDisabled(true);
            
            FirebaseAuth.getInstance().updateUser(request);
            logger.info("✅ User {} disabled in Firebase Auth", userId);
            
            // Set custom claim for banned status
            Map<String, Object> claims = new HashMap<>();
            claims.put("banned", true);
            claims.put("banReason", reason != null ? reason : "Banned by admin");
            
            FirebaseAuth.getInstance().setCustomUserClaims(userId, claims);
            logger.info("✅ Custom claim 'banned' set for user {}", userId);
            
            // Update Firestore document
            Firestore firestore = FirestoreClient.getFirestore();
            DocumentReference userRef = firestore.collection("users").document(userId);
            
            Map<String, Object> updates = new HashMap<>();
            updates.put("accountStatus", "banned");
            updates.put("bannedAt", com.google.cloud.Timestamp.now());
            updates.put("banReason", reason != null ? reason : "Banned by admin");
            updates.put("forceLogout", true);
            
            userRef.update(updates).get();
            logger.info("✅ User {} banned in Firestore", userId);
            
            result.put("success", true);
            result.put("message", "User banned successfully.");
            result.put("userId", userId);
            
        } catch (FirebaseAuthException e) {
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
            logger.error("❌ Firebase Auth error banning user {}: {}", userId, errorMessage);
            result.put("success", false);
            result.put("message", "Failed to ban user in Firebase Auth: " + errorMessage);
        } catch (InterruptedException | ExecutionException e) {
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
            logger.error("❌ Firestore error banning user {}: {}", userId, errorMessage);
            result.put("success", false);
            result.put("message", "Failed to update user status in Firestore: " + errorMessage);
        }
        
        if (!isFirebaseInitialized()) {
            result.put("success", false);
            result.put("message", "Firebase is not initialized. Please configure firebase-service-account.json");
            return result;
        }
        
        return result;
    }
    
    /**
     * Unban a previously banned user
     * - Re-enables the account in Firebase Auth
     * - Removes custom claim "banned"
     * - Updates Firestore to active status
     */
    public Map<String, Object> unbanUser(String userId) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Enable user in Firebase Authentication
            UserRecord.UpdateRequest request = new UserRecord.UpdateRequest(userId)
                .setDisabled(false);
            
            FirebaseAuth.getInstance().updateUser(request);
            logger.info("✅ User {} enabled in Firebase Auth", userId);
            
            // Remove banned custom claim
            Map<String, Object> claims = new HashMap<>();
            claims.put("banned", null);
            
            FirebaseAuth.getInstance().setCustomUserClaims(userId, claims);
            logger.info("✅ Custom claim 'banned' removed for user {}", userId);
            
            // Update Firestore document
            Firestore firestore = FirestoreClient.getFirestore();
            DocumentReference userRef = firestore.collection("users").document(userId);
            
            Map<String, Object> updates = new HashMap<>();
            updates.put("accountStatus", "active");
            updates.put("bannedAt", null);
            updates.put("banReason", null);
            updates.put("forceLogout", false);
            
            userRef.update(updates).get();
            logger.info("✅ User {} unbanned in Firestore", userId);
            
            result.put("success", true);
            result.put("message", "User unbanned successfully.");
            result.put("userId", userId);
            
        } catch (FirebaseAuthException e) {
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
            logger.error("❌ Firebase Auth error unbanning user {}: {}", userId, errorMessage);
            result.put("success", false);
            result.put("message", "Failed to unban user in Firebase Auth: " + errorMessage);
        } catch (InterruptedException | ExecutionException e) {
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
            logger.error("❌ Firestore error unbanning user {}: {}", userId, errorMessage);
            result.put("success", false);
            result.put("message", "Failed to update user status in Firestore: " + errorMessage);
        }
        if (!isFirebaseInitialized()) {
            result.put("success", false);
            result.put("message", "Firebase is not initialized. Please configure firebase-service-account.json");
            return result;
        }
        
        
        return result;
    }
    
    /**
     * Delete a user completely from Firebase
     * - Removes user from Firebase Authentication (irreversible)
     * - Deletes user document from Firestore
     */
    public Map<String, Object> deleteUser(String userId) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Delete from Firebase Authentication
            FirebaseAuth.getInstance().deleteUser(userId);
            logger.info("✅ User {} deleted from Firebase Auth", userId);
            
            // Delete from Firestore
            Firestore firestore = FirestoreClient.getFirestore();
            firestore.collection("users").document(userId).delete().get();
            logger.info("✅ User {} deleted from Firestore", userId);
            
            result.put("success", true);
            result.put("message", "User permanently deleted from Firebase.");
            result.put("userId", userId);
            
        } catch (FirebaseAuthException e) {
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
            logger.error("❌ Firebase Auth error deleting user {}: {}", userId, errorMessage);
            result.put("success", false);
            result.put("message", "Failed to delete user from Firebase Auth: " + errorMessage);
        } catch (InterruptedException | ExecutionException e) {
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
            logger.error("❌ Firestore error deleting user {}: {}", userId, errorMessage);
            result.put("success", false);
            result.put("message", "Failed to delete user from Firestore: " + errorMessage);
        }
        
        return result;
    }
}
