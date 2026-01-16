/**
 * Firebase Cloud Functions - Global IPI Platform
 * Main entry point for all cloud functions
 */

// Import individual function modules
const deleteDeactivatedAccounts = require('./deleteDeactivatedAccountsScheduled');
const deleteDeactivatedAccountsOld = require('./deleteDeactivatedAccounts');

// Export all functions
exports.deleteDeactivatedAccountsScheduled = deleteDeactivatedAccounts.deleteDeactivatedAccountsScheduled;
exports.deleteDeactivatedAccountsManual = deleteDeactivatedAccounts.deleteDeactivatedAccountsManual;

// Export old function for backward compatibility
exports.deleteDeactivatedAccounts = deleteDeactivatedAccountsOld.deleteDeactivatedAccounts;
