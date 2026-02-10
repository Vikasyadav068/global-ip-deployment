import React, { useState, useEffect } from 'react';
import { Cookie, ArrowLeft, Calendar, FileText, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const CookiePolicyPage = () => {
  const navigate = useNavigate();
  const [cookiePolicy, setCookiePolicy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCookiePolicy = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/cookie`);
        
        if (response.ok) {
          const data = await response.json();
          setCookiePolicy(data.data || null);
        } else {
          setError('Failed to load cookie policy');
        }
      } catch (err) {
        console.error('Error fetching cookie policy:', err);
        setError('An error occurred while loading the cookie policy');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCookiePolicy();
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
    let inTable = false;
    const tableRows = [];
    
    return lines.map((line, index) => {
      // Handle tables
      if (line.includes('|')) {
        if (!inTable) {
          inTable = true;
          tableRows.length = 0;
        }
        tableRows.push(line);
        
        // Check if next line is not a table row
        if (index === lines.length - 1 || !lines[index + 1].includes('|')) {
          inTable = false;
          return (
            <div key={index} className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300">
                <tbody>
                  {tableRows.map((row, i) => {
                    const cells = row.split('|').filter(cell => cell.trim() !== '');
                    const isHeader = i === 0;
                    const isSeparator = row.includes('---');
                    
                    if (isSeparator) return null;
                    
                    return (
                      <tr key={i} className={isHeader ? 'bg-indigo-100' : 'bg-white'}>
                        {cells.map((cell, j) => {
                          const CellTag = isHeader ? 'th' : 'td';
                          return (
                            <CellTag
                              key={j}
                              className={`border border-gray-300 px-4 py-2 ${isHeader ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                            >
                              {cell.trim()}
                            </CellTag>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      }
      
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
      
      // Handle numbered lists
      if (/^\d+\./.test(line.trim())) {
        return <li key={index} className="text-gray-700 ml-6 mb-1 list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>;
      }
      
      // Handle horizontal rules
      if (line.trim() === '---') {
        return <hr key={index} className="my-6 border-gray-300" />;
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
              <Cookie className="w-6 h-6" />
              <span className="text-lg font-semibold">Cookie Policy</span>
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
              <p className="text-gray-600">Loading cookie policy...</p>
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
          ) : cookiePolicy ? (
            <>
              {/* Policy Header */}
              <div className="border-b border-gray-200 pb-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Cookie className="w-10 h-10 text-indigo-600" />
                  <h1 className="text-4xl font-bold text-gray-900">{cookiePolicy.title}</h1>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Version: {cookiePolicy.version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Effective Date: {formatDate(cookiePolicy.effectiveDate)}</span>
                  </div>
                  {cookiePolicy.updatedAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Last Updated: {formatDate(cookiePolicy.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Policy Content */}
              <div className="prose prose-lg max-w-none">
                {renderContent(cookiePolicy.content)}
              </div>

              {/* Cookie Settings Notice */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Cookie className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Manage Cookie Preferences</h3>
                    <p className="text-blue-800 mb-3">
                      You can manage your cookie preferences at any time through your browser settings or 
                      by visiting the Settings page in your account.
                    </p>
                    <button
                      onClick={() => navigate('/dashboard?page=settings')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Go to Settings
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">No cookie policy available</p>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-indigo-50 rounded-lg p-6 border border-indigo-200">
          <h3 className="text-lg font-semibold text-indigo-900 mb-2">Questions or Concerns?</h3>
          <p className="text-indigo-700 mb-4">
            If you have any questions about our Cookie Policy, please contact us at:
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

export default CookiePolicyPage;
