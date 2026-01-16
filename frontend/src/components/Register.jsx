import { useState } from "react";
import { auth, googleProvider, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { addDoc, collection } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import "../App.css";

function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateName = (name) => {
    const trimmedName = name.trim();
    return trimmedName.length >= 2 && /^[a-zA-Z\s'-]+$/.test(trimmedName);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhoneNumber = (phone) => {
    // Accepts formats: +1234567890, (123) 456-7890, 123-456-7890, 1234567890
    const re = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phone.trim().length >= 10 && re.test(phone.trim());
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);
    
    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers,
      errors: {
        minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasNonalphas
      }
    };
  };

  const handleRegister = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phoneNumber.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedPhone || !trimmedPassword || !trimmedConfirmPassword) {
      setError("All fields are required");
      return;
    }

    if (!validateName(trimmedFirstName)) {
      setError("Please enter a valid first name (at least 2 characters, letters only)");
      return;
    }

    if (!validateName(trimmedLastName)) {
      setError("Please enter a valid last name (at least 2 characters, letters only)");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!validatePhoneNumber(trimmedPhone)) {
      setError("Please enter a valid phone number (at least 10 digits)");
      return;
    }

    const passwordValidation = validatePassword(trimmedPassword);
    if (!passwordValidation.isValid) {
      let errorMsg = "Password must contain:";
      if (!passwordValidation.errors.minLength) errorMsg += " at least 8 characters,";
      if (!passwordValidation.errors.hasUpperCase) errorMsg += " one uppercase letter,";
      if (!passwordValidation.errors.hasLowerCase) errorMsg += " one lowercase letter,";
      if (!passwordValidation.errors.hasNumbers) errorMsg += " one number,";
      setError(errorMsg.slice(0, -1)); // Remove trailing comma
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      console.log("Registration successful:", userCredential.user);
      
      // Save user data to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        phoneNumber: trimmedPhone,
        uid: userCredential.user.uid,
        authProvider: "email",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log("User data saved to Firestore");
      
      // Add welcome notification for new user
      try {
        await addDoc(collection(db, "users", userCredential.user.uid, "notifications"), {
          title: "🎉 Welcome to Global IP Platform!",
          message: `Hi ${trimmedFirstName}! Your account has been successfully created. Start exploring our patent search and filing services.`,
          details: {
            accountType: "Basic",
            registeredEmail: trimmedEmail,
            registrationDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          },
          createdAt: serverTimestamp(),
          read: false
        });
        console.log("Welcome notification added");
      } catch (notifError) {
        console.error("Error adding welcome notification:", notifError);
      }
      
      // Get ID token and save to localStorage for dashboard
      const idToken = await userCredential.user.getIdToken();
      localStorage.setItem('firebaseAuthToken', idToken);
      console.log("Auth token saved to localStorage");
      
      // Navigate to verification page
      console.log("Navigating to verification...");
      navigate("/verification");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email is already registered. Please use a different email or login.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
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
      
      // Save or update user data to Firestore
      await setDoc(doc(db, "users", result.user.uid), {
        firstName: firstName,
        lastName: lastName,
        email: result.user.email,
        phoneNumber: result.user.phoneNumber || "",
        photoURL: result.user.photoURL || "",
        uid: result.user.uid,
        authProvider: "google",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true }); // merge: true will update existing data or create new
      
      console.log("Google user data saved to Firestore");
      
      // Add welcome notification for new user
      try {
        await addDoc(collection(db, "users", result.user.uid, "notifications"), {
          title: "🎉 Welcome to Global IP Platform!",
          message: `Hi ${firstName}! Your account has been successfully created with Google. Start exploring our patent search and filing services.`,
          details: {
            accountType: "Basic",
            registeredEmail: result.user.email,
            registrationDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            loginMethod: "Google"
          },
          createdAt: serverTimestamp(),
          read: false
        });
        console.log("Welcome notification added");
      } catch (notifError) {
        console.error("Error adding welcome notification:", notifError);
      }
      
      // Get ID token and save to localStorage for dashboard
      const idToken = await result.user.getIdToken();
      localStorage.setItem('firebaseAuthToken', idToken);
      console.log("Auth token saved to localStorage");
      
      // Navigate to verification page
      console.log("Navigating to verification...");
      navigate("/verification");
    } catch (err) {
      setError("Google registration failed. Please try again.");
      console.error("Google registration error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRegister();
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-split-container">
        {/* Left Side - Registration Form */}
        <div className="auth-form-section register-form">
          <div className="auth-form-content">
            <h2 className="form-title">Create Your Account</h2>
            <p className="form-subtitle">Start your IP monitoring journey today</p>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    className="form-input with-icon"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoComplete="given-name"
                  />
                </div>
                {firstName.length > 0 && !validateName(firstName) && (
                  <div className="field-error">
                    Name must be at least 2 characters, letters only
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <div className="input-wrapper">
                  <span className="input-icon">👥</span>
                  <input
                    type="text"
                    className="form-input with-icon"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoComplete="family-name"
                  />
                </div>
                {lastName.length > 0 && !validateName(lastName) && (
                  <div className="field-error">
                    Name must be at least 2 characters, letters only
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    type="email"
                    className="form-input with-icon"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoComplete="email"
                  />
                </div>
                {email.length > 0 && !validateEmail(email) && (
                  <div className="field-error">
                    Please enter a valid email address
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="input-wrapper">
                  <span className="input-icon">📱</span>
                  <input
                    type="tel"
                    className="form-input with-icon"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoComplete="tel"
                  />
                </div>
                {phoneNumber.length > 0 && !validatePhoneNumber(phoneNumber) && (
                  <div className="field-error">
                    Please enter a valid phone number (at least 10 digits)
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-input with-icon"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoComplete="new-password"
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
              
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔐</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-input with-icon"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoComplete="new-password"
                  />
                  {confirmPassword.length > 0 && (
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {password.length > 0 && (
              <div className="password-requirements" style={{marginBottom: '14px'}}>
                <div className={password.length >= 8 ? 'requirement-met' : 'requirement-unmet'}>
                  {password.length >= 8 ? '✓' : '○'} At least 8 characters
                </div>
                <div className={/[A-Z]/.test(password) ? 'requirement-met' : 'requirement-unmet'}>
                  {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
                </div>
                <div className={/[a-z]/.test(password) ? 'requirement-met' : 'requirement-unmet'}>
                  {/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
                </div>
                <div className={/\d/.test(password) ? 'requirement-met' : 'requirement-unmet'}>
                  {/\d/.test(password) ? '✓' : '○'} One number
                </div>
              </div>
            )}
            
            <button 
              className="btn-primary" 
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
            
            <div className="divider">
              <span>or continue with</span>
            </div>
            
            <button 
              className="btn-google" 
              onClick={handleGoogleRegister}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9.001c0 1.452.348 2.827.957 4.041l3.007-2.332z"/>
                <path fill="#EA4335" d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"/>
              </svg>
              Sign up with Google
            </button>
            
            <div className="auth-footer">
              <p>
                Already have an account? <Link to="/" className="auth-link">Sign In</Link>
              </p>
            </div>
          </div>
        </div>
        
        {/* Right Side - Platform Benefits */}
        <div className="auth-info-section register-info">
          <div className="auth-info-content">
            <div className="auth-brand">
              <h1>Join Global IP Platform</h1>
            </div>
            
            <h2 className="info-headline">Empower Your IP Research & Innovation Tracking</h2>
            
            <p className="info-description">
              Join thousands of innovators, law firms, and R&D teams who trust our platform 
              for comprehensive intellectual property monitoring and analysis.
            </p>
            
            <div className="benefits-list">
              <div className="benefit-item">
                <span className="benefit-check">✓</span>
                <div>
                  <h3>Comprehensive Search Tools</h3>
                  <p>Advanced search filters to find exactly what you need across global patent databases</p>
                </div>
              </div>
              
              <div className="benefit-item">
                <span className="benefit-check">✓</span>
                <div>
                  <h3>Patent Filing Management</h3>
                  <p>Track and manage your patent applications with our integrated filing tracker</p>
                </div>
              </div>
              
              <div className="benefit-item">
                <span className="benefit-check">✓</span>
                <div>
                  <h3>Custom Dashboards</h3>
                  <p>Personalized views with real-time updates on IP activities that matter to you</p>
                </div>
              </div>
              
              <div className="benefit-item">
                <span className="benefit-check">✓</span>
                <div>
                  <h3>Competitive Intelligence</h3>
                  <p>Monitor competitor patents and identify market opportunities early</p>
                </div>
              </div>
              
              <div className="benefit-item">
                <span className="benefit-check">✓</span>
                <div>
                  <h3>Export & Reporting</h3>
                  <p>Generate professional reports and export data for strategic decision-making</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
