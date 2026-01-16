import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Building, Briefcase, Phone, Calendar, Shield, CheckCircle, XCircle, Camera, Trash2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

const ProfilePage = ({ userProfile, setUserProfile, onBack }) => {
  // Debug: Log props on component mount and updates
  console.log('📄 ProfilePage rendered!');
  console.log('userProfile prop:', userProfile);
  console.log('auth.currentUser:', auth.currentUser);
  
  // Get current authenticated user UID only
  const currentUID = auth.currentUser?.uid || userProfile?.uid;
  
  // Use a temporary state for the file object/blob for storage upload, not the Base64 string
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    position: '',
    phoneNumber: '',
    photoURL: '',
    uid: '',
    emailVerified: false,
    authProvider: '',
    creationTime: '',
    lastSignInTime: ''
  });
  const [newFile, setNewFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  
  // Check if we have a valid authenticated user
  const hasValidUID = !!(currentUID);

  // Fetch and sync data when component mounts or userProfile changes
  useEffect(() => {
    const loadProfileData = async () => {
      console.log('ProfilePage - Loading profile data...');
      
      if (!currentUID) {
        console.log('⚠️ No UID available - user must be authenticated');
        setError('Please log in to view your profile.');
        setIsLoading(false);
        return;
      }

      try {
        console.log('📂 Fetching from Firestore for UID:', currentUID);
        const userDocRef = doc(db, 'users', currentUID);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const firestoreData = userDocSnap.data();
          console.log('✅ Firestore data retrieved successfully!');
          console.log('📊 Data fields:', Object.keys(firestoreData));
          console.log('👤 Name:', firestoreData.firstName, firestoreData.lastName);
          console.log('📧 Email:', firestoreData.email);
          console.log('📱 Phone:', firestoreData.phoneNumber);
          console.log('📷 Photo URL from Firestore:', firestoreData.photoURL);
          console.log('📷 Photo URL TYPE:', typeof firestoreData.photoURL);
          console.log('📷 Photo URL LENGTH:', firestoreData.photoURL?.length);
          console.log('📷 Raw Firestore data:', JSON.stringify(firestoreData, null, 2));
          
          const completeData = {
            ...firestoreData,
            uid: currentUID,
            email: firestoreData.email || auth.currentUser?.email || '',
            emailVerified: firestoreData.emailVerified ?? auth.currentUser?.emailVerified ?? false,
            phoneNumber: firestoreData.phoneNumber || '',
            photoURL: firestoreData.photoURL || auth.currentUser?.photoURL || '',
            creationTime: auth.currentUser?.metadata?.creationTime || '',
            lastSignInTime: auth.currentUser?.metadata?.lastSignInTime || '',
            authProvider: firestoreData.authProvider || 'email'
          };
          
          // Special handling for Google profile photos - ensure they have size parameters
          if (completeData.photoURL && completeData.photoURL.includes('googleusercontent.com')) {
            // Add size parameter if missing
            if (!completeData.photoURL.includes('=s') && !completeData.photoURL.includes('?sz=')) {
              completeData.photoURL = completeData.photoURL + '=s200-c';
            }
            console.log('📸 Enhanced Google photo URL:', completeData.photoURL);
          }
          
          console.log('🎉 Setting profile data with', Object.keys(completeData).length, 'fields');
          console.log('📷 Final photoURL:', completeData.photoURL);
          console.log('📷 Final photoURL length:', completeData.photoURL?.length);
          setFormData(completeData);
          setError(''); // Clear any errors
          
          // Update parent state immediately for Dashboard sync
          if (setUserProfile) {
            console.log('📤 Syncing loaded profile data to Dashboard');
            setUserProfile(completeData);
          }
        } else {
          console.log('⚠️ No Firestore data found for current user');
          
          // Use auth.currentUser data as fallback if available
          if (auth.currentUser) {
            const fallbackData = {
              uid: currentUID,
              firstName: auth.currentUser.displayName?.split(' ')[0] || '',
              lastName: auth.currentUser.displayName?.split(' ').slice(1).join(' ') || '',
              email: auth.currentUser.email || '',
              photoURL: auth.currentUser.photoURL || '',
              emailVerified: auth.currentUser.emailVerified || false,
              authProvider: 'google',
              creationTime: auth.currentUser.metadata?.creationTime || '',
              lastSignInTime: auth.currentUser.metadata?.lastSignInTime || '',
              company: '',
              position: '',
              phoneNumber: ''
            };
            
            console.log('📷 Using fallback data with photoURL:', fallbackData.photoURL);
            setFormData(fallbackData);
            
            // Update parent state for Dashboard sync
            if (setUserProfile) {
              console.log('📤 Syncing fallback profile data to Dashboard');
              setUserProfile(fallbackData);
            }
          } else {
            setError('Profile data not found. Please contact support.');
          }
        }
      } catch (error) {
        console.error('❌ Error loading profile:', error);
        setError('Failed to load profile: ' + error.message);
        
        // Basic fallback from auth if available
        if (auth.currentUser) {
          const errorFallbackData = {
            uid: currentUID,
            firstName: auth.currentUser.displayName?.split(' ')[0] || '',
            lastName: auth.currentUser.displayName?.split(' ').slice(1).join(' ') || '',
            email: auth.currentUser.email || '',
            photoURL: auth.currentUser.photoURL || '',
            emailVerified: auth.currentUser.emailVerified || false,
            company: '',
            position: '',
            phoneNumber: '',
            authProvider: 'google',
            creationTime: auth.currentUser.metadata?.creationTime || '',
            lastSignInTime: auth.currentUser.metadata?.lastSignInTime || ''
          };
          setFormData(errorFallbackData);
          
          if (setUserProfile) {
            console.log('📤 Syncing error fallback data to Dashboard');
            setUserProfile(errorFallbackData);
          }
        }
      } finally {
        console.log('✔️ ProfilePage data fetch completed, setting isLoading to false');
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [currentUID]); // Re-run when authenticated user changes

  const handleChange = (e) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('📁 File selected:', file.name, file.type, file.size);
      
      // Check file size (max 5MB for Base64 storage)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should not exceed 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate user is authenticated before allowing upload
      if (!currentUID) {
        alert('Please log in to upload a profile picture');
        return;
      }

      // Convert file to Base64 string
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('📷 Photo converted to Base64 for file:', file.name);
        console.log('📷 Base64 length:', reader.result.length);
        // Store Base64 string directly - this will be saved to Firestore
        setFormData(prevData => ({
          ...prevData,
          photoURL: reader.result // Base64 string to be stored in Firestore
        }));
        setNewFile(reader.result); // Store Base64 for save operation
      };
      reader.onerror = () => {
        console.error('❌ Error reading file');
        alert('Error reading file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    console.log('🗑️ Removing photo...');
    setNewFile(null); // Clear the new file pending upload
    setFormData({
      ...formData,
      photoURL: '' // Clear the URL for UI/DB
    });
  };

  const handleUploadClick = () => {
    if (!currentUID) {
      alert('Please log in to upload a profile picture');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent double click
    
    // Validate required fields
    if (!formData.firstName || !formData.firstName.trim()) {
      alert('Please enter your first name');
      return;
    }
    
    if (!formData.lastName || !formData.lastName.trim()) {
      alert('Please enter your last name');
      return;
    }
    
    setIsSaving(true);

    try {
      // Use only the current authenticated user's UID - no fallbacks
      const userId = currentUID;
      
      if (!userId) {
        console.error('❌ No valid user ID found');
        alert('Please log in to save your profile.');
        setIsSaving(false);
        return;
      }

      console.log('🔑 Using authenticated user UID:', userId);

      // Prepare photo URL - use Base64 string directly or existing URL
      let photoUrlToSave = formData.photoURL || '';
      
      // If newFile exists, it means user uploaded a new photo (Base64 string)
      // This will REPLACE the old photoURL in Firestore
      if (newFile && typeof newFile === 'string' && newFile.startsWith('data:')) {
        photoUrlToSave = newFile;
        console.log('📸 Saving new Base64 photo (replacing old photoURL)');
        console.log('📸 Base64 length:', photoUrlToSave.length);
      }
      
      // Prepare update data for Firestore
      const userRef = doc(db, 'users', userId);
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email || auth.currentUser?.email || '',
        company: formData.company || '',
        position: formData.position || '',
        phoneNumber: formData.phoneNumber || '',
        emailVerified: auth.currentUser?.emailVerified || formData.emailVerified || false,
        authProvider: formData.authProvider || 'google',
        photoURL: photoUrlToSave, // Base64 string or empty - replaces old value
        updatedAt: serverTimestamp()
      };
      
      // Save to Firestore
      await updateDoc(userRef, updateData);
      console.log('✅ Profile saved to Firestore successfully!');
      
      // Update local state
      const updatedProfile = {
        ...formData,
        photoURL: photoUrlToSave,
        uid: userId,
        updatedAt: new Date()
      };
      
      setFormData(updatedProfile);
      if (setUserProfile) {
        setUserProfile(updatedProfile);
      }
      setNewFile(null);
      setIsEditing(false);
      
      alert('✅ Profile saved successfully!');
      console.log('✅ Profile data synced across application');
      
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to update profile: ';
      
      if (error.code === 'permission-denied') {
        errorMessage += 'Permission denied. Please check Firestore security rules.';
      } else if (error.code === 'unauthenticated') {
        errorMessage += 'Please logout and login again.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    } finally {
        setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Revert form data to original profile data
    setFormData(userProfile);
    // Clear any pending file upload
    setNewFile(null); 
    setIsEditing(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Loading State */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-3"></div>
            <p className="text-blue-800">Loading your profile...</p>
          </div>
        </div>
      )}

      {/* Authentication Check */}
      {!hasValidUID && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-semibold">Authentication Required</h3>
          <p className="text-red-600">Please log in to view and edit your profile.</p>
          <button
            onClick={() => window.location.href = "/login"}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go to Login
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        
        {/* ... (Rest of the JSX remains the same) ... */}
        
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 px-8 py-10 text-white">
          <button
            onClick={onBack}
            className="mb-6 text-white/80 hover:text-white"
          >
            ← Back to Dashboard
          </button>

          <div className="flex items-center gap-6">
            <div className="relative">
              {/* Image rendering is fine */}
              {formData.photoURL ? (
                <img 
                  src={formData.photoURL} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full shadow-xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                  <User size={48} className="text-blue-500" />
                </div>
              )}
              {formData.emailVerified && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle size={16} className="text-white" />
                </div>
              )}
              {isEditing && (
                <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-2">
                  <button
                    onClick={handleUploadClick}
                    className="p-2 bg-blue-500 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
                    title="Upload photo"
                  >
                    <Camera size={16} className="text-white" />
                  </button>
                  {formData.photoURL && (
                    <button
                      onClick={handleRemovePhoto}
                      className="p-2 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      title="Remove photo"
                    >
                      <Trash2 size={16} className="text-white" />
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {formData.firstName || formData.lastName ? 
                  `${formData.firstName} ${formData.lastName}`.trim() : 
                  'User Profile'
                }
              </h1>
              <p className="text-blue-100 text-lg mt-1">
                {formData.position && formData.company ? 
                  `${formData.position} at ${formData.company}` : 
                  'IP Intelligence Platform User'
                }
              </p>
              {formData.emailVerified && (
                <p className="text-green-200 text-sm mt-2 flex items-center gap-1">
                  <Shield size={14} /> Verified Account
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Profile Information</h2>

            {!isEditing ? (
              <button
                onClick={() => {
                  if (!currentUID) {
                    alert('Please log in to edit your profile');
                    return;
                  }
                  setIsEditing(true);
                }}
                className={`px-6 py-3 rounded-xl ${
                  currentUID 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!currentUID}
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className={`px-6 py-3 rounded-xl transition-all ${isSaving ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* ... (Rest of the fields are fine) ... */}
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Basic Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <User className="text-blue-500" size={20} />
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-500">First Name</label>
                    {!isEditing ? (
                      <p className="text-gray-800">{formData.firstName || 'Not specified'}</p>
                    ) : (
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName || ''}
                        onChange={handleChange}
                        placeholder="Enter first name"
                        className="w-full px-3 py-1 border border-gray-300 rounded mt-1"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <User className="text-blue-500" size={20} />
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-500">Last Name</label>
                    {!isEditing ? (
                      <p className="text-gray-800">{formData.lastName || 'Not specified'}</p>
                    ) : (
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName || ''}
                        onChange={handleChange}
                        placeholder="Enter last name"
                        className="w-full px-3 py-1 border border-gray-300 rounded mt-1"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Mail className="text-blue-500" size={20} />
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email Address</label>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-800">{formData.email || 'Not specified'}</p>
                      {formData.emailVerified ? (
                        <CheckCircle className="text-green-500" size={16} title="Verified" />
                      ) : (
                        <XCircle className="text-red-500" size={16} title="Not verified" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Building className="text-blue-500" size={20} />
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-500">Company</label>
                    {!isEditing ? (
                      <p className="text-gray-800">{formData.company || 'Not specified'}</p>
                    ) : (
                      <input
                        type="text"
                        name="company"
                        value={formData.company || ''}
                        onChange={handleChange}
                        placeholder="Enter company name"
                        className="w-full px-3 py-1 border border-gray-300 rounded mt-1"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Briefcase className="text-blue-500" size={20} />
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-500">Position</label>
                    {!isEditing ? (
                      <p className="text-gray-800">{formData.position || 'Not specified'}</p>
                    ) : (
                      <input
                        type="text"
                        name="position"
                        value={formData.position || ''}
                        onChange={handleChange}
                        placeholder="Enter job position"
                        className="w-full px-3 py-1 border border-gray-300 rounded mt-1"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Phone className="text-blue-500" size={20} />
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-500">Phone Number</label>
                    {!isEditing ? (
                      <p className="text-gray-800">{formData.phoneNumber || 'Not specified'}</p>
                    ) : (
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber || ''}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        className="w-full px-3 py-1 border border-gray-300 rounded mt-1"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Account ID</label>
                  <p className="text-gray-800 font-mono text-xs">{formData.uid || 'Not available'}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Sign-in Method</label>
                  <p className="text-gray-800 capitalize">
                    {formData.authProvider === 'email' ? '📧 Email/Password' : 
                      formData.authProvider === 'google' ? '🌐 Google' : 
                      'Not available'}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Account Status</label>
                  <div className="flex items-center gap-2">
                    {formData.emailVerified ? (
                      <>
                        <CheckCircle className="text-green-500" size={20} />
                        <span className="text-green-600 font-medium">Verified</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="text-red-500" size={20} />
                        <span className="text-red-600 font-medium">Not Verified</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Calendar className="text-blue-500" size={20} />
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Account Created</label>
                    <p className="text-gray-800">
                      {(() => {
                        try {
                          if (formData.createdAt && formData.createdAt.seconds) {
                            return new Date(formData.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            });
                          } else if (formData.createdAt) {
                            return new Date(formData.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            });
                          } else if (formData.creationTime) {
                            return new Date(formData.creationTime).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            });
                          }
                          return 'Not available';
                        } catch (error) {
                          console.error('Error formatting createdAt:', error);
                          return 'Not available';
                        }
                      })()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Calendar className="text-purple-500" size={20} />
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-gray-800">
                      {(() => {
                        try {
                          if (formData.updatedAt && formData.updatedAt.seconds) {
                            return new Date(formData.updatedAt.seconds * 1000).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            });
                          } else if (formData.updatedAt) {
                            return new Date(formData.updatedAt).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            });
                          }
                          return 'Not available';
                        } catch (error) {
                          console.error('Error formatting updatedAt:', error);
                          return 'Not available';
                        }
                      })()}
                    </p>
                  </div>
                </div>


              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default ProfilePage;

