import React, { useState } from "react";
import { 
  User, Mail, Phone, Building, MapPin, FileText, Lightbulb, 
  Upload, CreditCard, CheckCircle2, AlertCircle, ArrowRight, 
  ArrowLeft, X, Calendar, Globe, Users, FileCheck, IndianRupee,
  Lock, Crown, Sparkles
} from "lucide-react";
import { auth } from "../firebase";
import UpgradeModal from "./UpgradeModal";
import { getAllStatesAndUTs, getDistricts } from "../data/indianStatesDistricts";
import { API_BASE_URL } from "../config/api";

const PatentFilingForm = ({ onClose, userProfile, onAddNotification, onFilingSuccess }) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [showStepSuccess, setShowStepSuccess] = useState(false);
  const [nextStepNumber, setNextStepNumber] = useState(2);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Get Indian States and UTs from data file
  const indianStatesAndUTs = getAllStatesAndUTs();
  
  // State for districts based on selected state
  const [availableDistricts, setAvailableDistricts] = useState([]);

  const inventionFields = [
    "Computer Science & IT", "Electronics & Communication", "Mechanical Engineering",
    "Civil Engineering", "Biotechnology", "Chemical Engineering", "Pharmaceutical",
    "Agriculture", "Medical Devices", "Environmental Technology", "Automotive",
    "Aerospace", "Nanotechnology", "Artificial Intelligence", "Internet of Things",
    "Robotics", "Renewable Energy", "Materials Science", "Other"
  ];
  
  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Applicant Information
    applicantName: "",
    applicantEmail: auth.currentUser?.email || userProfile?.email || "", // Auto-fill with user's email
    applicantPhone: "",
    applicantAddress: "",
    applicantCountry: "India",
    applicantState: "",
    applicantDistrict: "",
    applicantCity: "",
    applicantPincode: "",
    organizationName: "",
    applicantType: "individual", // individual, organization, joint
    
    // Personal Details
    dateOfBirth: "",
    age: "",
    gender: "",
    occupation: "",
    educationalQualification: "",
    designation: "",
    applicationDate: new Date().toISOString().split('T')[0], // Today's date
    
    // Additional applicant details
    alternatePhone: "",
    alternateEmail: "",
    gstin: "",
    aadhaarNumber: "",
    panNumber: "",
    
    // Government ID Details
    govtIdType: "", // aadhaar, pan, passport, voterId, drivingLicense
    govtIdNumber: "",
    passportCountry: "",
    drivingLicenseState: "",
    
    // Co-inventors (for joint applications)
    coInventors: [],
    
    // Correspondence details
    correspondenceAddress: "",
    correspondenceCity: "",
    correspondenceState: "",
    correspondencePincode: "",
    sameAsApplicantAddress: true,
    
    // Step 2: Invention Details
    inventionTitle: "",
    inventionField: "",
    inventionDescription: "",
    technicalProblem: "",
    proposedSolution: "",
    advantages: "",
    priorArt: "",
    keywords: "",
    commercialApplication: "",
    targetIndustry: "",
    
    // Step 3: Patent Details
    patentType: "provisional", // provisional, complete
    filingType: "national", // national, international
    priorityDate: "",
    priorityNumber: "",
    claimsPriority: false,
    numberOfClaims: "",
    numberOfDrawings: "",
    
    // Step 4: Documents (Cloud Storage Links)
    descriptionFileUrl: "",
    claimsFileUrl: "",
    abstractFileUrl: "",
    drawingsFileUrl: "",
    
    // Step 5: Payment
    paymentAmount: 500,
    agreedToTerms: false,
  });

  const [errors, setErrors] = useState({});

  // Step configuration
  const steps = [
    { number: 1, title: "Applicant Information", icon: User },
    { number: 2, title: "Invention Details", icon: Lightbulb },
    { number: 3, title: "Patent Details", icon: FileCheck },
    { number: 4, title: "Documents Upload", icon: Upload },
    { number: 5, title: "Review & Payment", icon: CreditCard },
  ];

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // If state is changed, update available districts
    if (name === 'applicantState') {
      const districts = getDistricts(value);
      setAvailableDistricts(districts);
      // Reset district and city when state changes
      setFormData(prev => ({
        ...prev,
        [name]: value,
        applicantDistrict: '', // Clear district selection
        applicantCity: '' // Clear city
      }));
    } else if (name === 'applicantDistrict') {
      // Auto-fill city with district value
      setFormData(prev => ({
        ...prev,
        applicantDistrict: value,
        applicantCity: value // Set city to district name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validate URL format
  const isValidUrl = (url) => {
    if (!url || url.trim() === "") return false;
    try {
      const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
      return urlPattern.test(url) || url.includes('drive.google.com') || url.includes('dropbox.com') || url.includes('onedrive.live.com');
    } catch {
      return false;
    }
  };

  // Validation functions for each step
  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.applicantName.trim()) newErrors.applicantName = "Name is required";
    if (!formData.applicantEmail.trim()) {
      newErrors.applicantEmail = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.applicantEmail)) {
      newErrors.applicantEmail = "Invalid email format";
    }
    if (!formData.applicantPhone.trim()) {
      newErrors.applicantPhone = "Phone is required";
    } else if (!/^\d{10}$/.test(formData.applicantPhone.replace(/\D/g, ''))) {
      newErrors.applicantPhone = "Invalid phone number (10 digits required)";
    }
    if (!formData.applicantAddress.trim()) newErrors.applicantAddress = "Address is required";
    if (!formData.applicantState.trim()) newErrors.applicantState = "State/UT is required";
    if (!formData.applicantDistrict.trim()) newErrors.applicantDistrict = "District is required";
    if (!formData.applicantCity.trim()) newErrors.applicantCity = "City is required";
    if (!formData.applicantPincode.trim()) {
      newErrors.applicantPincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.applicantPincode)) {
      newErrors.applicantPincode = "Invalid pincode (6 digits required)";
    }
    if (formData.applicantType === 'organization' && !formData.organizationName.trim()) {
      newErrors.organizationName = "Organization name is required";
    }
    
    // Government ID Validation (Mandatory)
    if (!formData.govtIdType) {
      newErrors.govtIdType = "Government ID type is required (compulsory)";
    } else {
      if (!formData.govtIdNumber.trim()) {
        newErrors.govtIdNumber = "Government ID number is required";
      } else {
        // Validate based on ID type
        switch(formData.govtIdType) {
          case 'aadhaar':
            if (!/^\d{12}$/.test(formData.govtIdNumber.replace(/\s/g, ''))) {
              newErrors.govtIdNumber = "Aadhaar must be exactly 12 digits";
            }
            break;
          case 'pan':
            if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.govtIdNumber)) {
              newErrors.govtIdNumber = "Invalid PAN format (e.g., ABCDE1234F)";
            }
            break;
          case 'passport':
            if (!formData.govtIdNumber.trim()) {
              newErrors.govtIdNumber = "Passport number is required";
            }
            if (!formData.passportCountry.trim()) {
              newErrors.passportCountry = "Passport country is required";
            }
            break;
          case 'voterId':
            if (!formData.govtIdNumber.trim()) {
              newErrors.govtIdNumber = "Voter ID number is required";
            }
            break;
          case 'drivingLicense':
            if (!formData.govtIdNumber.trim()) {
              newErrors.govtIdNumber = "Driving License number is required";
            }
            if (!formData.drivingLicenseState.trim()) {
              newErrors.drivingLicenseState = "State of issue is required";
            }
            break;
        }
      }
    }
    
    return newErrors;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.inventionTitle.trim()) newErrors.inventionTitle = "Title is required";
    if (formData.inventionTitle.length < 10) {
      newErrors.inventionTitle = "Title should be at least 10 characters";
    }
    if (!formData.inventionField.trim()) newErrors.inventionField = "Field of invention is required";
    if (!formData.inventionDescription.trim()) {
      newErrors.inventionDescription = "Description is required";
    } else if (formData.inventionDescription.length < 100) {
      newErrors.inventionDescription = "Description should be at least 100 characters";
    }
    if (!formData.technicalProblem.trim()) newErrors.technicalProblem = "Technical problem is required";
    if (!formData.proposedSolution.trim()) newErrors.proposedSolution = "Proposed solution is required";
    if (!formData.advantages.trim()) newErrors.advantages = "Advantages are required";
    return newErrors;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.numberOfClaims) {
      newErrors.numberOfClaims = "Number of claims is required";
    } else if (formData.numberOfClaims < 1 || formData.numberOfClaims > 30) {
      newErrors.numberOfClaims = "Claims should be between 1 and 30";
    }
    if (formData.claimsPriority && !formData.priorityDate) {
      newErrors.priorityDate = "Priority date is required";
    }
    if (formData.claimsPriority && !formData.priorityNumber.trim()) {
      newErrors.priorityNumber = "Priority number is required";
    }
    return newErrors;
  };

  const validateStep4 = () => {
    const newErrors = {};
    if (!formData.descriptionFileUrl.trim()) {
      newErrors.descriptionFileUrl = "Description document link is required";
    } else if (!isValidUrl(formData.descriptionFileUrl)) {
      newErrors.descriptionFileUrl = "Please enter a valid URL";
    }
    
    if (!formData.claimsFileUrl.trim()) {
      newErrors.claimsFileUrl = "Claims document link is required";
    } else if (!isValidUrl(formData.claimsFileUrl)) {
      newErrors.claimsFileUrl = "Please enter a valid URL";
    }
    
    if (!formData.abstractFileUrl.trim()) {
      newErrors.abstractFileUrl = "Abstract document link is required";
    } else if (!isValidUrl(formData.abstractFileUrl)) {
      newErrors.abstractFileUrl = "Please enter a valid URL";
    }
    
    if (formData.drawingsFileUrl && !isValidUrl(formData.drawingsFileUrl)) {
      newErrors.drawingsFileUrl = "Please enter a valid URL";
    }
    
    return newErrors;
  };

  const validateStep5 = () => {
    const newErrors = {};
    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = "You must agree to terms and conditions";
    }
    return newErrors;
  };

  // Navigate to next step
  const handleNext = () => {
    let validationErrors = {};
    
    switch (currentStep) {
      case 1:
        validationErrors = validateStep1();
        break;
      case 2:
        validationErrors = validateStep2();
        break;
      case 3:
        validationErrors = validateStep3();
        break;
      case 4:
        validationErrors = validateStep4();
        break;
      case 5:
        validationErrors = validateStep5();
        break;
      default:
        break;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      
      // Show toast message
      setToastMessage('⚠️ Please fill all the required details before proceeding to the next step');
      setShowToast(true);
      
      // Auto-hide toast after 4 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 4000);
      
      // Scroll to first error
      const firstErrorField = document.querySelector('.border-red-400');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setErrors({});
    if (currentStep < 5) {
      setNextStepNumber(currentStep + 1);
      setShowStepSuccess(true);
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Navigate to previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // No file upload needed - using cloud storage URLs directly

  // Handle Razorpay Payment
  const initiatePayment = async () => {
    return new Promise((resolve, reject) => {
      // Check if Razorpay key is configured
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      
      if (!razorpayKey || razorpayKey === 'rzp_test_your_key_here') {
        console.warn('Razorpay key not configured. Using test mode.');
        // For testing without Razorpay
        resolve({
          success: true,
          paymentId: 'test_' + Date.now(),
          orderId: 'order_test_' + Date.now(),
          signature: 'test_signature',
        });
        return;
      }

      // Check if Razorpay is already loaded
      if (window.Razorpay) {
        openRazorpay(resolve, reject, razorpayKey);
        return;
      }

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onerror = () => {
        console.error('Failed to load Razorpay SDK');
        // Fallback to test mode if Razorpay fails to load
        resolve({
          success: true,
          paymentId: 'fallback_' + Date.now(),
          orderId: 'order_fallback_' + Date.now(),
          signature: 'fallback_signature',
        });
      };
      script.onload = () => {
        openRazorpay(resolve, reject, razorpayKey);
      };
      document.body.appendChild(script);
    });
  };

  // Open Razorpay checkout
  const openRazorpay = (resolve, reject, razorpayKey) => {
    try {
      const options = {
        key: razorpayKey,
        amount: formData.paymentAmount * 100, // Amount in paise
        currency: 'INR',
        name: 'Global IP Platform',
        description: 'Patent Filing Fee',
        handler: function (response) {
          console.log('Payment successful:', response);
          resolve({
            success: true,
            paymentId: response.razorpay_payment_id || 'pay_' + Date.now(),
            orderId: response.razorpay_order_id || 'order_' + Date.now(),
            signature: response.razorpay_signature || 'sig_' + Date.now(),
          });
        },
        prefill: {
          name: formData.applicantName,
          email: formData.applicantEmail,
          contact: formData.applicantPhone,
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: function() {
            reject(new Error('Payment cancelled by user'));
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        reject(new Error(response.error.description || 'Payment failed'));
      });
      razorpay.open();
    } catch (error) {
      console.error('Error opening Razorpay:', error);
      reject(error);
    }
  };

  // Submit the form
  const handleSubmit = async () => {
    // Validate final step
    const validationErrors = validateStep5();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Starting patent filing submission...');
      
      // Get userId from multiple sources (auth.currentUser has priority, then userProfile as fallback)
      const userId = auth.currentUser?.uid || userProfile?.uid || userProfile?.id;
      console.log('User ID sources:', {
        fromAuth: auth.currentUser?.uid,
        fromProfileUid: userProfile?.uid,
        fromProfileId: userProfile?.id,
        finalUserId: userId
      });
      
      if (!userId) {
        console.error('❌ Cannot determine user ID from any source');
        alert('⚠️ Authentication Error!\n\nCannot determine your user ID. Please:\n1. Logout from dashboard\n2. Login again\n3. Try submitting the patent filing again.\n\nIf the problem persists, clear browser cache and cookies.');
        setIsSubmitting(false);
        return;
      }
      
      console.log('✅ Using User ID for submission:', userId);
      
      // 1. Initiate payment
      console.log('Initiating payment...');
      const paymentResult = await initiatePayment();
      console.log('Payment result:', paymentResult);
      
      if (!paymentResult.success) {
        throw new Error('Payment failed');
      }

      console.log('Preparing data for PostgreSQL...');
      
      // Get user email from multiple sources
      const userEmail = auth.currentUser?.email || userProfile?.email || formData.applicantEmail;
      console.log('User email for submission:', userEmail);
      
      // Store email in localStorage for persistent access
      if (userEmail) {
        localStorage.setItem('userEmail', userEmail);
        console.log('Stored user email in localStorage');
      }
      
      // 2. Prepare data for PostgreSQL
      const filingData = {
        // User info - Using validated userId from above
        userId: userId,  // Always valid - checked above
        userEmail: userEmail,
        userName: userProfile?.name || formData.applicantName,
        
        // Applicant Information (flattened for PostgreSQL)
        applicantName: formData.applicantName,
        applicantEmail: formData.applicantEmail,
        applicantPhone: formData.applicantPhone,
        applicantAddress: formData.applicantAddress,
        applicantCity: formData.applicantCity,
        applicantState: formData.applicantState,
        applicantPincode: formData.applicantPincode,
        applicantCountry: formData.applicantCountry,
        organizationName: formData.organizationName || null,
        applicantType: formData.applicantType,
        
        // Personal Details
        dateOfBirth: formData.dateOfBirth || null,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        occupation: formData.occupation || null,
        designation: formData.designation || null,
        educationalQualification: formData.educationalQualification || null,
        applicationDate: formData.applicationDate,
        
        // Government ID Details
        govtIdType: formData.govtIdType || null,
        govtIdNumber: formData.govtIdNumber || null,
        aadhaarNumber: formData.aadhaarNumber || null,
        panNumber: formData.panNumber || null,
        passportCountry: formData.passportCountry || null,
        drivingLicenseState: formData.drivingLicenseState || null,
        
        // Additional Contact & Address
        alternatePhone: formData.alternatePhone || null,
        alternateEmail: formData.alternateEmail || null,
        gstin: formData.gstin || null,
        sameAsApplicantAddress: formData.sameAsApplicantAddress || false,
        correspondenceAddress: formData.correspondenceAddress || null,
        correspondenceCity: formData.correspondenceCity || null,
        correspondenceState: formData.correspondenceState || null,
        correspondencePincode: formData.correspondencePincode || null,
        
        // Invention Details
        inventionTitle: formData.inventionTitle,
        inventionField: formData.inventionField,
        inventionDescription: formData.inventionDescription,
        technicalProblem: formData.technicalProblem,
        proposedSolution: formData.proposedSolution,
        advantages: formData.advantages,
        priorArt: formData.priorArt || null,
        keywords: formData.keywords || null,
        commercialApplication: formData.commercialApplication || null,
        targetIndustry: formData.targetIndustry || null,
        
        // Patent Details
        patentType: formData.patentType,
        filingType: formData.filingType,
        priorityDate: formData.priorityDate || null,
        priorityNumber: formData.priorityNumber || null,
        claimsPriority: formData.claimsPriority,
        numberOfClaims: parseInt(formData.numberOfClaims) || 0,
        numberOfDrawings: parseInt(formData.numberOfDrawings) || 0,
        
        // Documents (Cloud Storage URLs)
        descriptionFileUrl: formData.descriptionFileUrl,
        claimsFileUrl: formData.claimsFileUrl,
        abstractFileUrl: formData.abstractFileUrl,
        drawingsFileUrl: formData.drawingsFileUrl || null,
        
        // Payment Info
        paymentAmount: parseFloat(formData.paymentAmount),
        paymentCurrency: 'INR',
        paymentId: paymentResult.paymentId,
        paymentOrderId: paymentResult.orderId || null,
        paymentSignature: paymentResult.signature || null,
        paymentStatus: 'completed',
        paymentTimestamp: new Date().toISOString(),
        agreedToTerms: formData.agreedToTerms || false,
        
        // Status
        status: 'submitted',
        filingDate: new Date().toISOString(),
      };

      console.log('=== SUBMITTING PATENT FILING ===');
      console.log('User Email:', filingData.userEmail);
      console.log('Applicant Email:', filingData.applicantEmail);
      console.log('Invention Title:', filingData.inventionTitle);
      console.log('Full filing data:', filingData);
      
      // 3. Submit to PostgreSQL via backend API
      const response = await fetch(`${API_BASE_URL}/patent-filing/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filingData),
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to submit patent filing');
      }
      
      console.log('✅ Patent filing submitted successfully!');
      console.log('   Filing ID:', result.filingId);
      console.log('   Saved with emails:', result.savedData);
      
      setIsSubmitting(false);
      
      // Add notification
      if (onAddNotification) {
        onAddNotification({
          type: 'success',
          message: `Patent filing submitted successfully! Filing ID: ${result.filingId}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Immediately refresh the filings list
      console.log('🔄 Refreshing filings list...');
      if (onFilingSuccess) {
        await onFilingSuccess();
      }
      
      // Show success message briefly
      setShowSuccess(true);
      
      // Close the form and navigate to filing tracker after a brief moment
      setTimeout(() => {
        setShowSuccess(false);
        
        if (onClose) {
          onClose();
        }
      }, 1500);

    } catch (error) {
      console.error('❌ Error submitting patent filing:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      let errorMessage = 'Failed to submit patent filing. ';
      
      if (error.message.includes('Authentication required')) {
        errorMessage = 'Authentication Error! Please logout and login again to submit patent filing.';
      } else if (error.message.includes('Payment cancelled')) {
        errorMessage = 'Payment was cancelled. Please try again.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Database permission error. Please contact support.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please ensure you are logged in.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      alert(errorMessage);
      
      if (onAddNotification) {
        onAddNotification({
          type: 'error',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user has basic subscription
  const isBasicUser = !userProfile?.subscriptionType || userProfile?.subscriptionType.toLowerCase() === 'basic';

  // Show upgrade prompt for basic users
  if (isBasicUser) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
            {/* Header with Close Button */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Patent Filing</h2>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={24} className="text-gray-600" />
                </button>
              )}
            </div>

            {/* Upgrade Prompt for Basic Users */}
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full opacity-20 blur-2xl"></div>
                <div className="relative p-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-2xl">
                  <Lock size={64} className="text-white" />
                </div>
              </div>
              
              <h3 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                Premium Feature
              </h3>
              
              <p className="text-lg text-gray-600 mb-2 text-center max-w-2xl">
                File your patent applications seamlessly with our integrated filing system.
              </p>
              
              <p className="text-md text-gray-500 mb-8 text-center max-w-2xl">
                Upgrade to <span className="font-semibold text-blue-600">Pro</span> or <span className="font-semibold text-purple-600">Enterprise</span> plan to unlock:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-10 max-w-3xl w-full">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <FileCheck size={20} className="text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-800">Direct Patent Filing</h4>
                  </div>
                  <p className="text-sm text-gray-600">Submit patent applications directly through our platform with step-by-step guidance</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <CreditCard size={20} className="text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-800">Integrated Payments</h4>
                  </div>
                  <p className="text-sm text-gray-600">Secure payment processing with Razorpay for government fees and filing charges</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <Upload size={20} className="text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-800">Document Upload</h4>
                  </div>
                  <p className="text-sm text-gray-600">Upload and manage all required documents, drawings, and specifications</p>
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border border-pink-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-pink-500 rounded-lg">
                      <CheckCircle2 size={20} className="text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-800">Application Tracking</h4>
                  </div>
                  <p className="text-sm text-gray-600">Track your application status through every stage of the review process</p>
                </div>
              </div>

              <button
                onClick={() => setShowUpgradeModal(true)}
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                <div className="relative flex items-center gap-3">
                  <Crown size={24} className="animate-pulse" />
                  <span>Upgrade to Pro Now</span>
                  <Sparkles size={20} />
                </div>
              </button>

              <p className="text-sm text-gray-500 mt-6">
                Start filing your patents with professional support and guidance
              </p>
            </div>
          </div>
        </div>

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          userProfile={userProfile}
          onAddNotification={onAddNotification}
        />
      </>
    );
  }

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="bg-white rounded-2xl p-10 shadow-2xl max-w-lg w-full border-4 border-green-500">
          <div className="text-center">
            <div className="mb-6 relative">
              <CheckCircle2 size={100} className="text-green-500 mx-auto animate-bounce" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-green-100 rounded-full animate-ping opacity-75"></div>
              </div>
            </div>
            <h3 className="text-4xl font-bold text-gray-800 mb-4">Successfully Submitted!</h3>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-800 font-semibold mb-2">
                ✅ Patent Filing Submitted
              </p>
              <p className="text-green-700 mb-2">
                💳 Payment Confirmed (₹{formData.paymentAmount})
              </p>
              <p className="text-green-700">
                📄 All documents received
              </p>
            </div>
            <p className="text-gray-600 mb-2">
              Your patent filing application has been successfully submitted to our database.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              You will receive a confirmation email shortly with your filing details.
            </p>
            <div className="mt-6 text-sm text-blue-600 font-medium">
              Redirecting to dashboard in 3 seconds...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Warning Toast */}
      {showWarning && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] px-4 w-full max-w-xl pointer-events-none">
          <div className="relative group pointer-events-auto">
            {/* Rotating Border Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-xl opacity-75 group-hover:opacity-100 blur-sm group-hover:blur transition-all duration-500 animate-spin-slow"></div>
            
            {/* Main Content Card */}
            <div className="relative bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/50 overflow-hidden transform transition-all duration-300 hover:scale-[1.01]">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 rounded-t-xl">
                <h3 className="text-base font-bold text-white flex items-center">
                  <AlertCircle size={18} className="mr-2 animate-pulse" />
                  Important Notice
                </h3>
              </div>
              <div className="p-4 max-h-[550px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-100">
                <div className="space-y-2.5">
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 p-2.5 rounded-lg shadow-sm">
                    <p className="text-gray-800 font-bold text-sm mb-1 flex items-center gap-1.5">
                      <span className="text-base">⚠️</span> Single-Session Form Submission
                    </p>
                    <p className="text-gray-700 text-xs leading-relaxed">
                      This patent filing form must be completed in <strong className="text-orange-700">one continuous session</strong>.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-2.5 rounded-lg shadow-sm">
                    <p className="text-red-800 font-bold mb-1.5 text-sm flex items-center gap-1.5">
                      <span className="text-base">❌</span> No Auto-Save Feature
                    </p>
                    <ul className="text-gray-700 space-y-1 text-xs">
                      <li className="flex items-start gap-1.5">
                        <span className="text-red-500 mt-0.5 text-xs">•</span>
                        <span>Your data will <strong className="text-red-700">NOT be saved</strong> if you leave this form</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-red-500 mt-0.5 text-xs">•</span>
                        <span>Closing the form will <strong className="text-red-700">delete all entered information</strong></span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-red-500 mt-0.5 text-xs">•</span>
                        <span>You will need to <strong className="text-red-700">start over from the beginning</strong></span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-2.5 rounded-lg shadow-sm">
                    <p className="text-green-800 font-bold mb-1.5 text-sm flex items-center gap-1.5">
                      <span className="text-base">✅</span> How to Proceed
                    </p>
                    <ul className="text-gray-700 space-y-1 text-xs">
                      <li className="flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5 text-xs">•</span>
                        <span>Keep all required documents ready before starting</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5 text-xs">•</span>
                        <span>Complete all 5 steps without interruption</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5 text-xs">•</span>
                        <span>Only submit when you've filled everything</span>
                      </li>
                    </ul>
                  </div>

                  <p className="text-[10px] text-gray-600 text-center italic bg-blue-50/50 p-2 rounded-lg border border-blue-200">
                    Please ensure you have enough time to complete the entire form before proceeding.
                  </p>
                </div>

                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowWarning(false)}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-lg text-xs"
                  >
                    <CheckCircle2 size={16} />
                    I Understand, Let's Proceed
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Message */}
      {showToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-300">
          <div className="bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-[500px]">
            <AlertCircle size={24} className="flex-shrink-0" />
            <p className="font-semibold text-sm sm:text-base">{toastMessage}</p>
            <button
              onClick={() => setShowToast(false)}
              className="ml-auto flex-shrink-0 hover:bg-red-600 rounded-full p-1 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Step Success Notification */}
      {showStepSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[99] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-4 border-green-400 animate-fadeIn">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 rounded-t-xl relative">
              <button
                onClick={() => setShowStepSuccess(false)}
                className="absolute top-3 right-3 text-white hover:text-gray-200 transition"
              >
                <X size={24} />
              </button>
              <h3 className="text-2xl font-bold text-white flex items-center">
                <CheckCircle2 size={28} className="mr-3" />
                Step Completed!
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p className="text-green-800 font-bold text-lg mb-2">
                  ✅ Step {currentStep - 1} Completed Successfully!
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Great progress! You've successfully validated and completed this step.
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-blue-800 font-bold mb-2">
                  📋 Now on Step {nextStepNumber}:
                </p>
                <p className="text-gray-700 font-semibold">
                  {nextStepNumber === 2 && "Invention Details"}
                  {nextStepNumber === 3 && "Patent Specifications"}
                  {nextStepNumber === 4 && "Document Upload"}
                  {nextStepNumber === 5 && "Review & Payment"}
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  Please fill the data of the next step carefully.
                </p>
              </div>

              <button
                onClick={() => setShowStepSuccess(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight size={20} />
                Continue to Next Step
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Header with Integrated Progress - Professional Water Drop Theme */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-cyan-500 via-blue-500 to-sky-500 shadow-xl border-b-2 border-cyan-200/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Layout - Single Line */}
          <div className="hidden lg:flex items-center justify-between gap-4 h-20">
            {/* Left - Title */}
            <div className="flex-shrink-0 drop-shadow-lg">
              <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 whitespace-nowrap">
                <FileText size={24} className="drop-shadow-md" />
                <span className="drop-shadow-md">Patent Filing Application</span>
              </h1>
              <p className="text-xs text-white/90 mt-0.5 font-medium drop-shadow">
                Step {currentStep} of 5
              </p>
            </div>

            {/* Center - Progress Steps */}
            <div className="flex-1 max-w-3xl mx-4">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  return (
                    <div key={step.number} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`
                          flex items-center justify-center w-11 h-11 rounded-full border-2 transition-all duration-300
                          ${currentStep >= step.number 
                            ? 'bg-white text-cyan-600 border-white shadow-lg drop-shadow-xl scale-110' 
                            : 'border-white/50 text-white/70 bg-white/20 hover:bg-white/30 hover:border-white/70 hover:scale-105 backdrop-blur-sm'
                          }
                          ${currentStep === step.number ? 'ring-4 ring-white/50 animate-pulse shadow-2xl' : ''}
                        `}>
                          <StepIcon size={20} className="font-bold" />
                        </div>
                        <p className={`
                          text-[10px] mt-1.5 text-center font-semibold drop-shadow
                          ${currentStep >= step.number ? 'text-white' : 'text-white/70'}
                        `}>
                          {step.title}
                        </p>
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`
                          h-1 w-full transition-all duration-500 rounded-full mx-1 shadow-sm
                          ${currentStep > step.number ? 'bg-white drop-shadow-md' : 'bg-white/30'}
                        `} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right - Close Button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2.5 rounded-xl bg-white/20 hover:bg-red-500 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/40 hover:border-red-400 shadow-lg hover:shadow-2xl hover:shadow-red-500/50 group"
              title="Close"
            >
              <X size={24} className="text-white drop-shadow group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Mobile/Tablet Layout - Stacked */}
          <div className="lg:hidden py-4">
            {/* Top Row - Title and Close */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 drop-shadow-lg">
                <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <FileText size={20} className="drop-shadow-md" />
                  <span className="drop-shadow-md">Patent Filing Application</span>
                </h1>
                <p className="text-xs text-white/90 mt-0.5 font-medium drop-shadow">
                  Step {currentStep} of 5: {steps[currentStep - 1].title}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 ml-3 p-2.5 rounded-xl bg-white/20 hover:bg-red-500 backdrop-blur-sm transition-all duration-300 hover:scale-110 border border-white/40 hover:border-red-400 shadow-lg hover:shadow-2xl hover:shadow-red-500/50 group"
                title="Close"
              >
                <X size={22} className="text-white drop-shadow group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Bottom Row - Progress Steps */}
            <div className="flex items-center justify-between px-2">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <div key={step.number} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`
                        flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                        ${currentStep >= step.number 
                          ? 'bg-white text-cyan-600 border-white shadow-lg drop-shadow-xl scale-110' 
                          : 'border-white/50 text-white/70 bg-white/20 hover:bg-white/30 hover:border-white/70 backdrop-blur-sm'
                        }
                        ${currentStep === step.number ? 'ring-4 ring-white/50 animate-pulse shadow-2xl' : ''}
                      `}>
                        <StepIcon size={18} className="font-bold" />
                      </div>
                      <p className={`
                        text-[8px] sm:text-[9px] mt-1 text-center font-semibold drop-shadow
                        ${currentStep >= step.number ? 'text-white' : 'text-white/70'}
                      `}>
                        {step.title}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`
                        h-1 w-full transition-all duration-500 rounded-full mx-0.5 sm:mx-1 shadow-sm
                        ${currentStep > step.number ? 'bg-white drop-shadow-md' : 'bg-white/30'}
                      `} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Enhanced Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="relative group">
          {/* Decorative gradient border */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl opacity-20 group-hover:opacity-30 blur transition-all duration-500"></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            {/* Form Content */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-h-[600px] bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20">
          {/* Step 1: Applicant Information */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Applicant Type *
                </label>
                <div className="flex gap-4">
                  {['individual', 'organization', 'joint'].map(type => (
                    <label key={type} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="applicantType"
                        value={type}
                        checked={formData.applicantType === type}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span className="capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    <User size={16} className="inline mr-1" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="applicantName"
                    value={formData.applicantName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition ${
                      errors.applicantName ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    placeholder="Enter your full name"
                  />
                  {errors.applicantName && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.applicantName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    <Mail size={16} className="inline mr-1" />
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="applicantEmail"
                      value={formData.applicantEmail}
                      readOnly
                      disabled
                      className="w-full px-4 py-3 rounded-xl border-2 bg-gray-100 text-gray-700 cursor-not-allowed border-gray-300"
                      placeholder="your.email@example.com"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Lock size={16} className="text-gray-500" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <Lock size={10} className="mr-1" />
                    Email is automatically set from your account and cannot be changed
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    <Phone size={16} className="inline mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="applicantPhone"
                    value={formData.applicantPhone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition ${
                      errors.applicantPhone ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    placeholder="10-digit mobile number"
                  />
                  {errors.applicantPhone && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.applicantPhone}
                    </p>
                  )}
                </div>

                {formData.applicantType === 'organization' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      <Building size={16} className="inline mr-1" />
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition ${
                        errors.organizationName ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="Company/Organization name"
                    />
                    {errors.organizationName && (
                      <p className="text-red-500 text-xs mt-1 flex items-center">
                        <AlertCircle size={12} className="mr-1" />
                        {errors.organizationName}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Personal Details Section - Only for individuals */}
              {formData.applicantType === 'individual' && (
                <div className="border-t-2 border-gray-300 pt-6 mt-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center">
                    <User size={22} className="mr-2 text-blue-600" />
                    Personal Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        <Calendar size={16} className="inline mr-1" />
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={(e) => {
                          handleInputChange(e);
                          // Calculate age automatically
                          if (e.target.value) {
                            const today = new Date();
                            const birthDate = new Date(e.target.value);
                            let age = today.getFullYear() - birthDate.getFullYear();
                            const monthDiff = today.getMonth() - birthDate.getMonth();
                            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                              age--;
                            }
                            setFormData(prev => ({ ...prev, age: age.toString() }));
                          }
                        }}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        Age
                      </label>
                      <input
                        type="text"
                        name="age"
                        value={formData.age}
                        readOnly
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 bg-gray-100 text-gray-700 font-semibold cursor-not-allowed"
                        placeholder="Auto-calculated"
                      />
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        Calculated from DOB
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        <Users size={16} className="inline mr-1" />
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        <Building size={16} className="inline mr-1" />
                        Occupation/Profession
                      </label>
                      <input
                        type="text"
                        name="occupation"
                        value={formData.occupation}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="e.g., Engineer, Researcher, Entrepreneur"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        Educational Qualification
                      </label>
                      <select
                        name="educationalQualification"
                        value={formData.educationalQualification}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Select Qualification</option>
                        <option value="High School">High School</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Bachelor's Degree">Bachelor's Degree</option>
                        <option value="Master's Degree">Master's Degree</option>
                        <option value="PhD/Doctorate">PhD/Doctorate</option>
                        <option value="Post-Doctorate">Post-Doctorate</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {formData.occupation && (
                    <div className="mt-5">
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        Designation/Position
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Your current designation or position"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  <MapPin size={16} className="inline mr-1" />
                  Address *
                </label>
                <textarea
                  name="applicantAddress"
                  value={formData.applicantAddress}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition ${
                    errors.applicantAddress ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="Enter complete address"
                />
                {errors.applicantAddress && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.applicantAddress}
                  </p>
                )}
              </div>

              {/* Address and Location Details - Reordered */}
              {/* Country - Fixed to India */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  <Globe size={16} className="inline mr-1" />
                  Country *
                </label>
                <div className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 bg-gray-100 text-gray-700 font-semibold">
                  🇮🇳 India
                </div>
                <input type="hidden" name="applicantCountry" value="India" />
              </div>

              {/* State/UT and District in same row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* State/UT Dropdown */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    State / Union Territory *
                  </label>
                  <select
                    name="applicantState"
                    value={formData.applicantState}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition ${
                      errors.applicantState ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  >
                    <option value="">-- Select State / UT --</option>
                    {indianStatesAndUTs.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {errors.applicantState && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.applicantState}
                    </p>
                  )}
                </div>

                {/* District Dropdown - Shows only when state is selected */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    District *
                  </label>
                  <select
                    name="applicantDistrict"
                    value={formData.applicantDistrict}
                    onChange={handleInputChange}
                    disabled={!formData.applicantState || availableDistricts.length === 0}
                    className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition ${
                      errors.applicantDistrict ? 'border-red-400 bg-red-50' : 
                      !formData.applicantState ? 'border-gray-300 bg-gray-100 cursor-not-allowed' : 
                      'border-gray-400 focus:border-blue-600'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  >
                    <option value="">
                      {!formData.applicantState ? '-- Select State First --' : '-- Select District --'}
                    </option>
                    {availableDistricts.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                  {errors.applicantDistrict && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.applicantDistrict}
                    </p>
                  )}
                  {!formData.applicantState && (
                    <p className="text-blue-600 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      Please select a State/UT first to see districts
                    </p>
                  )}
                </div>
              </div>

              {/* City and Pincode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="applicantCity"
                    value={formData.applicantCity}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 bg-gray-100 text-gray-700 font-semibold cursor-not-allowed"
                    placeholder="City will auto-fill from district"
                  />
                  {errors.applicantCity && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.applicantCity}
                    </p>
                  )}
                  <p className="text-blue-600 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    City is automatically set to district name
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    name="applicantPincode"
                    value={formData.applicantPincode}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition ${
                      errors.applicantPincode ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    placeholder="6-digit pincode"
                    maxLength={6}
                  />
                  {errors.applicantPincode && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.applicantPincode}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Contact Details */}
              <div className="border-t-2 border-gray-300 pt-6 mt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-5">Additional Contact Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      <Phone size={16} className="inline mr-1" />
                      Alternate Phone Number
                    </label>
                    <input
                      type="tel"
                      name="alternatePhone"
                      value={formData.alternatePhone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Alternative contact number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      <Mail size={16} className="inline mr-1" />
                      Alternate Email Address
                    </label>
                    <input
                      type="email"
                      name="alternateEmail"
                      value={formData.alternateEmail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Alternative email"
                    />
                  </div>
                </div>
              </div>

              {/* Identity & Tax Details */}
              <div className="border-t-2 border-gray-300 pt-6 mt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-5">Identity & Tax Information</h3>
                
                {/* Government ID Selection - Mandatory */}
                <div className="mb-5">
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    <span className="text-red-600">*</span> Government Issued ID Type (Compulsory)
                  </label>
                  <select
                    name="govtIdType"
                    value={formData.govtIdType}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition ${
                      errors.govtIdType ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    required
                  >
                    <option value="">-- Select Government ID Type --</option>
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="passport">Passport</option>
                    <option value="voterId">Voter ID Card</option>
                    <option value="drivingLicense">Driving License</option>
                  </select>
                  {errors.govtIdType && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.govtIdType}
                    </p>
                  )}
                </div>

                {/* Conditional ID Fields based on selection */}
                {formData.govtIdType && (
                  <div className="space-y-5">
                    {/* Aadhaar Card Fields */}
                    {formData.govtIdType === 'aadhaar' && (
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          <span className="text-red-600">*</span> Aadhaar Number (12 digits)
                        </label>
                        <input
                          type="text"
                          name="govtIdNumber"
                          value={formData.govtIdNumber}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition ${
                            errors.govtIdNumber ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                          placeholder="Enter 12-digit Aadhaar Number"
                          maxLength={12}
                          pattern="[0-9]{12}"
                          required
                        />
                        <p className="text-xs text-gray-600 mt-1">Format: XXXX XXXX XXXX (12 digits)</p>
                        {errors.govtIdNumber && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <AlertCircle size={12} className="mr-1" />
                            {errors.govtIdNumber}
                          </p>
                        )}
                      </div>
                    )}

                    {/* PAN Card Fields */}
                    {formData.govtIdType === 'pan' && (
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          <span className="text-red-600">*</span> PAN Card Number (10 characters)
                        </label>
                        <input
                          type="text"
                          name="govtIdNumber"
                          value={formData.govtIdNumber}
                          onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase();
                            handleInputChange(e);
                          }}
                          className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition uppercase ${
                            errors.govtIdNumber ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                          placeholder="Enter PAN Number (e.g., ABCDE1234F)"
                          maxLength={10}
                          pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                          required
                        />
                        <p className="text-xs text-gray-600 mt-1">Format: ABCDE1234F (5 letters, 4 numbers, 1 letter)</p>
                        {errors.govtIdNumber && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <AlertCircle size={12} className="mr-1" />
                            {errors.govtIdNumber}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Passport Fields */}
                    {formData.govtIdType === 'passport' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">
                            <span className="text-red-600">*</span> Passport Number
                          </label>
                          <input
                            type="text"
                            name="govtIdNumber"
                            value={formData.govtIdNumber}
                            onChange={(e) => {
                              e.target.value = e.target.value.toUpperCase();
                              handleInputChange(e);
                            }}
                            className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition uppercase ${
                              errors.govtIdNumber ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                            placeholder="Enter Passport Number"
                            maxLength={20}
                            required
                          />
                          {errors.govtIdNumber && (
                            <p className="text-red-500 text-xs mt-1 flex items-center">
                              <AlertCircle size={12} className="mr-1" />
                              {errors.govtIdNumber}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">
                            <span className="text-red-600">*</span> Country of Issue
                          </label>
                          <input
                            type="text"
                            name="passportCountry"
                            value={formData.passportCountry}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="e.g., India"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Voter ID Fields */}
                    {formData.govtIdType === 'voterId' && (
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          <span className="text-red-600">*</span> Voter ID Number
                        </label>
                        <input
                          type="text"
                          name="govtIdNumber"
                          value={formData.govtIdNumber}
                          onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase();
                            handleInputChange(e);
                          }}
                          className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition uppercase ${
                            errors.govtIdNumber ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                          placeholder="Enter Voter ID Number"
                          maxLength={20}
                          required
                        />
                        <p className="text-xs text-gray-600 mt-1">Enter your Voter ID / EPIC Number</p>
                        {errors.govtIdNumber && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <AlertCircle size={12} className="mr-1" />
                            {errors.govtIdNumber}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Driving License Fields */}
                    {formData.govtIdType === 'drivingLicense' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">
                            <span className="text-red-600">*</span> Driving License Number
                          </label>
                          <input
                            type="text"
                            name="govtIdNumber"
                            value={formData.govtIdNumber}
                            onChange={(e) => {
                              e.target.value = e.target.value.toUpperCase();
                              handleInputChange(e);
                            }}
                            className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 transition uppercase ${
                              errors.govtIdNumber ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-600'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                            placeholder="Enter DL Number"
                            maxLength={20}
                            required
                          />
                          {errors.govtIdNumber && (
                            <p className="text-red-500 text-xs mt-1 flex items-center">
                              <AlertCircle size={12} className="mr-1" />
                              {errors.govtIdNumber}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">
                            <span className="text-red-600">*</span> State of Issue
                          </label>
                          <input
                            type="text"
                            name="drivingLicenseState"
                            value={formData.drivingLicenseState}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="e.g., Maharashtra"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* GSTIN for Organizations */}
                {formData.applicantType === 'organization' && (
                  <div className="mt-5">
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="GST Identification Number"
                      maxLength={15}
                    />
                  </div>
                )}
              </div>

              {/* Correspondence Address */}
              <div className="border-t-2 border-gray-300 pt-6 mt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-5">Correspondence Address</h3>
                
                <div className="mb-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="sameAsApplicantAddress"
                      checked={formData.sameAsApplicantAddress}
                      onChange={handleInputChange}
                      className="mr-3 w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Same as applicant address
                    </span>
                  </label>
                </div>

                {!formData.sameAsApplicantAddress && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        <MapPin size={16} className="inline mr-1" />
                        Correspondence Address
                      </label>
                      <textarea
                        name="correspondenceAddress"
                        value={formData.correspondenceAddress}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Enter correspondence address"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          name="correspondenceCity"
                          value={formData.correspondenceCity}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="City"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          name="correspondenceState"
                          value={formData.correspondenceState}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="Enter State"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          Pincode
                        </label>
                        <input
                          type="text"
                          name="correspondencePincode"
                          value={formData.correspondencePincode}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 bg-white text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="6-digit pincode"
                          maxLength={6}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Application Date - Auto-filled and Read-only */}
              <div className="border-t-2 border-gray-300 pt-6 mt-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-5">
                  <label className="block text-base font-bold text-gray-800 mb-3 flex items-center">
                    <Calendar size={20} className="inline mr-2 text-blue-600" />
                    Application Submission Date
                  </label>
                  <input
                    type="text"
                    name="applicationDateDisplay"
                    value={new Date(formData.applicationDate).toLocaleDateString('en-IN', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 bg-gray-100 text-gray-700 font-bold cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-600 mt-2 font-medium">
                    📅 Auto-filled with today's date. This date cannot be modified.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Invention Details */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  <Lightbulb size={16} className="inline mr-1" />
                  Invention Title *
                </label>
                <input
                  type="text"
                  name="inventionTitle"
                  value={formData.inventionTitle}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition ${
                    errors.inventionTitle ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="Brief title of your invention (min 10 characters)"
                />
                {errors.inventionTitle && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.inventionTitle}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Field of Invention *
                  </label>
                  <select
                    name="inventionField"
                    value={formData.inventionField}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition ${
                      errors.inventionField ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  >
                    <option value="">Select Field of Invention</option>
                    {inventionFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                  {errors.inventionField && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle size={12} className="mr-1" />
                      {errors.inventionField}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Target Industry
                  </label>
                  <input
                    type="text"
                    name="targetIndustry"
                    value={formData.targetIndustry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g., Healthcare, Manufacturing, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  <FileText size={16} className="inline mr-1" />
                  Detailed Description of Invention *
                </label>
                <textarea
                  name="inventionDescription"
                  value={formData.inventionDescription}
                  onChange={handleInputChange}
                  rows={6}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition ${
                    errors.inventionDescription ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="Provide a comprehensive description of your invention (min 100 characters)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.inventionDescription.length} characters
                </p>
                {errors.inventionDescription && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.inventionDescription}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g., AI, machine learning, optimization"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add relevant keywords to help classify your invention
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Technical Problem Addressed *
                </label>
                <textarea
                  name="technicalProblem"
                  value={formData.technicalProblem}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition ${
                    errors.technicalProblem ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="What problem does your invention solve?"
                />
                {errors.technicalProblem && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.technicalProblem}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Proposed Solution *
                </label>
                <textarea
                  name="proposedSolution"
                  value={formData.proposedSolution}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition ${
                    errors.proposedSolution ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="How does your invention solve the problem?"
                />
                {errors.proposedSolution && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.proposedSolution}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Advantages & Benefits *
                </label>
                <textarea
                  name="advantages"
                  value={formData.advantages}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition ${
                    errors.advantages ? 'border-red-400 bg-red-50' : 'border-gray-400 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="List the key advantages and benefits of your invention"
                />
                {errors.advantages && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.advantages}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Commercial Application
                </label>
                <textarea
                  name="commercialApplication"
                  value={formData.commercialApplication}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Describe potential commercial applications and market opportunities"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Prior Art (Optional)
                </label>
                <textarea
                  name="priorArt"
                  value={formData.priorArt}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Any existing similar inventions or patents you're aware of"
                />
              </div>
            </div>
          )}

          {/* Step 3: Patent Details */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Patent Type *
                  </label>
                  <select
                    name="patentType"
                    value={formData.patentType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="provisional">Provisional Patent</option>
                    <option value="complete">Complete Patent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Filing Type *
                  </label>
                  <select
                    name="filingType"
                    value={formData.filingType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="national">National Filing</option>
                    <option value="international">International (PCT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Claims *
                </label>
                <input
                  type="number"
                  name="numberOfClaims"
                  value={formData.numberOfClaims}
                  onChange={handleInputChange}
                  min="1"
                  max="30"
                  className={`w-full px-4 py-3 rounded-xl border transition ${
                    errors.numberOfClaims ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="Number of claims (1-30)"
                />
                {errors.numberOfClaims && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.numberOfClaims}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Drawings (Optional)
                </label>
                <input
                  type="number"
                  name="numberOfDrawings"
                  value={formData.numberOfDrawings}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Number of drawings/figures"
                />
              </div>

              <div className="border-t border-gray-200 pt-5">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="claimsPriority"
                    checked={formData.claimsPriority}
                    onChange={handleInputChange}
                    className="mr-3 w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Claim Priority from Earlier Application
                  </span>
                </label>
              </div>

              {formData.claimsPriority && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-8">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar size={16} className="inline mr-1" />
                      Priority Date *
                    </label>
                    <input
                      type="date"
                      name="priorityDate"
                      value={formData.priorityDate}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border transition ${
                        errors.priorityDate ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                    {errors.priorityDate && (
                      <p className="text-red-500 text-xs mt-1 flex items-center">
                        <AlertCircle size={12} className="mr-1" />
                        {errors.priorityDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Priority Application Number *
                    </label>
                    <input
                      type="text"
                      name="priorityNumber"
                      value={formData.priorityNumber}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border transition ${
                        errors.priorityNumber ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="Earlier application number"
                    />
                    {errors.priorityNumber && (
                      <p className="text-red-500 text-xs mt-1 flex items-center">
                        <AlertCircle size={12} className="mr-1" />
                        {errors.priorityNumber}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Documents Upload */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center">
                  <Upload size={18} className="mr-2 text-blue-600" />
                  Document Upload Instructions
                </h4>
                <ul className="text-sm text-gray-700 space-y-2 ml-6 list-disc">
                  <li>Upload your documents to <strong>Google Drive</strong>, <strong>Dropbox</strong>, or <strong>OneDrive</strong></li>
                  <li>Make sure the files are in <strong>PDF format</strong></li>
                  <li>Set sharing permissions to <strong>"Anyone with the link can view"</strong></li>
                  <li>Copy and paste the shareable link below</li>
                  <li>Verify that the links are accessible before submitting</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FileText size={16} className="inline mr-1" />
                  Description Document Link *
                </label>
                <input
                  type="url"
                  name="descriptionFileUrl"
                  value={formData.descriptionFileUrl}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition ${
                    errors.descriptionFileUrl ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="https://drive.google.com/... or https://dropbox.com/..."
                />
                {formData.descriptionFileUrl && !errors.descriptionFileUrl && (
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <CheckCircle2 size={12} className="mr-1" />
                    Link added successfully
                  </p>
                )}
                {errors.descriptionFileUrl && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.descriptionFileUrl}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FileText size={16} className="inline mr-1" />
                  Claims Document Link *
                </label>
                <input
                  type="url"
                  name="claimsFileUrl"
                  value={formData.claimsFileUrl}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition ${
                    errors.claimsFileUrl ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="https://drive.google.com/... or https://dropbox.com/..."
                />
                {formData.claimsFileUrl && !errors.claimsFileUrl && (
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <CheckCircle2 size={12} className="mr-1" />
                    Link added successfully
                  </p>
                )}
                {errors.claimsFileUrl && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.claimsFileUrl}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FileText size={16} className="inline mr-1" />
                  Abstract Document Link *
                </label>
                <input
                  type="url"
                  name="abstractFileUrl"
                  value={formData.abstractFileUrl}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition ${
                    errors.abstractFileUrl ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="https://drive.google.com/... or https://dropbox.com/..."
                />
                {formData.abstractFileUrl && !errors.abstractFileUrl && (
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <CheckCircle2 size={12} className="mr-1" />
                    Link added successfully
                  </p>
                )}
                {errors.abstractFileUrl && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.abstractFileUrl}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FileText size={16} className="inline mr-1" />
                  Drawings/Figures Link (Optional)
                </label>
                <input
                  type="url"
                  name="drawingsFileUrl"
                  value={formData.drawingsFileUrl}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition ${
                    errors.drawingsFileUrl ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="https://drive.google.com/... or https://dropbox.com/... (optional)"
                />
                {formData.drawingsFileUrl && !errors.drawingsFileUrl && (
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <CheckCircle2 size={12} className="mr-1" />
                    Link added successfully
                  </p>
                )}
                {errors.drawingsFileUrl && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.drawingsFileUrl}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
                <p className="text-sm text-yellow-800 flex items-start">
                  <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Important:</strong> Please ensure your document links are publicly accessible. 
                    Test each link in an incognito/private browser window before proceeding.
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Review & Payment */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-300">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <FileCheck size={28} className="mr-3 text-blue-600" />
                  Complete Application Summary
                </h3>
                
                {/* Step 1: Applicant Information */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-blue-400 pb-2">
                    📋 Applicant Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Applicant Type:</span>
                      <p className="text-gray-700 mt-1 capitalize">{formData.applicantType}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Full Name:</span>
                      <p className="text-gray-700 mt-1">{formData.applicantName}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Email:</span>
                      <p className="text-gray-700 mt-1">{formData.applicantEmail}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Phone:</span>
                      <p className="text-gray-700 mt-1">{formData.applicantPhone}</p>
                    </div>
                    {formData.alternatePhone && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Alternate Phone:</span>
                        <p className="text-gray-700 mt-1">{formData.alternatePhone}</p>
                      </div>
                    )}
                    {formData.alternateEmail && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Alternate Email:</span>
                        <p className="text-gray-700 mt-1">{formData.alternateEmail}</p>
                      </div>
                    )}
                    {formData.organizationName && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Organization:</span>
                        <p className="text-gray-700 mt-1">{formData.organizationName}</p>
                      </div>
                    )}
                    {formData.dateOfBirth && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Date of Birth:</span>
                        <p className="text-gray-700 mt-1">{new Date(formData.dateOfBirth).toLocaleDateString('en-IN')}</p>
                      </div>
                    )}
                    {formData.age && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Age:</span>
                        <p className="text-gray-700 mt-1">{formData.age} years</p>
                      </div>
                    )}
                    {formData.gender && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Gender:</span>
                        <p className="text-gray-700 mt-1 capitalize">{formData.gender}</p>
                      </div>
                    )}
                    {formData.occupation && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Occupation:</span>
                        <p className="text-gray-700 mt-1">{formData.occupation}</p>
                      </div>
                    )}
                    {formData.educationalQualification && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Education:</span>
                        <p className="text-gray-700 mt-1">{formData.educationalQualification}</p>
                      </div>
                    )}
                    {formData.designation && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Designation:</span>
                        <p className="text-gray-700 mt-1">{formData.designation}</p>
                      </div>
                    )}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 md:col-span-2">
                      <span className="font-bold text-gray-800">Address:</span>
                      <p className="text-gray-700 mt-1">{formData.applicantAddress}</p>
                      <p className="text-gray-700">{formData.applicantCity}, {formData.applicantDistrict}</p>
                      <p className="text-gray-700">{formData.applicantState} - {formData.applicantPincode}</p>
                      <p className="text-gray-700">{formData.applicantCountry}</p>
                    </div>
                    {formData.govtIdType && (
                      <>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <span className="font-bold text-gray-800">Government ID Type:</span>
                          <p className="text-gray-700 mt-1 capitalize">{formData.govtIdType === 'aadhaar' ? 'Aadhaar Card' : formData.govtIdType === 'pan' ? 'PAN Card' : formData.govtIdType === 'voterId' ? 'Voter ID' : formData.govtIdType === 'drivingLicense' ? 'Driving License' : 'Passport'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <span className="font-bold text-gray-800">ID Number:</span>
                          <p className="text-gray-700 mt-1">{formData.govtIdNumber}</p>
                        </div>
                        {formData.passportCountry && (
                          <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <span className="font-bold text-gray-800">Passport Country:</span>
                            <p className="text-gray-700 mt-1">{formData.passportCountry}</p>
                          </div>
                        )}
                        {formData.drivingLicenseState && (
                          <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <span className="font-bold text-gray-800">DL State:</span>
                            <p className="text-gray-700 mt-1">{formData.drivingLicenseState}</p>
                          </div>
                        )}
                      </>
                    )}
                    {formData.gstin && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">GSTIN:</span>
                        <p className="text-gray-700 mt-1">{formData.gstin}</p>
                      </div>
                    )}
                    {!formData.sameAsApplicantAddress && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200 md:col-span-2">
                        <span className="font-bold text-gray-800">Correspondence Address:</span>
                        <p className="text-gray-700 mt-1">{formData.correspondenceAddress}</p>
                        <p className="text-gray-700">{formData.correspondenceCity}, {formData.correspondenceState} - {formData.correspondencePincode}</p>
                      </div>
                    )}
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Application Date:</span>
                      <p className="text-gray-700 mt-1">{new Date(formData.applicationDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Invention Details */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-purple-400 pb-2">
                    💡 Invention Details
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Invention Title:</span>
                      <p className="text-gray-700 mt-2">{formData.inventionTitle}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Field of Invention:</span>
                        <p className="text-gray-700 mt-1">{formData.inventionField}</p>
                      </div>
                      {formData.targetIndustry && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <span className="font-bold text-gray-800">Target Industry:</span>
                          <p className="text-gray-700 mt-1">{formData.targetIndustry}</p>
                        </div>
                      )}
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Detailed Description:</span>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{formData.inventionDescription}</p>
                    </div>
                    {formData.keywords && (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Keywords:</span>
                        <p className="text-gray-700 mt-2">{formData.keywords}</p>
                      </div>
                    )}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Technical Problem Addressed:</span>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{formData.technicalProblem}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Proposed Solution:</span>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{formData.proposedSolution}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Advantages & Benefits:</span>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">{formData.advantages}</p>
                    </div>
                    {formData.commercialApplication && (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Commercial Application:</span>
                        <p className="text-gray-700 mt-2 whitespace-pre-wrap">{formData.commercialApplication}</p>
                      </div>
                    )}
                    {formData.priorArt && (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Prior Art:</span>
                        <p className="text-gray-700 mt-2 whitespace-pre-wrap">{formData.priorArt}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Patent Specifications */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-green-400 pb-2">
                    📄 Patent Specifications
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Patent Type:</span>
                      <p className="text-gray-700 mt-1 capitalize">{formData.patentType}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Filing Type:</span>
                      <p className="text-gray-700 mt-1 capitalize">{formData.filingType}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Number of Claims:</span>
                      <p className="text-gray-700 mt-1">{formData.numberOfClaims}</p>
                    </div>
                    {formData.numberOfDrawings && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Number of Drawings:</span>
                        <p className="text-gray-700 mt-1">{formData.numberOfDrawings}</p>
                      </div>
                    )}
                    {formData.claimsPriority && (
                      <>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <span className="font-bold text-gray-800">Priority Date:</span>
                          <p className="text-gray-700 mt-1">{new Date(formData.priorityDate).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <span className="font-bold text-gray-800">Priority Number:</span>
                          <p className="text-gray-700 mt-1">{formData.priorityNumber}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Step 4: Document Links */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-orange-400 pb-2">
                    📎 Document Links
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Description Document:</span>
                      <p className="text-blue-600 mt-1 break-all hover:underline">
                        <a href={formData.descriptionFileUrl} target="_blank" rel="noopener noreferrer">
                          {formData.descriptionFileUrl}
                        </a>
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Claims Document:</span>
                      <p className="text-blue-600 mt-1 break-all hover:underline">
                        <a href={formData.claimsFileUrl} target="_blank" rel="noopener noreferrer">
                          {formData.claimsFileUrl}
                        </a>
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="font-bold text-gray-800">Abstract Document:</span>
                      <p className="text-blue-600 mt-1 break-all hover:underline">
                        <a href={formData.abstractFileUrl} target="_blank" rel="noopener noreferrer">
                          {formData.abstractFileUrl}
                        </a>
                      </p>
                    </div>
                    {formData.drawingsFileUrl && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="font-bold text-gray-800">Drawings Document:</span>
                        <p className="text-blue-600 mt-1 break-all hover:underline">
                          <a href={formData.drawingsFileUrl} target="_blank" rel="noopener noreferrer">
                            {formData.drawingsFileUrl}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <IndianRupee size={24} className="mr-2 text-green-600" />
                  Payment Details
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold text-gray-700">Patent Filing Fee:</span>
                    <span className="text-2xl font-bold text-green-600">₹{formData.paymentAmount}</span>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 mt-4">
                    <p className="text-xs text-gray-600 mb-2">
                      <strong>Included in this fee:</strong>
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                      <li>Application processing</li>
                      <li>Document verification</li>
                      <li>Initial examination</li>
                      <li>Secure document storage</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className={`flex items-start cursor-pointer p-4 rounded-xl transition ${
                  errors.agreedToTerms ? 'bg-red-50 border border-red-300' : 'bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    name="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onChange={handleInputChange}
                    className="mr-3 w-5 h-5 text-blue-600 rounded mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    I hereby declare that the information provided is true and accurate to the best of my knowledge. 
                    I agree to the <a href="#" className="text-blue-600 hover:underline">Terms & Conditions</a> and 
                    <a href="#" className="text-blue-600 hover:underline"> Privacy Policy</a>.
                  </span>
                </label>
                {errors.agreedToTerms && (
                  <p className="text-red-500 text-xs mt-2 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {errors.agreedToTerms}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> After clicking "Pay & Submit", you will be redirected to a secure payment gateway. 
                  Your application will be submitted only after successful payment confirmation.
                </p>
              </div>
            </div>
          )}
        </div>

          {/* Footer Navigation - Responsive */}
          <div className="bg-white border-t border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`
                w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition
                ${currentStep === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md'
                }
              `}
            >
              <ArrowLeft size={20} />
              <span>Previous</span>
            </button>

            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:scale-105 transition-all"
              >
                <span>Next</span>
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`
                  w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all
                  ${isSubmitting 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl hover:scale-105'
                  }
                `}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span className="hidden sm:inline">Processing...</span>
                    <span className="sm:hidden">Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    <span className="hidden sm:inline">Pay ₹{formData.paymentAmount} & Submit</span>
                    <span className="sm:hidden">Pay & Submit</span>
                  </>
                )}
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatentFilingForm;
