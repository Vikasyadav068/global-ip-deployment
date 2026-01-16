/**
 * Firebase Cloud Function - Auto-Delete Deactivated Accounts
 * 
 * This function runs daily at 2:00 AM UTC to check for accounts that have been
 * deactivated for more than 30 days and automatically deletes them.
 * 
 * Schedule: Daily at 2:00 AM UTC
 * Triggers: Cloud Scheduler
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * Scheduled function that runs daily to delete accounts deactivated for 30+ days
 * 
 * To deploy this function:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. Initialize functions: firebase init functions
 * 4. Deploy: firebase deploy --only functions:deleteDeactivatedAccountsScheduled
 */
exports.deleteDeactivatedAccountsScheduled = functions.pubsub
  .schedule('0 2 * * *') // Every day at 2:00 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('🚀 Starting automatic deactivated accounts cleanup...');
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      console.log(`📅 Checking for accounts deactivated before: ${thirtyDaysAgo.toISOString()}`);
      
      // Query for deactivated accounts older than 30 days
      const deactivatedAccountsQuery = await db.collection('users')
        .where('accountStatus', '==', 'deactivated')
        .where('deactivatedAt', '<=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get();
      
      if (deactivatedAccountsQuery.empty) {
        console.log('✅ No deactivated accounts to delete');
        return null;
      }
      
      console.log(`🔍 Found ${deactivatedAccountsQuery.size} account(s) to delete`);
      
      const deletionResults = {
        successful: 0,
        failed: 0,
        errors: []
      };
      
      // Process each deactivated account
      const deletePromises = deactivatedAccountsQuery.docs.map(async (doc) => {
        const userData = doc.data();
        const uid = doc.id;
        const deactivatedAt = userData.deactivatedAt.toDate();
        const daysSinceDeactivation = Math.floor((new Date() - deactivatedAt) / (1000 * 60 * 60 * 24));
        
        console.log(`🗑️ Processing account: ${userData.email || uid}`);
        console.log(`   Deactivated: ${daysSinceDeactivation} days ago`);
        
        try {
          // 1. Delete Firestore document
          await db.collection('users').doc(uid).delete();
          console.log(`   ✅ Firestore document deleted for ${uid}`);
          
          // 2. Delete user from Firebase Authentication
          try {
            await auth.deleteUser(uid);
            console.log(`   ✅ Auth account deleted for ${uid}`);
          } catch (authError) {
            // User might already be deleted from auth, log but don't fail
            console.warn(`   ⚠️ Auth deletion warning for ${uid}:`, authError.message);
          }
          
          // 3. Delete user's Storage files (profile photos, etc.)
          try {
            const bucket = admin.storage().bucket();
            const userFolder = `users/${uid}/`;
            const [files] = await bucket.getFiles({ prefix: userFolder });
            
            if (files.length > 0) {
              await Promise.all(files.map(file => file.delete()));
              console.log(`   ✅ Deleted ${files.length} storage file(s) for ${uid}`);
            }
          } catch (storageError) {
            console.warn(`   ⚠️ Storage deletion warning for ${uid}:`, storageError.message);
          }
          
          deletionResults.successful++;
          console.log(`✅ Successfully deleted account: ${userData.email || uid} (deactivated ${daysSinceDeactivation} days ago)`);
          
        } catch (error) {
          deletionResults.failed++;
          deletionResults.errors.push({
            uid: uid,
            email: userData.email || 'unknown',
            error: error.message
          });
          console.error(`❌ Failed to delete account ${uid}:`, error);
        }
      });
      
      // Wait for all deletions to complete
      await Promise.all(deletePromises);
      
      // Log final summary
      console.log('\n📊 Deletion Summary:');
      console.log(`   ✅ Successful: ${deletionResults.successful}`);
      console.log(`   ❌ Failed: ${deletionResults.failed}`);
      
      if (deletionResults.errors.length > 0) {
        console.error('\n❌ Errors encountered:');
        deletionResults.errors.forEach(err => {
          console.error(`   - ${err.email} (${err.uid}): ${err.error}`);
        });
      }
      
      console.log('\n🏁 Deactivated accounts cleanup completed');
      
      return {
        success: true,
        processed: deactivatedAccountsQuery.size,
        successful: deletionResults.successful,
        failed: deletionResults.failed,
        errors: deletionResults.errors
      };
      
    } catch (error) {
      console.error('❌ Fatal error in deleteDeactivatedAccountsScheduled:', error);
      throw error; // Re-throw to mark function execution as failed
    }
  });

/**
 * HTTP-triggered version for manual testing/execution
 * 
 * Call this endpoint to manually trigger the cleanup:
 * https://REGION-PROJECT_ID.cloudfunctions.net/deleteDeactivatedAccountsManual
 * 
 * Example:
 * curl -X POST https://us-central1-myproject.cloudfunctions.net/deleteDeactivatedAccountsManual
 */
exports.deleteDeactivatedAccountsManual = functions.https.onRequest(async (req, res) => {
  console.log('🚀 Manual trigger: Starting deactivated accounts cleanup...');
  
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deactivatedAccountsQuery = await db.collection('users')
      .where('accountStatus', '==', 'deactivated')
      .where('deactivatedAt', '<=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();
    
    if (deactivatedAccountsQuery.empty) {
      return res.status(200).json({
        success: true,
        message: 'No deactivated accounts to delete',
        processed: 0
      });
    }
    
    console.log(`Found ${deactivatedAccountsQuery.size} account(s) to delete`);
    
    const deletionResults = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for (const doc of deactivatedAccountsQuery.docs) {
      const uid = doc.id;
      const userData = doc.data();
      
      try {
        await db.collection('users').doc(uid).delete();
        
        try {
          await auth.deleteUser(uid);
        } catch (authError) {
          console.warn('Auth deletion warning:', authError.message);
        }
        
        try {
          const bucket = admin.storage().bucket();
          const [files] = await bucket.getFiles({ prefix: `users/${uid}/` });
          await Promise.all(files.map(file => file.delete()));
        } catch (storageError) {
          console.warn('Storage deletion warning:', storageError.message);
        }
        
        deletionResults.successful++;
        
      } catch (error) {
        deletionResults.failed++;
        deletionResults.errors.push({
          uid: uid,
          email: userData.email || 'unknown',
          error: error.message
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Cleanup completed',
      processed: deactivatedAccountsQuery.size,
      successful: deletionResults.successful,
      failed: deletionResults.failed,
      errors: deletionResults.errors
    });
    
  } catch (error) {
    console.error('Error in manual cleanup:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
