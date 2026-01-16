import React, { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Calendar, Scale, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfServicePage = () => {
  const navigate = useNavigate();
  const [termsConditions, setTermsConditions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTermsConditions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const API_BASE = 'http://localhost:8080/api';
        const response = await fetch(`${API_BASE}/terms`);
        
        if (response.ok) {
          const data = await response.json();
          setTermsConditions(data.data || null);
        } else {
          setError('Failed to load terms of service');
        }
      } catch (err) {
        console.error('Error fetching terms of service:', err);
        setError('An error occurred while loading the terms of service');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTermsConditions();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const renderContent = (content) => {
    if (!content) return null;
    
    // Split content by lines and render with proper formatting
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Handle headings
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold text-gray-900 mt-8 mb-4">{line.substring(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-semibold text-gray-800 mt-6 mb-3">{line.substring(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-semibold text-gray-700 mt-4 mb-2">{line.substring(4)}</h3>;
      }
      
      // Handle bold text
      const boldPattern = /\*\*(.*?)\*\*/g;
      if (boldPattern.test(line)) {
        const parts = line.split(boldPattern);
        return (
          <p key={index} className="text-gray-700 mb-2 leading-relaxed">
            {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
          </p>
        );
      }
      
      // Handle bullet points
      if (line.trim().startsWith('- ')) {
        return <li key={index} className="text-gray-700 ml-6 mb-1">{line.substring(2)}</li>;
      }
      
      // Handle empty lines
      if (line.trim() === '') {
        return <div key={index} className="h-2"></div>;
      }
      
      // Regular paragraph
      return <p key={index} className="text-gray-700 mb-2 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-indigo-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-2 text-indigo-600">
              <Scale className="w-6 h-6" />
              <span className="text-lg font-semibold">Terms of Service</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-600">Loading terms of service...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <p className="text-red-600 text-lg font-medium mb-2">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : termsConditions ? (
            <>
              {/* Terms Header */}
              <div className="border-b border-gray-200 pb-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Scale className="w-10 h-10 text-indigo-600" />
                  <h1 className="text-4xl font-bold text-gray-900">{termsConditions.title}</h1>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Version: {termsConditions.version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Effective Date: {formatDate(termsConditions.effectiveDate)}</span>
                  </div>
                  {termsConditions.updatedAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Last Updated: {formatDate(termsConditions.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms Content */}
              <div className="prose prose-lg max-w-none">
                {renderContent(termsConditions.content)}
              </div>

              {/* Agreement Notice */}
              <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">Important Notice</h3>
                    <p className="text-yellow-800">
                      By using our platform, you agree to these Terms of Service. If you do not agree to these terms, 
                      please discontinue use of the Global IP Intelligence Platform.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">No terms of service available</p>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-indigo-50 rounded-lg p-6 border border-indigo-200">
          <h3 className="text-lg font-semibold text-indigo-900 mb-2">Questions or Concerns?</h3>
          <p className="text-indigo-700 mb-4">
            If you have any questions about our Terms of Service, please contact us at:
          </p>
          <a
            href="mailto:vikaskumaryadav068@gmail.com"
            className="text-indigo-600 hover:text-indigo-800 font-medium underline"
          >
            vikaskumaryadav068@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
