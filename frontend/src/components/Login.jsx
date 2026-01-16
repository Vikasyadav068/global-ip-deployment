import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup, deleteUser } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import "../App.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please fill all fields");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      console.log("Login successful:", userCredential.user);
      
      // Check account status in Firestore
      const userRef = doc(db, "users", userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if account is deactivated
        if (userData.accountStatus === 'deactivated' && userData.deactivatedAt) {
          const deactivatedDate = userData.deactivatedAt.toDate();
          const daysSinceDeactivation = (new Date() - deactivatedDate) / (1000 * 60 * 60 * 24);
          
          if (daysSinceDeactivation > 30) {
            // Account deactivated for more than 30 days - DELETE IT
            console.log('Account deactivated for >30 days. Deleting...');
            
            try {
              // Delete Firestore document
              await deleteDoc(userRef);
              
              // Delete auth account
              await deleteUser(userCredential.user);
              
              setError('Your account was deactivated for more than 30 days and has been permanently deleted.');
              setLoading(false);
              return;
            } catch (deleteError) {
              console.error('Error deleting account:', deleteError);
              setError('Account deletion failed. Please contact support.');
              setLoading(false);
              return;
            }
          } else {
            // Account deactivated for less than 30 days - REACTIVATE IT
            console.log(`Account deactivated for ${Math.floor(daysSinceDeactivation)} days. Reactivating...`);
            
            await setDoc(userRef, {
              accountStatus: 'active',
              deactivatedAt: null,
              reactivatedAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              isOnline: true,
              updatedAt: serverTimestamp()
            }, { merge: true });
            
            console.log('Account reactivated successfully!');
          }
        } else {
          // Account is active - update last login and set online status
          await setDoc(userRef, {
            lastLogin: serverTimestamp(),
            isOnline: true,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }
      
      // Get ID token and save to localStorage for verification
      const idToken = await userCredential.user.getIdToken();
      localStorage.setItem('firebaseAuthToken', idToken);
      console.log("Auth token saved to localStorage");
      
      // Redirect to verification
      setTimeout(() => {
        console.log("Redirecting to verification...");
        navigate("/verification");
      }, 1000);
    } catch (err) {
      console.error('Login error:', err);
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google user:", result.user);
      
      // Extract name from displayName
      const displayName = result.user.displayName || "";
      const nameParts = displayName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      // Check if user exists in Firestore
      const userRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if account is deactivated
        if (userData.accountStatus === 'deactivated' && userData.deactivatedAt) {
          const deactivatedDate = userData.deactivatedAt.toDate();
          const daysSinceDeactivation = (new Date() - deactivatedDate) / (1000 * 60 * 60 * 24);
          
          if (daysSinceDeactivation > 30) {
            // Account deactivated for more than 30 days - DELETE IT
            console.log('Account deactivated for >30 days. Deleting...');
            
            try {
              // Delete Firestore document
              await deleteDoc(userRef);
              
              // Delete auth account
              await deleteUser(result.user);
              
              setError('Your account was deactivated for more than 30 days and has been permanently deleted.');
              setLoading(false);
              return;
            } catch (deleteError) {
              console.error('Error deleting account:', deleteError);
              setError('Account deletion failed. Please contact support.');
              setLoading(false);
              return;
            }
          } else {
            // Account deactivated for less than 30 days - REACTIVATE IT
            console.log(`Account deactivated for ${Math.floor(daysSinceDeactivation)} days. Reactivating...`);
            
            await setDoc(userRef, {
              accountStatus: 'active',
              deactivatedAt: null,
              reactivatedAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              isOnline: true,
              updatedAt: serverTimestamp()
            }, { merge: true });
            
            console.log('Account reactivated successfully!');
          }
        } else {
          // Update existing active user and set online status
          await setDoc(userRef, {
            lastLogin: serverTimestamp(),
            isOnline: true,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } else {
        // Create new user document
        await setDoc(userRef, {
          firstName: firstName,
          lastName: lastName,
          email: result.user.email,
          phoneNumber: result.user.phoneNumber || "",
          photoURL: result.user.photoURL || "",
          uid: result.user.uid,
          authProvider: "google",
          accountStatus: "active",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isOnline: true,
          updatedAt: serverTimestamp()
        });
      }
      
      console.log("Google user data saved to Firestore");
      
      // Get ID token and save to localStorage for verification
      const idToken = await result.user.getIdToken();
      localStorage.setItem('firebaseAuthToken', idToken);
      console.log("Auth token saved to localStorage");
      
      // Redirect to verification
      setTimeout(() => {
        console.log("Redirecting to verification...");
        navigate("/verification");
      }, 1000);
    } catch (err) {
      setError("Google login failed. Please try again.");
      console.error("Google login error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-split-container">
        {/* Left Side - Platform Information */}
        <div className="auth-info-section">
          <div className="auth-info-content">
            <div className="auth-brand">
              <h1>Global IP Platform</h1>
            </div>
            
            <h2 className="info-headline">Monitor Global Intellectual Property Activity</h2>
            
            <p className="info-description">
              Your comprehensive platform to track patents, innovations, and IP developments worldwide. 
              Stay ahead in the competitive landscape of intellectual property.
            </p>
            
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">🌐</span>
                <div>
                  <h3>Global Patent Database</h3>
                  <p>Access millions of patents from major jurisdictions worldwide</p>
                </div>
              </div>
              
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <div>
                  <h3>Real-time Analytics</h3>
                  <p>Track trends and analyze IP data with powerful visualization tools</p>
                </div>
              </div>
              
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <div>
                  <h3>Smart Alerts</h3>
                  <p>Get notified about relevant patent filings and IP activities</p>
                </div>
              </div>
              
              <div className="feature-item">
                <span className="feature-icon">🛡️</span>
                <div>
                  <h3>Secure & Compliant</h3>
                  <p>Enterprise-grade security for your sensitive IP research</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side - Login Form */}
        <div className="auth-form-section">
          <div className="auth-form-content">
            <h2 className="form-title">Welcome Back</h2>
            <p className="form-subtitle">Sign in to continue monitoring IP activity</p>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">📧</span>
                <input
                  type="email"
                  className="form-input with-icon"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoComplete="email"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input with-icon"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoComplete="current-password"
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                )}
              </div>
            </div>
            
            <div className="forgot-link-wrapper">
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>
            
            <button 
              className="btn-primary" 
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
            
            <div className="divider">
              <span>or continue with</span>
            </div>
            
            <button 
              className="btn-google" 
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9.001c0 1.452.348 2.827.957 4.041l3.007-2.332z"/>
                <path fill="#EA4335" d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"/>
              </svg>
              Sign in with Google
            </button>
            
            <div className="auth-footer">
              <p>
                Don't have an account? <Link to="/register" className="auth-link">Create Account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
