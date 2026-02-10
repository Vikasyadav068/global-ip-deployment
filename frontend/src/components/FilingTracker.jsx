import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { FileText, Calendar, User, DollarSign, CheckCircle, Clock, Eye, X, ArrowLeft, Download, Share2, Linkedin, Lock, Crown, Sparkles, MessageCircle, Send } from 'lucide-react';
import { auth } from '../firebase';
import PatentProgressTracker from './PatentProgressTracker';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import UpgradeModal from './UpgradeModal';
import { API_BASE_URL } from '../config/api';

const FilingTracker = forwardRef(({ userProfile, onBack, onAddNotification }, ref) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [filings, setFilings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFilingId, setExpandedFilingId] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const patentDetailsRef = useRef(null);
  
  // Chat modal states
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedPatent, setSelectedPatent] = useState(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastTimer, setToastTimer] = useState(4);
  const [messageLimitReached, setMessageLimitReached] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Expose fetchUserFilings to parent via ref
  useImperativeHandle(ref, () => ({
    fetchUserFilings
  }));

  useEffect(() => {
    // Fetch filings when component mounts
    fetchUserFilings();
  }, []);

  // Re-fetch when userProfile changes (user logs in)
  useEffect(() => {
    if (userProfile?.email) {
      console.log('User profile updated, re-fetching filings...');
      fetchUserFilings();
    }
  }, [userProfile?.email]);

  const fetchUserFilings = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('=== FETCHING PATENT FILINGS ===');
      console.log('Auth current user:', auth.currentUser);
      console.log('Auth email:', auth.currentUser?.email);
      console.log('User profile:', userProfile);
      console.log('Profile email:', userProfile?.email);
      
      // Fetch ALL patent filings
      const response = await fetch(`${API_BASE_URL}/patent-filing/all`);
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Total filings from API:', data.length);
      console.log('All filings data:', data);
      
      // Try multiple sources to get user email
      let userEmail = null;
      
      // Priority 1: Firebase auth current user
      if (auth.currentUser?.email) {
        userEmail = auth.currentUser.email;
        console.log('✅ Got email from auth.currentUser:', userEmail);
      }
      // Priority 2: User profile
      else if (userProfile?.email) {
        userEmail = userProfile.email;
        console.log('✅ Got email from userProfile:', userEmail);
      }
      // Priority 3: Check localStorage
      else {
        const storedEmail = localStorage.getItem('userEmail');
        if (storedEmail) {
          userEmail = storedEmail;
          console.log('✅ Got email from localStorage:', userEmail);
        }
      }
      
      console.log('Final user email for filtering:', userEmail);
      
      // If no user email found, show ALL patents as a fallback
      if (!userEmail) {
        console.warn('⚠️ No user email found! Showing ALL patents as fallback.');
        console.warn('This should not happen. Check authentication.');
        setFilings(data);
        setCurrentPage(1); // Reset to first page
        return;
      }
      
      // Normalize email for comparison
      const normalizedUserEmail = userEmail.toLowerCase().trim();
      console.log('Normalized user email:', normalizedUserEmail);
      
      // Filter by email (case-insensitive) - check both userEmail and applicantEmail fields
      // Also filter out deactivated patents (isActive === false)
      const filteredFilings = data.filter(filing => {
        const filingUserEmail = filing.userEmail?.toLowerCase()?.trim();
        const filingApplicantEmail = filing.applicantEmail?.toLowerCase()?.trim();
        const isActive = filing.isActive !== false; // Show patent if isActive is true or undefined (for backward compatibility)
        
        console.log(`Checking filing ${filing.id}:`, {
          title: filing.inventionTitle,
          filingUserEmail,
          filingApplicantEmail,
          currentUserEmail: normalizedUserEmail,
          isActive: filing.isActive,
          userEmailMatch: filingUserEmail === normalizedUserEmail,
          applicantEmailMatch: filingApplicantEmail === normalizedUserEmail
        });
        
        const emailMatches = filingUserEmail === normalizedUserEmail || filingApplicantEmail === normalizedUserEmail;
        const matches = emailMatches && isActive;
        
        if (emailMatches && !isActive) {
          console.log(`⚠️ Patent ${filing.id} matches email but is deactivated - filtering out`);
        }
        
        if (matches) {
          console.log(`✅ MATCH FOUND: ${filing.inventionTitle} (ID: ${filing.id})`);
        }
        
        return matches;
      });
      
      console.log(`📊 Results: ${filteredFilings.length} of ${data.length} filings match user email: ${normalizedUserEmail}`);
      console.log('Filtered data:', filteredFilings);
      
      setFilings(filteredFilings);
      setCurrentPage(1); // Reset to first page when data changes
      
      if (filteredFilings.length === 0 && data.length > 0) {
        console.warn('⚠️ No filings matched! This might indicate an email mismatch.');
        console.warn('Expected email:', normalizedUserEmail);
        console.warn('Available emails in database:', data.map(f => ({
          userEmail: f.userEmail,
          applicantEmail: f.applicantEmail
        })));
      }
      
    } catch (err) {
      console.error('❌ ERROR fetching filings:', err);
      console.error('Error details:', err.message);
      setError('Failed to load your patent filings. Please try again.');
    } finally {
      setLoading(false);
      console.log('=== FETCH COMPLETE ===');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Keep the date in the same format as stored (YYYY-MM-DD)
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    return new Date(dateTimeString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'submitted':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const toggleDetails = (filingId) => {
    setExpandedFilingId(expandedFilingId === filingId ? null : filingId);
  };

  // Generate complete patent data text for sharing
  const generatePatentDataText = (filing) => {
    return `
📋 PATENT APPLICATION DETAILS
═══════════════════════════════

🎯 INVENTION INFORMATION
━━━━━━━━━━━━━━━━━━━━━━
Title: ${filing.inventionTitle || 'N/A'}
Field: ${filing.inventionField || 'N/A'}
Description: ${filing.inventionDescription || 'N/A'}

👤 APPLICANT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━
Name: ${filing.applicantName || 'N/A'}
Email: ${filing.applicantEmail || 'N/A'}
Phone: ${filing.applicantPhone || 'N/A'}
Type: ${filing.applicantType || 'N/A'}
${filing.organizationName ? `Organization: ${filing.organizationName}` : ''}
Address: ${filing.applicantAddress || 'N/A'}, ${filing.applicantCity || 'N/A'}, ${filing.applicantState || 'N/A'} - ${filing.applicantPincode || 'N/A'}

📊 PATENT SPECIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━
Patent Type: ${filing.patentType || 'N/A'}
Filing Type: ${filing.filingType || 'N/A'}
Number of Claims: ${filing.numberOfClaims || 'N/A'}
Number of Drawings: ${filing.numberOfDrawings || 'N/A'}

💳 PAYMENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━
Amount: ₹${filing.paymentAmount || 'N/A'} ${filing.paymentCurrency || 'INR'}
Payment ID: ${filing.paymentId || 'N/A'}
Status: ${filing.paymentStatus || 'N/A'}

📈 FILING STATUS
━━━━━━━━━━━━━━━━━━━━━━
Status: ${filing.status || 'N/A'}
Filing Date: ${formatDateTime(filing.filingDate)}
Created: ${formatDateTime(filing.createdAt)}
Updated: ${formatDateTime(filing.updatedAt)}

🏆 PROGRESS STATUS
━━━━━━━━━━━━━━━━━━━━━━
✓ Stage 1 - Patent Filed: ${filing.stage1Filed ? '✅ Complete' : '⏳ Pending'}
✓ Stage 2 - Admin Review: ${filing.stage2AdminReview ? '✅ Complete' : '⏳ Pending'}
✓ Stage 3 - Technical Review: ${filing.stage3TechnicalReview ? '✅ Complete' : '⏳ Pending'}
✓ Stage 4 - Final Verification: ${filing.stage4Verification ? '✅ Complete' : '⏳ Pending'}
✓ Stage 5 - Patent Granted: ${filing.stage5Granted ? '✅ Complete' : '⏳ Pending'}
    `.trim();
  };

  // Download PDF of patent details
  const downloadPDF = async (filing) => {
    setGeneratingPdf(true);
    try {
      const element = document.getElementById(`patent-details-${filing.id}`);
      if (!element) {
        alert('Please expand the patent details first');
        setGeneratingPdf(false);
        return;
      }

      // Create canvas from the element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Define margins (in mm)
      const marginLeft = 15;
      const marginRight = 15;
      const marginTop = 15;
      const marginBottom = 15;
      
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const contentWidth = pageWidth - marginLeft - marginRight; // 180mm
      const contentHeight = pageHeight - marginTop - marginBottom; // 267mm
      
      // Calculate image dimensions to fit within margins
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = marginTop;

      // Add first page with margins
      pdf.addImage(imgData, 'PNG', marginLeft, position, contentWidth, imgHeight);
      heightLeft -= contentHeight;

      // Add additional pages if needed with margins
      while (heightLeft > 0) {
        position = marginTop - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', marginLeft, position, contentWidth, imgHeight);
        heightLeft -= contentHeight;
      }

      pdf.save(`Patent_${filing.inventionTitle || 'Application'}_${filing.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Share on WhatsApp with complete data
  const shareOnWhatsApp = (filing) => {
    const patentData = generatePatentDataText(filing);
    const message = `🎉 PATENT APPLICATION UPDATE\n\n${patentData}\n\n📱 Shared via Global IPI Platform`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Share on LinkedIn with PDF
  const shareOnLinkedIn = async (filing) => {
    // First generate and download the PDF
    await downloadPDF(filing);
    
    // Prepare LinkedIn post text
    const allStagesComplete = filing.stage1Filed && filing.stage2AdminReview && 
                               filing.stage3TechnicalReview && filing.stage4Verification && 
                               filing.stage5Granted;
    
    const linkedInText = `🎯 Patent Application Update: "${filing.inventionTitle || 'Patent Application'}"

${allStagesComplete ? '🏆 Exciting News! My patent has been officially GRANTED!' : '📋 Application Status: In Progress'}

Field: ${filing.inventionField || 'Innovation'}
Type: ${filing.patentType || 'N/A'}

${allStagesComplete ? 
  '✅ All stages completed successfully!\n🎉 Patent officially approved and published!' : 
  `Current Progress:
${filing.stage1Filed ? '✅' : '⏳'} Patent Filed
${filing.stage2AdminReview ? '✅' : '⏳'} Admin Review
${filing.stage3TechnicalReview ? '✅' : '⏳'} Technical Review  
${filing.stage4Verification ? '✅' : '⏳'} Final Verification
${filing.stage5Granted ? '✅' : '⏳'} Patent Granted`}

#Patent #Innovation #IntellectualProperty #Research #Technology #IP

Note: PDF document has been downloaded. Please attach it manually to your LinkedIn post.`;

    // Copy text to clipboard for easy pasting
    try {
      await navigator.clipboard.writeText(linkedInText);
      alert('✅ LinkedIn post text copied to clipboard!\n\n📄 PDF has been downloaded.\n\nPlease:\n1. Go to LinkedIn\n2. Create a new post\n3. Paste the copied text (Ctrl+V)\n4. Attach the downloaded PDF\n5. Publish your post');
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
    
    // Open LinkedIn
    const linkedInUrl = 'https://www.linkedin.com/feed/';
    window.open(linkedInUrl, '_blank');
  };

  // Chat functions
  const openChatModal = (filing) => {
    console.log('Opening chat modal for patent:', filing.inventionTitle);
    console.log('User profile:', userProfile);
    console.log('Subscription type:', userProfile?.subscriptionType);
    
    setSelectedPatent(filing);
    setShowChatModal(true);
    setShowToast(true);
    setMessageLimitReached(false);
    
    // Get message limit based on subscription
    const messageLimit = getMessageLimit();
    const messageCount = getMessageCount(filing);
    
    console.log('Message limit:', messageLimit);
    console.log('Current message count:', messageCount);
    
    if (messageCount >= messageLimit) {
      setMessageLimitReached(true);
    }
    
    // Start toast timer
    setToastTimer(4);
    const interval = setInterval(() => {
      setToastTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowToast(false);
          return 4;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const closeChatModal = () => {
    setShowChatModal(false);
    setSelectedPatent(null);
    setCurrentMessage('');
    setShowToast(false);
  };

  const getMessageLimit = () => {
    const subscriptionType = userProfile?.subscriptionType?.toLowerCase();
    if (subscriptionType === 'enterprise') return 5;
    if (subscriptionType === 'pro') return 2;
    return 0; // basic users can't send messages
  };

  const getMessageCount = (filing) => {
    let count = 0;
    for (let i = 1; i <= 5; i++) {
      if (filing[`m${i}`]) count++;
    }
    return count;
  };

  // Count new admin replies (user sent message but admin replied)
  const getNewRepliesCount = (filing) => {
    let newReplies = 0;
    for (let i = 1; i <= 5; i++) {
      const userMsg = filing[`m${i}`];
      const adminReply = filing[`r${i}`];
      
      // If user sent a message and admin replied
      if (userMsg && userMsg.trim() !== '' && adminReply && adminReply.trim() !== '') {
        newReplies++;
      }
    }
    return newReplies;
  };

  const sendMessage = async () => {
    if (!currentMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    const messageLimit = getMessageLimit();
    const messageCount = getMessageCount(selectedPatent);

    if (messageCount >= messageLimit) {
      alert(`You have reached your message limit of ${messageLimit} messages for this patent.`);
      return;
    }

    try {
      // Find the next available message slot
      let messageField = null;
      for (let i = 1; i <= 5; i++) {
        if (!selectedPatent[`m${i}`]) {
          messageField = `m${i}`;
          break;
        }
      }

      if (!messageField) {
        alert('Maximum message limit reached');
        return;
      }

      // Update the patent filing with the message
      const response = await fetch(`${API_BASE_URL}/patent-filing/${selectedPatent.id}/message`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageField: messageField,
          messageContent: currentMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const updatedFiling = await response.json();
      
      // Update the local state
      setFilings(prevFilings =>
        prevFilings.map(f => f.id === updatedFiling.id ? updatedFiling : f)
      );
      
      setSelectedPatent(updatedFiling);
      setCurrentMessage('');
      
      // Check if limit reached
      if (getMessageCount(updatedFiling) >= messageLimit) {
        setMessageLimitReached(true);
      }

      if (onAddNotification) {
        onAddNotification('Message sent successfully! Admin will reply soon.', 'success');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-red-600 py-8">
          <p className="text-lg font-semibold mb-2">⚠️ Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Check if user has basic subscription
  const isBasicUser = !userProfile?.subscriptionType || userProfile?.subscriptionType.toLowerCase() === 'basic';

  // Calculate pagination
  const totalPages = Math.ceil(filings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFilings = filings.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  // Show upgrade prompt for basic users
  if (isBasicUser) {
    return (
      <>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition flex items-center gap-2 text-gray-600 font-medium"
                >
                  <ArrowLeft size={20} />
                  Back to Dashboard
                </button>
              )}
              <h2 className="text-2xl font-bold text-gray-800">My Patent Filings</h2>
            </div>
          </div>

          {/* Upgrade Prompt for Basic Users */}
          <div className="flex flex-col items-center justify-center py-16 px-4">
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
              The Filing Tracker is a powerful tool to monitor and manage your patent applications.
            </p>
            
            <p className="text-md text-gray-500 mb-8 text-center max-w-2xl">
              Upgrade to <span className="font-semibold text-blue-600">Pro</span> or <span className="font-semibold text-purple-600">Enterprise</span> plan to unlock:
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-10 max-w-3xl w-full">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <FileText size={20} className="text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Track All Filings</h4>
                </div>
                <p className="text-sm text-gray-600">Monitor all your patent applications in one place with real-time updates</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Progress Tracking</h4>
                </div>
                <p className="text-sm text-gray-600">View detailed progress through each stage of the patent approval process</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Download size={20} className="text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Export Reports</h4>
                </div>
                <p className="text-sm text-gray-600">Download comprehensive PDF reports of your patent applications</p>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border border-pink-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-pink-500 rounded-lg">
                    <Share2 size={20} className="text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Share on LinkedIn</h4>
                </div>
                <p className="text-sm text-gray-600">Showcase your patent achievements on professional networks</p>
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
              Start tracking your patent applications with advanced features
            </p>
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

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition flex items-center gap-2 text-gray-600 font-medium"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
          )}
          <h2 className="text-2xl font-bold text-gray-800">My Patent Filings</h2>
        </div>
        <button
          onClick={fetchUserFilings}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Refresh
        </button>
      </div>

      {filings.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 text-lg">No patent filings yet</p>
          <p className="text-gray-500 text-sm mt-2">Your submitted patents will appear here</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6">
            {currentFilings.map((filing) => (
            <div
              key={filing.id}
              className="relative bg-gradient-to-br from-white via-blue-50 to-purple-50 border-2 border-transparent rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 50%, #faf5ff 100%)',
                borderImage: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899) 1'
              }}
            >
              {/* Decorative corner accents */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-bl-full"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-tr-full"></div>
              
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  {/* Title with gradient and icon */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md">
                      <FileText size={24} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {filing.inventionTitle}
                    </h3>
                  </div>
                  
                  {/* Info Grid with enhanced styling */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Applicant</span>
                        <span className="text-sm font-semibold text-gray-800">{filing.applicantName}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar size={18} className="text-purple-600" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Filed Date</span>
                        <span className="text-sm font-semibold text-gray-800">{formatDate(filing.applicationDate)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur rounded-xl border border-green-200 shadow-sm hover:shadow-md transition">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileText size={18} className="text-green-600" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Patent Type</span>
                        <span className="text-sm font-semibold text-gray-800">{filing.patentType} ({filing.filingType})</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur rounded-xl border border-yellow-200 shadow-sm hover:shadow-md transition">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <DollarSign size={18} className="text-yellow-600" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Amount Paid</span>
                        <span className="text-sm font-semibold text-gray-800">₹{filing.paymentAmount}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Progress Tracker Preview */}
                  <div className="mt-5 p-5 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl border-2 border-blue-300/50 backdrop-blur shadow-inner">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={20} className="text-blue-600" />
                        <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          Application Progress
                        </span>
                      </div>
                      {filing.stage5Granted && (
                        <span className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg animate-pulse flex items-center gap-1">
                          <span className="text-base">🏆</span>
                          GRANTED
                        </span>
                      )}                    {filing.status === 'Patent is Rejected' && (
                      <span className="px-4 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold rounded-full shadow-lg animate-pulse flex items-center gap-1">
                        <span className="text-base">❌</span>
                        REJECTED
                      </span>
                    )}                    </div>
                    <div className="flex gap-3">
                      {[
                        { completed: filing.stage1Filed, label: 'Filed', color: 'blue' },
                        { completed: filing.stage2AdminReview, label: 'Admin Review', color: 'purple' },
                        { completed: filing.stage3TechnicalReview, label: 'Technical', color: 'indigo' },
                        { completed: filing.stage4Verification, label: 'Verification', color: 'green' },
                        { completed: filing.stage5Granted, label: filing.status === 'Patent is Rejected' ? 'Rejected' : 'Granted', color: filing.status === 'Patent is Rejected' ? 'red' : 'emerald' }
                      ].map((stage, idx) => (
                        <div key={idx} className="flex-1">
                          <div className={`h-3 rounded-full shadow-inner transition-all duration-500 ${
                            stage.completed 
                              ? stage.color === 'red'
                                ? `bg-gradient-to-r from-red-400 to-red-600 shadow-red-300`
                                : `bg-gradient-to-r from-green-400 to-green-600 shadow-green-300` 
                              : 'bg-gray-300'
                          }`}>
                            {stage.completed && (
                              <div className={`h-full rounded-full animate-pulse ${
                                stage.color === 'red'
                                  ? 'bg-gradient-to-r from-red-300/50 to-red-500/50'
                                  : 'bg-gradient-to-r from-green-300/50 to-green-500/50'
                              }`}></div>
                            )}
                          </div>
                          <span className={`text-xs block mt-2 text-center font-medium ${
                            stage.completed 
                              ? stage.color === 'red' ? 'text-red-700' : 'text-green-700' 
                              : 'text-gray-500'
                          }`}>
                            {stage.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Status badges with enhanced design */}
                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <span className={`px-4 py-2 rounded-xl text-sm font-bold border-2 shadow-md ${getStatusColor(filing.status)} flex items-center gap-2`}>
                      <CheckCircle size={16} />
                      {filing.status?.toUpperCase()}
                    </span>
                    <span className="px-4 py-2 bg-white/80 backdrop-blur text-gray-600 rounded-xl text-xs font-medium border border-gray-300 shadow-sm">
                      💳 Payment ID: <span className="font-bold text-gray-800">{filing.paymentId}</span>
                    </span>
                  </div>
                </div>
                
                {/* Enhanced View Details Button */}
                <button
                  onClick={() => toggleDetails(filing.id)}
                  className="ml-6 px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2 font-bold shadow-lg"
                >
                  <Eye size={20} />
                  {expandedFilingId === filing.id ? 'Hide Details' : 'View Details'}
                </button>
              </div>

              {/* Expanded Details Section */}
              {expandedFilingId === filing.id && (
                <div 
                  id={`patent-details-${filing.id}`}
                  className="mt-6 pt-6 border-t-2 border-gray-200 space-y-6 animate-[slideDown_0.3s_ease-out]"
                >
                  {/* Progress Tracker */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-green-400 pb-2">
                      📊 Application Progress Tracker
                    </h3>
                    <PatentProgressTracker filing={filing} />
                  </div>
                  
                  {/* Grant/Reject Details */}
                  {filing.stage5Granted && filing.status !== 'Patent is Rejected' && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-300 shadow-lg">
                      <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                        <span className="text-2xl">🏆</span>
                        Patent Granted - Official Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/70 p-4 rounded-lg border border-green-200">
                          <label className="text-sm font-semibold text-green-700 block mb-1">📜 Patent Number</label>
                          <p className="text-gray-900 font-bold">{filing.patentNumber || 'N/A'}</p>
                        </div>
                        <div className="bg-white/70 p-4 rounded-lg border border-green-200">
                          <label className="text-sm font-semibold text-green-700 block mb-1">👤 Granted by</label>
                          <p className="text-gray-900 font-bold">{filing.grantedPatentPersonName || 'N/A'}</p>
                        </div>
                        <div className="bg-white/70 p-4 rounded-lg border border-green-200">
                          <label className="text-sm font-semibold text-green-700 block mb-1">📍 Location</label>
                          <p className="text-gray-900 font-bold">{filing.location || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {filing.status === 'Patent is Rejected' && (
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border-2 border-red-300 shadow-lg">
                      <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                        <span className="text-2xl">❌</span>
                        Patent Rejected - Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/70 p-4 rounded-lg border border-red-200">
                          <label className="text-sm font-semibold text-red-700 block mb-1">📜 Rejected Patent Number</label>
                          <p className="text-gray-900 font-bold">{filing.rejectedPatentNumber || 'N/A'}</p>
                        </div>
                        <div className="bg-white/70 p-4 rounded-lg border border-red-200">
                          <label className="text-sm font-semibold text-red-700 block mb-1">👤 Rejected by</label>
                          <p className="text-gray-900 font-bold">{filing.rejectedPatentPersonName || 'N/A'}</p>
                        </div>
                        <div className="bg-white/70 p-4 rounded-lg border border-red-200">
                          <label className="text-sm font-semibold text-red-700 block mb-1">📍 Location</label>
                          <p className="text-gray-900 font-bold">{filing.location || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-200">
                        <p className="text-red-800 text-sm">
                          <strong>⚠️ Note:</strong> Your patent application has been reviewed and unfortunately could not be approved at this time. 
                          Please contact our support team for detailed feedback and guidance on possible next steps.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Applicant Information */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-blue-400 pb-2">
                      👤 Applicant Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailItem label="Name" value={filing.applicantName} />
                      <DetailItem label="Email" value={filing.applicantEmail} />
                      <DetailItem label="Phone" value={filing.applicantPhone} />
                      <DetailItem label="Type" value={filing.applicantType} />
                      {filing.organizationName && (
                        <DetailItem label="Organization" value={filing.organizationName} />
                      )}
                      {filing.dateOfBirth && (
                        <DetailItem label="Date of Birth" value={formatDate(filing.dateOfBirth)} />
                      )}
                      {filing.age && (
                        <DetailItem label="Age" value={filing.age} />
                      )}
                      {filing.gender && (
                        <DetailItem label="Gender" value={filing.gender} />
                      )}
                      {filing.occupation && (
                        <DetailItem label="Occupation" value={filing.occupation} />
                      )}
                      {filing.designation && (
                        <DetailItem label="Designation" value={filing.designation} />
                      )}
                      {filing.educationalQualification && (
                        <DetailItem label="Education" value={filing.educationalQualification} />
                      )}
                      <DetailItem label="Application Date" value={formatDate(filing.applicationDate)} />
                    </div>
                    
                    <div className="mt-4">
                      <span className="font-bold text-gray-800">Address:</span>
                      <p className="text-gray-700 mt-1">
                        {filing.applicantAddress}, {filing.applicantCity}, {filing.applicantState} - {filing.applicantPincode}, {filing.applicantCountry}
                      </p>
                    </div>

                    {/* Government ID Details */}
                    {filing.govtIdType && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-gray-900 mb-2">Government ID Details</h4>
                        <DetailItem label="ID Type" value={filing.govtIdType} />
                        <DetailItem label="ID Number" value={filing.govtIdNumber} />
                        {filing.aadhaarNumber && (
                          <DetailItem label="Aadhaar Number" value={filing.aadhaarNumber} />
                        )}
                        {filing.panNumber && (
                          <DetailItem label="PAN Number" value={filing.panNumber} />
                        )}
                        {filing.passportCountry && (
                          <DetailItem label="Passport Country" value={filing.passportCountry} />
                        )}
                        {filing.drivingLicenseState && (
                          <DetailItem label="DL State" value={filing.drivingLicenseState} />
                        )}
                      </div>
                    )}

                    {/* Additional Contact */}
                    {(filing.alternatePhone || filing.alternateEmail || filing.gstin) && (
                      <div className="mt-4">
                        <h4 className="font-bold text-gray-900 mb-2">Additional Contact</h4>
                        {filing.alternatePhone && (
                          <DetailItem label="Alternate Phone" value={filing.alternatePhone} />
                        )}
                        {filing.alternateEmail && (
                          <DetailItem label="Alternate Email" value={filing.alternateEmail} />
                        )}
                        {filing.gstin && (
                          <DetailItem label="GSTIN" value={filing.gstin} />
                        )}
                      </div>
                    )}

                    {/* Correspondence Address */}
                    {filing.correspondenceAddress && !filing.sameAsApplicantAddress && (
                      <div className="mt-4">
                        <span className="font-bold text-gray-800">Correspondence Address:</span>
                        <p className="text-gray-700 mt-1">
                          {filing.correspondenceAddress}, {filing.correspondenceCity}, {filing.correspondenceState} - {filing.correspondencePincode}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Invention Details */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-purple-400 pb-2">
                      💡 Invention Details
                    </h3>
                    <DetailItem label="Title" value={filing.inventionTitle} />
                    <DetailItem label="Field" value={filing.inventionField} />
                    {filing.targetIndustry && (
                      <DetailItem label="Target Industry" value={filing.targetIndustry} />
                    )}
                    <div className="mt-4">
                      <span className="font-bold text-gray-800">Description:</span>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">{filing.inventionDescription}</p>
                    </div>
                    {filing.keywords && (
                      <div className="mt-4">
                        <span className="font-bold text-gray-800">Keywords:</span>
                        <p className="text-gray-700 mt-1">{filing.keywords}</p>
                      </div>
                    )}
                    {filing.technicalProblem && (
                      <div className="mt-4">
                        <span className="font-bold text-gray-800">Technical Problem:</span>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">{filing.technicalProblem}</p>
                      </div>
                    )}
                    {filing.proposedSolution && (
                      <div className="mt-4">
                        <span className="font-bold text-gray-800">Proposed Solution:</span>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">{filing.proposedSolution}</p>
                      </div>
                    )}
                    {filing.advantages && (
                      <div className="mt-4">
                        <span className="font-bold text-gray-800">Advantages:</span>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">{filing.advantages}</p>
                      </div>
                    )}
                    {filing.commercialApplication && (
                      <div className="mt-4">
                        <span className="font-bold text-gray-800">Commercial Application:</span>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">{filing.commercialApplication}</p>
                      </div>
                    )}
                    {filing.priorArt && (
                      <div className="mt-4">
                        <span className="font-bold text-gray-800">Prior Art:</span>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">{filing.priorArt}</p>
                      </div>
                    )}
                  </div>

                  {/* Patent Details */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-green-400 pb-2">
                      📋 Patent Specifications
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailItem label="Patent Type" value={filing.patentType} />
                      <DetailItem label="Filing Type" value={filing.filingType} />
                      <DetailItem label="Number of Claims" value={filing.numberOfClaims} />
                      <DetailItem label="Number of Drawings" value={filing.numberOfDrawings} />
                      {filing.claimsPriority && filing.priorityDate && (
                        <>
                          <DetailItem label="Priority Date" value={formatDate(filing.priorityDate)} />
                          <DetailItem label="Priority Number" value={filing.priorityNumber} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-orange-400 pb-2">
                      📎 Documents
                    </h3>
                    <div className="space-y-2">
                      {filing.descriptionFileUrl && (
                        <DocumentLink label="Description" url={filing.descriptionFileUrl} />
                      )}
                      {filing.claimsFileUrl && (
                        <DocumentLink label="Claims" url={filing.claimsFileUrl} />
                      )}
                      {filing.abstractFileUrl && (
                        <DocumentLink label="Abstract" url={filing.abstractFileUrl} />
                      )}
                      {filing.drawingsFileUrl && (
                        <DocumentLink label="Drawings" url={filing.drawingsFileUrl} />
                      )}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-yellow-400 pb-2">
                      💳 Payment Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailItem label="Amount" value={`₹${filing.paymentAmount} ${filing.paymentCurrency}`} />
                      <DetailItem label="Payment ID" value={filing.paymentId} />
                      <DetailItem label="Status" value={filing.paymentStatus} />
                      <DetailItem label="Payment Time" value={formatDateTime(filing.paymentTimestamp)} />
                      {filing.paymentOrderId && (
                        <DetailItem label="Order ID" value={filing.paymentOrderId} />
                      )}
                    </div>
                  </div>

                  {/* Filing Status */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-pink-400 pb-2">
                      📊 Filing Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailItem label="Status" value={filing.status} />
                      <DetailItem label="Filing Date" value={formatDateTime(filing.filingDate)} />
                      <DetailItem label="Created At" value={formatDateTime(filing.createdAt)} />
                      <DetailItem label="Updated At" value={formatDateTime(filing.updatedAt)} />
                    </div>
                  </div>

                  {/* Action Buttons - Download PDF, Share WhatsApp, Showcase LinkedIn */}
                  <div className="pt-6 border-t-2 border-gray-300">
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                      {/* Download PDF Button */}
                      <button
                        onClick={() => downloadPDF(filing)}
                        disabled={generatingPdf}
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3 disabled:cursor-not-allowed"
                      >
                        <Download size={24} />
                        <span className="text-lg">{generatingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
                      </button>

                      {/* Share on WhatsApp Button */}
                      <button
                        onClick={() => shareOnWhatsApp(filing)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3"
                      >
                        <Share2 size={24} />
                        <span className="text-lg">Share on WhatsApp</span>
                      </button>

                      {/* Showcase on LinkedIn Button */}
                      <button
                        onClick={() => shareOnLinkedIn(filing)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3"
                      >
                        <Linkedin size={24} />
                        <span className="text-lg">Showcase on LinkedIn</span>
                      </button>
                    </div>
                    
                    {/* Helper text */}
                    <div className="mt-3 text-center text-sm text-gray-600">
                      <p>💡 <strong>Tip:</strong> Download the complete patent details as PDF, share progress on WhatsApp, or showcase your achievement on LinkedIn!</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Chat Icon Button - Bottom Right */}
              <button
                onClick={() => openChatModal(filing)}
                className="absolute bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 z-10 group"
                style={{ bottom: '110px', right: '80px', padding: '10px' }}
                title="Chat with Admin"
              >
                <MessageCircle size={26} className="group-hover:animate-pulse" />
                {getNewRepliesCount(filing) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse shadow-lg border-2 border-white">
                    {getNewRepliesCount(filing)}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Pagination Controls - Only show if there are results */}
        {filings.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2 pb-4">
            {/* Previous Button */}
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:shadow-md disabled:hover:bg-white"
            >
              ← Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-2">
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                // Show first page, last page, current page, and pages around current
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => goToPage(pageNumber)}
                      className={`w-10 h-10 rounded-lg font-bold transition-all duration-300 ${
                        currentPage === pageNumber
                          ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg scale-110'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:shadow-md'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                }
                // Show ellipsis
                if (
                  pageNumber === currentPage - 2 ||
                  pageNumber === currentPage + 2
                ) {
                  return (
                    <span key={pageNumber} className="text-gray-400 font-bold">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:shadow-md disabled:hover:bg-white"
            >
              Next →
            </button>
          </div>
        )}

        {/* Results Info */}
        {filings.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Showing {startIndex + 1} - {Math.min(endIndex, filings.length)} of {filings.length} patent{filings.length !== 1 ? 's' : ''}
          </div>
        )}
        </>
      )}

      {/* Chat Modal - Available for all users */}
      {showChatModal && selectedPatent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-[slideIn_0.3s_ease-out]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <MessageCircle size={28} />
                  <h2 className="text-2xl font-bold">Chat with Admin</h2>
                </div>
                <button
                  onClick={closeChatModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-sm bg-white/20 px-4 py-2 rounded-lg font-semibold">
                📋 Patent: {selectedPatent.inventionTitle}
              </p>
            </div>

            {/* Toast Message */}
            {showToast && (
              <div className={`mx-6 mt-4 p-4 rounded-lg border-2 ${
                userProfile?.subscriptionType?.toLowerCase() === 'enterprise'
                  ? 'bg-purple-50 border-purple-300'
                  : 'bg-blue-50 border-blue-300'
              } animate-[slideDown_0.3s_ease-out]`}>
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-bold ${
                    userProfile?.subscriptionType?.toLowerCase() === 'enterprise'
                      ? 'text-purple-800'
                      : 'text-blue-800'
                  }`}>
                    {userProfile?.subscriptionType?.toLowerCase() === 'enterprise'
                      ? '💼 You can send maximum 5 messages to enquire about this patent'
                      : '⭐ You can send only 2 messages to enquire about this patent'}
                  </p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    userProfile?.subscriptionType?.toLowerCase() === 'enterprise'
                      ? 'bg-purple-200 text-purple-800'
                      : 'bg-blue-200 text-blue-800'
                  }`}>
                    {toastTimer}s
                  </span>
                </div>
              </div>
            )}

            {/* Chat Messages Area */}
            <div className="p-6 max-h-96 overflow-y-auto space-y-4">
              {[1, 2, 3, 4, 5].map(i => {
                const userMsg = selectedPatent[`m${i}`];
                const adminReply = selectedPatent[`r${i}`];
                
                return (
                  <div key={i}>
                    {userMsg && (
                      <div className="flex justify-end mb-2">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 rounded-2xl rounded-tr-none max-w-[80%] shadow-lg">
                          <p className="text-sm font-medium mb-1">You</p>
                          <p>{userMsg}</p>
                        </div>
                      </div>
                    )}
                    
                    {adminReply && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl rounded-tl-none max-w-[80%] border border-gray-300 shadow">
                          <p className="text-sm font-medium mb-1 text-blue-600">Admin</p>
                          <p>{adminReply}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {!selectedPatent.m1 && (
                <div className="text-center py-8">
                  <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              )}
            </div>

            {/* Message Input Area */}
            <div className="p-6 border-t-2 border-gray-200 bg-gray-50">
              {messageLimitReached ? (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-center">
                  <p className="text-red-800 font-bold">
                    ⚠️ You have reached your message limit of {getMessageLimit()} messages for this patent.
                  </p>
                  <p className="text-red-600 text-sm mt-2">
                    Please wait for admin replies or upgrade your subscription for more messages.
                  </p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message here..."
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition"
                    maxLength={500}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!currentMessage.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold"
                  >
                    <Send size={20} />
                    Send
                  </button>
                </div>
              )}
              
              <div className="mt-3 text-center">
                <span className="text-xs text-gray-600">
                  Messages sent: <span className="font-bold text-blue-600">{getMessageCount(selectedPatent)}</span> / {getMessageLimit()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            max-height: 5000px;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
});

const DetailItem = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="mb-2">
      <span className="font-bold text-gray-800">{label}:</span>
      <span className="text-gray-700 ml-2">{value}</span>
    </div>
  );
};

const DocumentLink = ({ label, url }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
      <span className="font-semibold text-gray-800">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
      >
        View Document
      </a>
    </div>
  );
};

FilingTracker.displayName = 'FilingTracker';

export default FilingTracker;
