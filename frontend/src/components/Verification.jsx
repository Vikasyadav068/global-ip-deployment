import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../App.css";

function Verification() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/");
      } else {
        setUser(currentUser);
        // Fetch user data from Firestore
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserData(userDocSnap.data());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      // Update user's online status in Firestore before signing out
      if (user?.uid) {
        try {
          const userRef = doc(db, "users", user.uid);
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
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    
    // Handle Firestore Timestamp objects
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Handle regular date strings
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleContinueToDashboard = async () => {
    try {
      // Update Firestore with current email verification status
      if (user.uid) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          emailVerified: user.emailVerified,
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ Updated emailVerified status in Firestore:', user.emailVerified);
      }

      const userProfile = {
        uid: user.uid,
        email: user.email,
        firstName: user.displayName?.split(' ')[0] || 'User',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
        emailVerified: user.emailVerified,
        creationTime: user.metadata?.creationTime,
        lastSignInTime: user.metadata?.lastSignInTime,
        authProvider: 'email'
      };
      
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      
      const idToken = await user.getIdToken();
      localStorage.setItem('firebaseAuthToken', idToken);
      
      // Navigate to the dashboard route
      console.log('✅ Navigating to dashboard');
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error opening dashboard. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="verification-page-wrapper">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Verifying your identity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-page-wrapper">
      <div className="verification-container-wide">
        {/* Header Section - Compact with inline icon */}
        <div className="verification-header-compact">
          <h1 className="verification-title-compact">
            <span className="icon-shield-inline">🛡️</span>
            Identity Verification
          </h1>
          <p className="verification-subtitle-compact">
            Please confirm your account details before proceeding to the dashboard
          </p>
        </div>
        
        {user && (
          <>
            {/* Split Content Section */}
            <div className="verification-split-content">
              {/* Left Side - Account Verification Details - Only show for active/deactivated accounts */}
              {(() => {
                const accountStatus = (userData?.accountStatus || 'active').toLowerCase();
                const showVerificationDetails = accountStatus !== 'banned' && accountStatus !== 'suspended';
                
                return showVerificationDetails ? (
                  <div className="verification-left-section">
                    <div className="verification-card-compact">
                      <div className="card-header-compact">
                        <h2>
                          <span className="header-icon">✓</span>
                          Account Verification Details
                        </h2>
                      </div>
                      
                      <div className="info-grid-compact">
                        <div className="info-item">
                          <div className="info-label">
                            <span className="label-icon">📧</span>
                            Registered Email
                          </div>
                          <div className="info-value">{user.email}</div>
                        </div>
                        
                        <div className="info-item">
                          <div className="info-label">
                            <span className="label-icon">🆔</span>
                            User Identification Code
                          </div>
                          <div className="info-value info-code">{user.uid.substring(0, 16)}...</div>
                        </div>
                        
                        <div className="info-item">
                          <div className="info-label">
                            <span className="label-icon">📅</span>
                            Account Created On
                          </div>
                          <div className="info-value">{formatDate(user.metadata?.creationTime)}</div>
                        </div>
                        
                        <div className="info-item">
                          <div className="info-label">
                            <span className="label-icon">⏰</span>
                            Last Login Activity
                          </div>
                          <div className="info-value">{formatDate(user.metadata?.lastSignInTime)}</div>
                        </div>
                        
                        <div className="info-item full-width">
                          <div className="info-label">
                            <span className="label-icon">✉️</span>
                            Email Verification Status
                          </div>
                          <div className={`info-value verification-status ${user.emailVerified ? 'verified' : 'unverified'}`}>
                            {user.emailVerified ? (
                              <><span className="status-icon">✓</span> Verified</>
                            ) : (
                              <><span className="status-icon">⚠</span> Not Verified</>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
              
              {/* Right Side - Security Checkpoint, Actions & Footer */}
              <div className="verification-right-section" style={{
                flex: (userData?.accountStatus === 'banned' || userData?.accountStatus === 'suspended') ? '1' : undefined,
                width: (userData?.accountStatus === 'banned' || userData?.accountStatus === 'suspended') ? '100%' : undefined,
                gridColumn: (userData?.accountStatus === 'banned' || userData?.accountStatus === 'suspended') ? '1 / -1' : undefined
              }}>
                {/* Get account status */}
                {(() => {
                  const accountStatus = (userData?.accountStatus || 'active').toLowerCase();
                  
                  // SUSPENDED ACCOUNT - Show warning message, no continue button
                  if (accountStatus === 'suspended') {
                    return (
                      <>
                        <div className="suspended-notice-container" style={{
                          background: 'linear-gradient(135deg, #8e44ad 0%, #6c3483 100%)',
                          borderRadius: '16px',
                          padding: '24px 32px',
                          textAlign: 'center',
                          boxShadow: '0 8px 32px rgba(142, 68, 173, 0.3)',
                          border: '2px solid rgba(255, 255, 255, 0.1)',
                          minHeight: '320px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          width: '100%'
                        }}>
                          <div style={{
                            fontSize: '56px',
                            marginBottom: '12px',
                            animation: 'shake 0.5s ease-in-out'
                          }}>⏸️</div>
                          <h2 style={{
                            color: 'white',
                            fontSize: '26px',
                            fontWeight: 'bold',
                            marginBottom: '10px',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
                          }}>Account Suspended</h2>
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.95)',
                            fontSize: '16px',
                            lineHeight: '1.5',
                            marginBottom: '16px'
                          }}>
                            Your account has been temporarily suspended by the administrator.
                          </p>
                          {userData?.suspendReason && (
                            <div style={{
                              background: 'rgba(0, 0, 0, 0.2)',
                              padding: '12px 16px',
                              borderRadius: '10px',
                              marginBottom: '14px'
                            }}>
                              <p style={{
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '8px'
                              }}>Reason:</p>
                              <p style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '16px'
                              }}>{userData.suspendReason}</p>
                            </div>
                          )}
                          {userData?.suspendedAt && (
                            <div style={{
                              background: 'rgba(0, 0, 0, 0.2)',
                              padding: '12px 16px',
                              borderRadius: '10px',
                              marginBottom: '16px'
                            }}>
                              <p style={{
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '8px'
                              }}>Suspended On:</p>
                              <p style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '16px'
                              }}>{formatDate(userData.suspendedAt)}</p>
                            </div>
                          )}
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.85)',
                            fontSize: '14px',
                            marginBottom: '18px'
                          }}>
                            Please contact support for more information or to appeal this suspension.
                          </p>
                          <button
                            onClick={handleLogout}
                            style={{
                              background: 'white',
                              color: '#6c3483',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '12px 28px',
                              fontSize: '16px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                          >
                            Sign Out
                          </button>
                        </div>
                      </>
                    );
                  }
                  
                  // BANNED ACCOUNT - Show only warning message, no continue button
                  if (accountStatus === 'banned') {
                    return (
                      <>
                        <div className="banned-notice-container" style={{
                          background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                          borderRadius: '16px',
                          padding: '24px 32px',
                          textAlign: 'center',
                          boxShadow: '0 8px 32px rgba(255, 68, 68, 0.3)',
                          border: '2px solid rgba(255, 255, 255, 0.1)',
                          minHeight: '320px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          width: '100%'
                        }}>
                          <div style={{
                            fontSize: '56px',
                            marginBottom: '12px',
                            animation: 'shake 0.5s ease-in-out'
                          }}>🚫</div>
                          <h2 style={{
                            color: 'white',
                            fontSize: '26px',
                            fontWeight: 'bold',
                            marginBottom: '10px',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
                          }}>Account Banned</h2>
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.95)',
                            fontSize: '16px',
                            lineHeight: '1.5',
                            marginBottom: '16px'
                          }}>
                            Your account has been Banned by the administrator.
                          </p>
                          {userData?.banReason && (
                            <div style={{
                              background: 'rgba(0, 0, 0, 0.2)',
                              padding: '12px 16px',
                              borderRadius: '10px',
                              marginBottom: '14px'
                            }}>
                              <p style={{
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '8px'
                              }}>Reason:</p>
                              <p style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '16px'
                              }}>{userData.banReason}</p>
                            </div>
                          )}
                          {userData?.bannedAt && (
                            <div style={{
                              background: 'rgba(0, 0, 0, 0.2)',
                              padding: '12px 16px',
                              borderRadius: '10px',
                              marginBottom: '16px'
                            }}>
                              <p style={{
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '8px'
                              }}>Banned On:</p>
                              <p style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '16px'
                              }}>{formatDate(userData.bannedAt)}</p>
                            </div>
                          )}
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.85)',
                            fontSize: '14px',
                            marginBottom: '18px'
                          }}>
                            Please contact support if you believe this is an error.
                          </p>
                          <button
                            onClick={handleLogout}
                            style={{
                              background: 'white',
                              color: '#cc0000',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '12px 28px',
                              fontSize: '16px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                          >
                            Sign Out
                          </button>
                        </div>
                      </>
                    );
                  }
                  
                  // DEACTIVATED ACCOUNT - Show continue button + deactivation date
                  if (accountStatus === 'deactivated') {
                    return (
                      <>
                        {/* Deactivation Notice */}
                        <div className="deactivation-notice" style={{
                          background: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)',
                          borderRadius: '16px',
                          padding: '24px',
                          marginBottom: '20px',
                          boxShadow: '0 4px 20px rgba(255, 167, 38, 0.3)',
                          border: '2px solid rgba(255, 255, 255, 0.2)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                            <div style={{ fontSize: '40px', marginTop: '4px' }}>⚠️</div>
                            <div style={{ flex: 1 }}>
                              <h3 style={{
                                color: 'white',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                marginBottom: '8px',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
                              }}>Account Deactivated</h3>
                              <p style={{
                                color: 'rgba(255, 255, 255, 0.95)',
                                fontSize: '15px',
                                lineHeight: '1.5',
                                marginBottom: '12px'
                              }}>
                                Your account is currently in a deactivated state. You can still access 
                                the dashboard, but some features may be limited.
                              </p>
                              {userData?.deactivatedAt && (
                                <div style={{
                                  background: 'rgba(0, 0, 0, 0.15)',
                                  padding: '12px 16px',
                                  borderRadius: '10px',
                                  display: 'inline-block'
                                }}>
                                  <p style={{
                                    color: 'white',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    marginBottom: '4px'
                                  }}>Deactivated On:</p>
                                  <p style={{
                                    color: 'rgba(255, 255, 255, 0.95)',
                                    fontSize: '15px',
                                    fontWeight: '500'
                                  }}>{formatDate(userData.deactivatedAt)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Security Notice */}
                        <div className="security-notice-compact">
                          <div className="notice-icon-compact">🔒</div>
                          <div className="notice-content-compact">
                            <h3>Security Checkpoint</h3>
                            <p>
                              We're verifying this login attempt for your protection. If you don't recognize 
                              this activity, please click "No, This Is Not Me" to sign out immediately.
                            </p>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="verification-actions-compact">
                          <button
                            onClick={handleContinueToDashboard}
                            className="btn-verify-compact btn-verify-success"
                          >
                            <span className="btn-icon-compact">✔</span>
                            <div className="btn-content-compact">
                              <div className="btn-main-text-compact">Yes, This Is My Account</div>
                              <div className="btn-sub-text-compact">Continue to Dashboard</div>
                            </div>
                          </button>
                          
                          <button
                            onClick={handleLogout}
                            className="btn-verify-compact btn-verify-danger"
                          >
                            <span className="btn-icon-compact">✖</span>
                            <div className="btn-content-compact">
                              <div className="btn-main-text-compact">No, This Is Not Me</div>
                              <div className="btn-sub-text-compact">Sign Out Immediately</div>
                            </div>
                          </button>
                        </div>
                        
                        {/* Why am I seeing this */}
                        <div className="verification-footer-right">
                          <p className="footer-text-right">
                            <strong>Why am I seeing this?</strong>
                          </p>
                          <p className="footer-description-right">
                            This verification step helps protect your account from unauthorized access. 
                            We authenticate every login to ensure the security of your IP research data.
                          </p>
                        </div>
                      </>
                    );
                  }
                  
                  // ACTIVE ACCOUNT - Normal flow
                  return (
                    <>
                      {/* Security Notice */}
                      <div className="security-notice-compact">
                        <div className="notice-icon-compact">🔒</div>
                        <div className="notice-content-compact">
                          <h3>Security Checkpoint</h3>
                          <p>
                            We're verifying this login attempt for your protection. If you don't recognize 
                            this activity, please click "No, This Is Not Me" to sign out immediately.
                          </p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="verification-actions-compact">
                        <button
                          onClick={handleContinueToDashboard}
                          className="btn-verify-compact btn-verify-success"
                        >
                          <span className="btn-icon-compact">✔</span>
                          <div className="btn-content-compact">
                            <div className="btn-main-text-compact">Yes, This Is My Account</div>
                            <div className="btn-sub-text-compact">Continue to Dashboard</div>
                          </div>
                        </button>
                        
                        <button
                          onClick={handleLogout}
                          className="btn-verify-compact btn-verify-danger"
                        >
                          <span className="btn-icon-compact">✖</span>
                          <div className="btn-content-compact">
                            <div className="btn-main-text-compact">No, This Is Not Me</div>
                            <div className="btn-sub-text-compact">Sign Out Immediately</div>
                          </div>
                        </button>
                      </div>
                      
                      {/* Why am I seeing this */}
                      <div className="verification-footer-right">
                        <p className="footer-text-right">
                          <strong>Why am I seeing this?</strong>
                        </p>
                        <p className="footer-description-right">
                          This verification step helps protect your account from unauthorized access. 
                          We authenticate every login to ensure the security of your IP research data.
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Verification;