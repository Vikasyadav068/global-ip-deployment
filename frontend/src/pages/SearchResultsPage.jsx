import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, History, Filter, Globe, Database, Share2, Copy, Download, X } from 'lucide-react';
import { getSearchCounters, incrementSearchCounter } from '../utils/searchCounters';

const SearchResultsPage = ({ query, onBack, searchMode = 'api', setSearchMode, userProfile }) => {
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatent, setSelectedPatent] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [apiSearchCounter, setApiSearchCounter] = useState(0);
  const [localSearchCounter, setLocalSearchCounter] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    filingDateFrom: '',
    filingDateTo: '',
    searchText: '',
    assignee: '',
    inventor: '',
    status: '',
    jurisdiction: ''
  });
  const [showModal, setShowModal] = useState(false);
  // Ref to track if search has already been processed to prevent duplicate increments
  const searchProcessedRef = useRef(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleShareWhatsApp = (patent) => {
    const text = `*PATENT DETAILS*\n\n` +
      `*Title:* ${patent.title || 'N/A'}\n` +
      `*ID:* ${patent.id || patent.ipRightIdentifier || 'N/A'}\n` +
      `*Asset Number:* ${patent.assetNumber || 'N/A'}\n` +
      `*Type:* ${patent.type || 'N/A'}\n\n` +
      `*Assignee:* ${patent.assignee || 'N/A'}\n` +
      `*Inventor:* ${patent.inventor || 'N/A'}\n` +
      `*Jurisdiction:* ${patent.jurisdiction || 'N/A'}\n` +
      `*Filing Date:* ${patent.filingDate || 'N/A'}\n` +
      `*Status:* ${patent.status || 'N/A'}\n\n` +
      `*Abstract:* ${patent.abstractText || 'N/A'}\n\n` +
      `*Classification:* ${patent.classInfo || 'N/A'}\n\n` +
      `*Additional Details:* ${patent.details || 'N/A'}\n\n` +
      `*Source:* ${patent.apiSource || 'N/A'}\n` +
      `*Last Updated:* ${patent.lastUpdated ? new Date(patent.lastUpdated).toLocaleString() : 'N/A'}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyToClipboard = async (patent) => {
    const text = `PATENT DETAILS\n\n` +
      `Title: ${patent.title || 'N/A'}\n` +
      `ID: ${patent.id || patent.ipRightIdentifier || 'N/A'}\n` +
      `Asset Number: ${patent.assetNumber || 'N/A'}\n` +
      `Type: ${patent.type || 'N/A'}\n\n` +
      `Assignee: ${patent.assignee || 'N/A'}\n` +
      `Inventor: ${patent.inventor || 'N/A'}\n` +
      `Jurisdiction: ${patent.jurisdiction || 'N/A'}\n` +
      `Filing Date: ${patent.filingDate || 'N/A'}\n` +
      `Status: ${patent.status || 'N/A'}\n\n` +
      `Abstract: ${patent.abstractText || 'N/A'}\n\n` +
      `Classification: ${patent.classInfo || 'N/A'}\n\n` +
      `Additional Details: ${patent.details || 'N/A'}\n\n` +
      `Source: ${patent.apiSource || 'N/A'}\n` +
      `Last Updated: ${patent.lastUpdated ? new Date(patent.lastUpdated).toLocaleString() : 'N/A'}`;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownloadPatent = (patent) => {
    const content = `PATENT DETAILS\n\n` +
      `Title: ${patent.title || 'N/A'}\n` +
      `ID: ${patent.id || patent.ipRightIdentifier || 'N/A'}\n` +
      `Asset Number: ${patent.assetNumber || 'N/A'}\n` +
      `Type: ${patent.type || 'N/A'}\n` +
      `Assignee: ${patent.assignee || 'N/A'}\n` +
      `Inventor: ${patent.inventor || 'N/A'}\n` +
      `Jurisdiction: ${patent.jurisdiction || 'N/A'}\n` +
      `Filing Date: ${patent.filingDate || 'N/A'}\n` +
      `Status: ${patent.status || 'N/A'}\n\n` +
      `ABSTRACT:\n${patent.abstractText || 'N/A'}\n\n` +
      `CLASSIFICATION:\n${patent.classInfo || 'N/A'}\n\n` +
      `ADDITIONAL DETAILS:\n${patent.details || 'N/A'}\n\n` +
      `Source: ${patent.apiSource || 'N/A'}\n` +
      `Last Updated: ${patent.lastUpdated ? new Date(patent.lastUpdated).toLocaleString() : 'N/A'}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patent_${patent.id || patent.ipRightIdentifier || 'document'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Load search counters from Firestore
    const loadCounters = async () => {
      if (userProfile?.uid) {
        try {
          const counters = await getSearchCounters(userProfile.uid);
          setApiSearchCounter(counters.apiSearchCount);
          setLocalSearchCounter(counters.localSearchCount);
          console.log('✅ Loaded search counters from Firestore:', counters);
        } catch (error) {
          console.error('❌ Error loading search counters:', error);
          // Fallback to localStorage if Firestore fails
          const apiCounter = localStorage.getItem('apiSearchCounter');
          if (apiCounter) {
            setApiSearchCounter(parseInt(apiCounter, 10));
          }
          
          const localCounter = localStorage.getItem('localSearchCounter');
          if (localCounter) {
            setLocalSearchCounter(parseInt(localCounter, 10));
          }
        }
      } else {
        console.warn('⚠️ No user profile available, using localStorage for counters');
        // Fallback to localStorage if no user profile
        const apiCounter = localStorage.getItem('apiSearchCounter');
        if (apiCounter) {
          setApiSearchCounter(parseInt(apiCounter, 10));
        }
        
        const localCounter = localStorage.getItem('localSearchCounter');
        if (localCounter) {
          setLocalSearchCounter(parseInt(localCounter, 10));
        }
      }
    };
    
    loadCounters();

    // Load search history
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history);

    if (query) {
      // Reset the search processed ref when query changes
      searchProcessedRef.current = null;
      handleSearch(query);
    }
  }, [query, userProfile?.uid]);

  // Auto-load all patents when switching to local mode or on initial load
  useEffect(() => {
    const autoLoadLocalPatents = async () => {
      if (searchMode === 'local' && !query) {
        console.log('Auto-loading all patents from local database...');
        try {
          let patentResults = [];
          let patentFilingsResults = [];
          
          // Fetch regular patents
          const response = await fetch('http://localhost:8080/api/patents/local');
          if (response.ok) {
            const data = await response.json();
            console.log(`Auto-loaded ${data.length} patents from database`);
            patentResults = data || [];
          } else {
            console.log('Could not auto-load patents, backend may not be running');
          }
          
          // Fetch granted/rejected patent filings
          try {
            const filingsResponse = await fetch('http://localhost:8080/api/patent-filing/search/granted-rejected');
            if (filingsResponse.ok) {
              const filingsData = await filingsResponse.json();
              console.log(`Auto-loaded ${filingsData.length} granted/rejected patent filings`);
              
              // Transform patent filings to match patent structure
              patentFilingsResults = filingsData.map(filing => ({
                id: `PF-${filing.id}`,
                ipRightIdentifier: filing.patentNumber || `FILING-${filing.id}`,
                title: filing.inventionTitle,
                abstractText: filing.inventionDescription,
                assignee: filing.applicantName,
                inventor: filing.applicantName,
                jurisdiction: filing.applicantCountry,
                filingDate: filing.applicationDate,
                status: filing.status,
                type: 'Patent Filing',
                apiSource: 'Patent Filings Database',
                assetNumber: filing.patentNumber || filing.id,
                filingSource: 'patent_filings',
                fullFilingData: filing,
                applicantEmail: filing.applicantEmail,
                applicantPhone: filing.applicantPhone,
                location: filing.location,
                grantedBy: filing.grantedPatentPersonName,
                rejectedBy: filing.rejectedPatentPersonName,
                lastUpdated: filing.updatedAt
              }));
            }
          } catch (filingError) {
            console.log('Could not auto-load patent filings:', filingError.message);
          }
          
          // Merge both results
          const mergedResults = [...patentResults, ...patentFilingsResults];
          setResults(mergedResults);
        } catch (error) {
          console.log('Backend not available for auto-load:', error.message);
        }
      }
    };
    autoLoadLocalPatents();
  }, [searchMode]);

  // Apply filters when results or filter criteria change
  useEffect(() => {
    applyFilters();
  }, [results, filters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredResults.length]);

  const applyFilters = () => {
    let filtered = [...results];

    // Filter by search text
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(patent => 
        (patent.title && patent.title.toLowerCase().includes(searchLower)) ||
        (patent.abstractText && patent.abstractText.toLowerCase().includes(searchLower)) ||
        (patent.ipRightIdentifier && patent.ipRightIdentifier.toLowerCase().includes(searchLower)) ||
        (patent.id && patent.id.toLowerCase().includes(searchLower))
      );
    }

    // Filter by assignee
    if (filters.assignee) {
      const assigneeLower = filters.assignee.toLowerCase();
      filtered = filtered.filter(patent => 
        patent.assignee && patent.assignee.toLowerCase().includes(assigneeLower)
      );
    }

    // Filter by inventor
    if (filters.inventor) {
      const inventorLower = filters.inventor.toLowerCase();
      filtered = filtered.filter(patent => 
        patent.inventor && patent.inventor.toLowerCase().includes(inventorLower)
      );
    }

    // Filter by status
    if (filters.status) {
      const statusLower = filters.status.toLowerCase();
      filtered = filtered.filter(patent => 
        patent.status && patent.status.toLowerCase().includes(statusLower)
      );
    }

    // Filter by jurisdiction
    if (filters.jurisdiction) {
      const jurisdictionLower = filters.jurisdiction.toLowerCase();
      filtered = filtered.filter(patent => 
        patent.jurisdiction && patent.jurisdiction.toLowerCase().includes(jurisdictionLower)
      );
    }

    // Filter by filing date from
    if (filters.filingDateFrom) {
      filtered = filtered.filter(patent => 
        patent.filingDate && new Date(patent.filingDate) >= new Date(filters.filingDateFrom)
      );
    }

    // Filter by filing date to
    if (filters.filingDateTo) {
      filtered = filtered.filter(patent => 
        patent.filingDate && new Date(patent.filingDate) <= new Date(filters.filingDateTo)
      );
    }

    setFilteredResults(filtered);
  };

  const resetFilters = () => {
    setFilters({
      filingDateFrom: '',
      filingDateTo: '',
      searchText: '',
      assignee: '',
      inventor: '',
      status: '',
      jurisdiction: ''
    });
  };

  const handleSearch = async (searchQuery) => {
    setLoading(true);
    try {
      if (searchMode === 'local') {
        // Search from local PostgreSQL database (my_project_db)
        console.log('Searching local database (my_project_db) for:', searchQuery || '(all patents)');
        
        let patentResults = [];
        let patentFilingsResults = [];
        
        // If no query, use GET endpoint to fetch all
        if (!searchQuery || searchQuery.trim() === '') {
          // Fetch regular patents
          const response = await fetch('http://localhost:8080/api/patents/local');
          if (response.ok) {
            const data = await response.json();
            console.log(`Found ${data.length} patents in local database (all records)`);
            patentResults = data || [];
          } else {
            console.error('Failed to fetch all patents. Status:', response.status);
          }
          
          // Fetch granted/rejected patent filings
          try {
            console.log('🔍 Fetching granted/rejected patent filings...');
            const filingsResponse = await fetch('http://localhost:8080/api/patent-filing/search/granted-rejected');
            console.log('📡 Patent filings response status:', filingsResponse.status);
            if (filingsResponse.ok) {
              const filingsData = await filingsResponse.json();
              console.log(`✅ Found ${filingsData.length} granted/rejected patent filings`);
              console.log('📄 Patent filings data:', filingsData);
              
              // Transform patent filings to match patent structure
              patentFilingsResults = filingsData.map(filing => ({
                id: `PF-${filing.id}`,
                ipRightIdentifier: filing.patentNumber || `FILING-${filing.id}`,
                title: filing.inventionTitle,
                abstractText: filing.inventionDescription,
                assignee: filing.applicantName,
                inventor: filing.applicantName,
                jurisdiction: filing.applicantCountry,
                filingDate: filing.applicationDate,
                status: filing.status,
                type: 'Patent Filing',
                apiSource: 'Patent Filings Database',
                assetNumber: filing.patentNumber || filing.id,
                // Store full filing data for detailed view
                filingSource: 'patent_filings',
                fullFilingData: filing,
                // Quick access fields
                applicantEmail: filing.applicantEmail,
                applicantPhone: filing.applicantPhone,
                location: filing.location,
                grantedBy: filing.grantedPatentPersonName,
                rejectedBy: filing.rejectedPatentPersonName,
                lastUpdated: filing.updatedAt
              }));
            } else {
              console.error('❌ Failed to fetch patent filings. Status:', filingsResponse.status);
              const errorText = await filingsResponse.text();
              console.error('Error details:', errorText);
            }
          } catch (filingError) {
            console.error('❌ Error fetching patent filings:', filingError);
            console.error('Full error:', filingError.message, filingError.stack);
          }
          
          // Merge both results
          const mergedResults = [...patentResults, ...patentFilingsResults];
          console.log(`📊 Merged results: ${patentResults.length} patents + ${patentFilingsResults.length} filings = ${mergedResults.length} total`);
          setResults(mergedResults);
        } else {
          // Search with query - search regular patents
          const response = await fetch('http://localhost:8080/api/patents/search/local', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: searchQuery }),
          });
          if (response.ok) {
            const data = await response.json();
            console.log(`Found ${data.length} patents in local database`);
            patentResults = data || [];
          } else {
            console.error('Local database search failed. Status:', response.status);
          }
          
          // Also search in patent filings
          try {
            console.log('🔍 Searching patent filings with query:', searchQuery);
            const filingsResponse = await fetch('http://localhost:8080/api/patent-filing/search/granted-rejected');
            console.log('📡 Patent filings search response status:', filingsResponse.status);
            if (filingsResponse.ok) {
              const filingsData = await filingsResponse.json();
              console.log(`📄 Total patent filings found: ${filingsData.length}`);
              
              // Filter patent filings by search query
              const filteredFilings = filingsData.filter(filing => {
                const searchLower = searchQuery.toLowerCase();
                return (
                  (filing.inventionTitle && filing.inventionTitle.toLowerCase().includes(searchLower)) ||
                  (filing.inventionDescription && filing.inventionDescription.toLowerCase().includes(searchLower)) ||
                  (filing.applicantName && filing.applicantName.toLowerCase().includes(searchLower)) ||
                  (filing.patentNumber && filing.patentNumber.toLowerCase().includes(searchLower))
                );
              });
              
              console.log(`Found ${filteredFilings.length} matching patent filings`);
              
              // Transform patent filings to match patent structure
              patentFilingsResults = filteredFilings.map(filing => ({
                id: `PF-${filing.id}`,
                ipRightIdentifier: filing.patentNumber || `FILING-${filing.id}`,
                title: filing.inventionTitle,
                abstractText: filing.inventionDescription,
                assignee: filing.applicantName,
                inventor: filing.applicantName,
                jurisdiction: filing.applicantCountry,
                filingDate: filing.applicationDate,
                status: filing.status,
                type: 'Patent Filing',
                apiSource: 'Patent Filings Database',
                assetNumber: filing.patentNumber || filing.id,
                // Store full filing data for detailed view
                filingSource: 'patent_filings',
                fullFilingData: filing,
                // Quick access fields
                applicantEmail: filing.applicantEmail,
                applicantPhone: filing.applicantPhone,
                location: filing.location,
                grantedBy: filing.grantedPatentPersonName,
                rejectedBy: filing.rejectedPatentPersonName,
                lastUpdated: filing.updatedAt
              }));
            }
          } catch (filingError) {
            console.error('Error searching patent filings:', filingError);
          }
          
          // Merge both results
          const mergedResults = [...patentResults, ...patentFilingsResults];
          setResults(mergedResults);
        }
      } else {
        // Search from API
        const response = await fetch('http://localhost:8080/api/patents/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: searchQuery }),
        });
        if (response.ok) {
          const data = await response.json();
          setResults(data || []);
          
          // Store in local database
          const localDB = JSON.parse(localStorage.getItem('patentDatabase') || '[]');
          data.forEach(patent => {
            const exists = localDB.find(p => p.ipRightIdentifier === patent.ipRightIdentifier);
            if (!exists) {
              localDB.push(patent);
            }
          });
          localStorage.setItem('patentDatabase', JSON.stringify(localDB));
        } else {
          // Fallback to mock data if API fails
          console.warn('API failed, using mock data');
          const mockData = [{
            ipRightIdentifier: searchQuery,
            title: `Sample Patent: ${searchQuery}`,
            abstractText: `This is a sample patent abstract for the query: ${searchQuery}. This demonstrates the search functionality.`,
            filingDate: '2023-01-01'
          }];
          setResults(mockData);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to mock data
      const mockData = [{
        ipRightIdentifier: searchQuery,
        title: `Sample Patent: ${searchQuery}`,
        abstractText: `This is a sample patent abstract for the query: ${searchQuery}. This demonstrates the search functionality.`,
        filingDate: '2023-01-01'
      }];
      setResults(mockData);
    } finally {
      setLoading(false);
    }

    // Store search results in localStorage
    const currentResults = results.length > 0 ? results : [{
      ipRightIdentifier: searchQuery,
      title: `Sample Patent: ${searchQuery}`,
      abstractText: `This is a sample patent abstract for the query: ${searchQuery}. This demonstrates the search functionality.`,
      filingDate: '2023-01-01'
    }];

    const searchHistoryData = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    searchHistoryData.push({
      query: searchQuery,
      results: currentResults,
      timestamp: new Date().toISOString(),
      mode: searchMode
    });
    // Keep only last 10 searches
    if (searchHistoryData.length > 10) {
      searchHistoryData.shift();
    }
    localStorage.setItem('searchHistory', JSON.stringify(searchHistoryData));

    // Increment and store the appropriate counter in Firestore
    // Only increment if this search hasn't been processed yet (prevent double counting)
    const searchKey = `${searchQuery}_${searchMode}`;
    if (searchProcessedRef.current !== searchKey) {
      searchProcessedRef.current = searchKey;
      
      if (userProfile?.uid) {
        try {
          await incrementSearchCounter(userProfile.uid, searchMode);
          
          // Update local state immediately
          if (searchMode === 'api') {
            const newApiCounter = apiSearchCounter + 1;
            setApiSearchCounter(newApiCounter);
            // Also update localStorage as backup
            localStorage.setItem('apiSearchCounter', newApiCounter.toString());
          } else {
            const newLocalCounter = localSearchCounter + 1;
            setLocalSearchCounter(newLocalCounter);
            // Also update localStorage as backup
            localStorage.setItem('localSearchCounter', newLocalCounter.toString());
          }
          
          console.log(`✅ ${searchMode} search counter incremented in Firestore`);
        } catch (error) {
          console.error('❌ Error incrementing search counter in Firestore:', error);
          // Fallback to localStorage only
          if (searchMode === 'api') {
            const newApiCounter = apiSearchCounter + 1;
            setApiSearchCounter(newApiCounter);
            localStorage.setItem('apiSearchCounter', newApiCounter.toString());
          } else {
            const newLocalCounter = localSearchCounter + 1;
            setLocalSearchCounter(newLocalCounter);
            localStorage.setItem('localSearchCounter', newLocalCounter.toString());
          }
        }
      } else {
        console.warn('⚠️ No user profile, using localStorage only for counters');
        // Fallback to localStorage if no user profile
        if (searchMode === 'api') {
          const newApiCounter = apiSearchCounter + 1;
          setApiSearchCounter(newApiCounter);
          localStorage.setItem('apiSearchCounter', newApiCounter.toString());
        } else {
          const newLocalCounter = localSearchCounter + 1;
          setLocalSearchCounter(newLocalCounter);
          localStorage.setItem('localSearchCounter', newLocalCounter.toString());
        }
      }
    } else {
      console.log(`⚠️ Search already processed: ${searchKey}`);
    }
  };

  const handleViewDetails = async (patent) => {
    setDetailsLoading(true);
    setShowModal(true);
    
    try {
      // For patent filings, use the data we already have with fullFilingData
      if (patent.filingSource === 'patent_filings') {
        console.log('📋 Displaying patent filing details:', patent);
        setSelectedPatent(patent);
      } else {
        // For regular patents, fetch from API
        const patentId = patent.ipRightIdentifier || patent.id;
        const response = await fetch(`http://localhost:8080/api/patents/${patentId}`);
        if (response.ok) {
          const fullPatent = await response.json();
          setSelectedPatent(fullPatent);
        } else {
          console.warn('API failed, using existing patent data');
          setSelectedPatent(patent);
        }
      }
    } catch (error) {
      console.error('Error fetching patent details:', error);
      setSelectedPatent(patent);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header with Toggle Buttons */}
      <div className="bg-white rounded-2xl p-4 shadow mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          
          {/* Search Mode Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Search Mode:</span>
            <button
              onClick={() => {
                setSearchMode('api');
                localStorage.setItem('searchMode', 'api');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                searchMode === 'api'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Globe size={16} />
              <span className="font-medium">API Search</span>
            </button>
            <button
              onClick={() => {
                setSearchMode('local');
                localStorage.setItem('searchMode', 'local');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                searchMode === 'local'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Database size={16} />
              <span className="font-medium">Local Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Info and Actions */}
      {query && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Search Results for "{query}"</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded">
                API Searches: <span className="font-semibold">{apiSearchCounter}</span>
              </div>
              <div className="text-sm text-gray-600 bg-green-50 px-3 py-1 rounded">
                Local Searches: <span className="font-semibold">{localSearchCounter}</span>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg"
              >
                <Filter size={16} />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg"
              >
                <History size={16} />
                {showHistory ? 'Hide' : 'View'} History
              </button>
            </div>
          </div>
          
          {/* Results Summary Banner */}
          {!loading && results.length > 0 && (
            <div className={`p-4 rounded-xl border-2 ${
              searchMode === 'local' 
                ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300'
                : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {searchMode === 'local' ? (
                    <Database className="text-purple-600" size={24} />
                  ) : (
                    <Globe className="text-blue-600" size={24} />
                  )}
                  <div>
                    <p className="font-bold text-lg">
                      {searchMode === 'local' 
                        ? `Found ${results.length} patents in Local Database (my_project_db)`
                        : `Found ${results.length} patents from API Search`
                      }
                    </p>
                    <p className="text-sm text-gray-600">
                      {filteredResults.length < results.length 
                        ? `Showing ${filteredResults.length} filtered results`
                        : 'Showing all results'
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Source:</p>
                  <p className="font-semibold text-sm">
                    {searchMode === 'local' ? 'PostgreSQL Database' : 'External API'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* No Results Message */}
          {!loading && results.length === 0 && (
            <div className="p-6 rounded-xl border-2 border-orange-200 bg-orange-50">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-bold text-lg text-orange-800">
                    No patents found {searchMode === 'local' ? 'in local database (my_project_db)' : 'from API'}
                  </p>
                  <p className="text-sm text-orange-600">
                    {searchMode === 'local' 
                      ? 'Try searching with API mode or add patents to your local database first'
                      : 'Try a different search query or check your API connection'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showFilters && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Filter Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search in Results</label>
              <input
                type="text"
                value={filters.searchText}
                onChange={(e) => setFilters({...filters, searchText: e.target.value})}
                placeholder="Search title, ID, or abstract..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              <input
                type="text"
                value={filters.assignee}
                onChange={(e) => setFilters({...filters, assignee: e.target.value})}
                placeholder="e.g., PowerTech Industries"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inventor</label>
              <input
                type="text"
                value={filters.inventor}
                onChange={(e) => setFilters({...filters, inventor: e.target.value})}
                placeholder="e.g., Emily Zhang"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Expired">Expired</option>
                <option value="Abandoned">Abandoned</option>
                <option value="granted">Granted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
              <input
                type="text"
                value={filters.jurisdiction}
                onChange={(e) => setFilters({...filters, jurisdiction: e.target.value})}
                placeholder="e.g., United States"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filing Date From</label>
              <input
                type="date"
                value={filters.filingDateFrom}
                onChange={(e) => setFilters({...filters, filingDateFrom: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filing Date To</label>
              <input
                type="date"
                value={filters.filingDateTo}
                onChange={(e) => setFilters({...filters, filingDateTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Reset Filters
            </button>
            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredResults.length} of {results.length} results
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Search History</h2>
          {searchHistory.length > 0 ? (
            <div className="space-y-2">
              {searchHistory.map((item, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Query: {item.query}</p>
                      <p className="text-sm text-gray-600">Date: {new Date(item.timestamp).toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Results: {item.results.length} found</p>
                    </div>
                    <button
                      onClick={() => {
                        setResults(item.results);
                        setShowHistory(false);
                      }}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                    >
                      Load Results
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No search history available.</p>
          )}
        </div>
      )}

      {loading && <p className="text-center text-gray-600 py-4">Loading search results...</p>}
      
      {!query && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Enter a search query to get started</p>
          <p className="text-gray-400 text-sm mt-2">Search using the search bar above</p>
        </div>
      )}

      <div>
        {filteredResults.length > 0 ? (
          <>
          <div className="grid gap-6">
            {filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((patent, index) => {
              const patentId = patent.id || patent.ipRightIdentifier || index;
              
              return (
                <div 
                  key={patentId} 
                  className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] overflow-hidden"
                >
                  {/* Colored Top Border */}
                  <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                  
                  <div className="p-6">
                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2 leading-tight">
                          {patent.title || 'No Title'}
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {patent.id && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              {patent.id}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span className={`px-4 py-1.5 text-white text-sm rounded-full font-semibold shadow-md ${
                          patent.type === 'Patent Filing'
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}>
                          {patent.type || 'Patent'}
                        </span>
                        {patent.status && (
                          <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                            patent.status === 'Active' 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : patent.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                              : patent.status.toLowerCase() === 'granted'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : patent.status.toLowerCase() === 'rejected'
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}>
                            {patent.status}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Main Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      {patent.assetNumber && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Asset Number</span>
                          <span className="text-sm text-gray-800 font-semibold">{patent.assetNumber}</span>
                        </div>
                      )}
                      {patent.assignee && patent.assignee !== 'N/A' && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Assignee</span>
                          <span className="text-sm text-gray-800 font-semibold">{patent.assignee}</span>
                        </div>
                      )}
                      {patent.inventor && patent.inventor !== 'N/A' && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Inventor</span>
                          <span className="text-sm text-gray-800 font-semibold">{patent.inventor}</span>
                        </div>
                      )}
                      {patent.jurisdiction && patent.jurisdiction !== 'N/A' && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Jurisdiction</span>
                          <span className="text-sm text-gray-800 font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {patent.jurisdiction}
                          </span>
                        </div>
                      )}
                      {patent.filingDate && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Filing Date</span>
                          <span className="text-sm text-gray-800 font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {patent.filingDate}
                          </span>
                        </div>
                      )}
                      {patent.apiSource && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Source</span>
                          <span className="text-sm text-gray-800 font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                            {patent.apiSource}
                          </span>
                        </div>
                      )}
                      {/* Patent Filing Specific Fields */}
                      {patent.filingSource === 'patent_filings' && patent.location && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Location</span>
                          <span className="text-sm text-gray-800 font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {patent.location}
                          </span>
                        </div>
                      )}
                      {patent.filingSource === 'patent_filings' && patent.grantedBy && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Granted By</span>
                          <span className="text-sm text-gray-800 font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {patent.grantedBy}
                          </span>
                        </div>
                      )}
                      {patent.filingSource === 'patent_filings' && patent.rejectedBy && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Rejected By</span>
                          <span className="text-sm text-gray-800 font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {patent.rejectedBy}
                          </span>
                        </div>
                      )}
                      {patent.filingSource === 'patent_filings' && patent.applicantEmail && (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Applicant Email</span>
                          <span className="text-sm text-gray-800 font-semibold flex items-center gap-1">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {patent.applicantEmail}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Section */}
                    <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
                      <button 
                        onClick={() => handleViewDetails(patent)}
                        className="group relative px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-md hover:shadow-xl flex items-center gap-2"
                      >
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Full Details
                      </button>
                      {patent.lastUpdated && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Updated: {new Date(patent.lastUpdated).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {filteredResults.length > 0 && (
            <div className="mt-8 flex flex-col items-center gap-4">
              {/* Pagination Buttons */}
              <div className="flex items-center justify-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:shadow-md disabled:hover:bg-white"
                >
                  ← Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-2">
                  {[...Array(Math.ceil(filteredResults.length / itemsPerPage))].map((_, index) => {
                    const pageNumber = index + 1;
                    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
                    
                    // Show first page, last page, current page, and pages around current
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => {
                            setCurrentPage(pageNumber);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
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
                  onClick={() => {
                    setCurrentPage(prev => Math.min(Math.ceil(filteredResults.length / itemsPerPage), prev + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === Math.ceil(filteredResults.length / itemsPerPage)}
                  className="px-4 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:shadow-md disabled:hover:bg-white"
                >
                  Next →
                </button>
              </div>

              {/* Results Info */}
              <div className="text-center text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredResults.length)} of {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          </>
        ) : (
          !loading && query && <p className="text-center text-gray-500 py-8">No results found for "{query}"</p>
        )}
      </div>

      {/* Full Details Modal Popup */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    {selectedPatent?.title || 'Patent Details'}
                  </h2>
                  <p className="text-blue-100 text-sm">
                    {selectedPatent?.id || selectedPatent?.ipRightIdentifier || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {detailsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading complete details...</p>
                </div>
              ) : selectedPatent && (
                <>
                  {/* Key Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {selectedPatent.type && (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Type</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.type}</p>
                      </div>
                    )}
                    {selectedPatent.assetNumber && (
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">Asset Number</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.assetNumber}</p>
                      </div>
                    )}
                    {selectedPatent.assignee && selectedPatent.assignee !== 'N/A' && (
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                        <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Assignee</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.assignee}</p>
                      </div>
                    )}
                    {selectedPatent.inventor && selectedPatent.inventor !== 'N/A' && (
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">Inventor</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.inventor}</p>
                      </div>
                    )}
                    {selectedPatent.jurisdiction && selectedPatent.jurisdiction !== 'N/A' && (
                      <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-xl border border-pink-200">
                        <p className="text-xs font-bold text-pink-600 uppercase tracking-wide mb-1">Jurisdiction</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.jurisdiction}</p>
                      </div>
                    )}
                    {selectedPatent.filingDate && (
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">Filing Date</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.filingDate}</p>
                      </div>
                    )}
                    {selectedPatent.status && (
                      <div className={`p-4 rounded-xl border-2 ${
                        selectedPatent.status === 'Active' 
                          ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300' 
                          : selectedPatent.status === 'Pending'
                          ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300'
                          : selectedPatent.status.toLowerCase() === 'granted'
                          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300'
                          : selectedPatent.status.toLowerCase() === 'rejected'
                          ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
                      }`}>
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                          selectedPatent.status === 'Active' ? 'bg-green-200 text-green-800' : 
                          selectedPatent.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' :
                          selectedPatent.status.toLowerCase() === 'granted' ? 'bg-emerald-200 text-emerald-800' :
                          selectedPatent.status.toLowerCase() === 'rejected' ? 'bg-red-200 text-red-800' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {selectedPatent.status}
                        </span>
                      </div>
                    )}
                    {selectedPatent.apiSource && (
                      <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border border-teal-200">
                        <p className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-1">Source</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.apiSource}</p>
                      </div>
                    )}
                    {/* Patent Filing Specific Fields in Modal */}
                    {selectedPatent.filingSource === 'patent_filings' && selectedPatent.location && (
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">Location</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.location}</p>
                      </div>
                    )}
                    {selectedPatent.filingSource === 'patent_filings' && selectedPatent.grantedBy && (
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Granted By</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.grantedBy}</p>
                      </div>
                    )}
                    {selectedPatent.filingSource === 'patent_filings' && selectedPatent.rejectedBy && (
                      <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">Rejected By</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.rejectedBy}</p>
                      </div>
                    )}
                    {selectedPatent.filingSource === 'patent_filings' && selectedPatent.applicantEmail && (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Applicant Email</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.applicantEmail}</p>
                      </div>
                    )}
                    {selectedPatent.filingSource === 'patent_filings' && selectedPatent.applicantPhone && (
                      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl border border-cyan-200">
                        <p className="text-xs font-bold text-cyan-600 uppercase tracking-wide mb-1">Applicant Phone</p>
                        <p className="text-sm text-gray-800 font-semibold">{selectedPatent.applicantPhone}</p>
                      </div>
                    )}
                  </div>

                  {/* Complete Patent Filing Details */}
                  {selectedPatent.filingSource === 'patent_filings' && selectedPatent.fullFilingData && (
                    <div className="mb-6 bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-xl shadow-lg border border-slate-200">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Complete Filing Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(selectedPatent.fullFilingData).map(([key, value]) => {
                          if (value !== null && value !== undefined && value !== '' && key !== 'id') {
                            const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                            return (
                              <div key={key} className="bg-white p-3 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">{displayKey}</p>
                                <p className="text-sm text-gray-800 font-medium break-words">
                                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                                   typeof value === 'object' ? JSON.stringify(value) : 
                                   String(value)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Abstract Section */}
                  {selectedPatent.abstractText && selectedPatent.abstractText !== 'N/A' && (
                    <div className="mb-6 bg-white p-5 rounded-xl shadow-md border-l-4 border-blue-500">
                      <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Abstract
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedPatent.abstractText}</p>
                    </div>
                  )}

                  {/* Classification Section */}
                  {selectedPatent.classInfo && selectedPatent.classInfo !== 'N/A' && (
                    <div className="mb-6 bg-white p-5 rounded-xl shadow-md border-l-4 border-purple-500">
                      <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Classification (CPC)
                      </h3>
                      <p className="text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded">{selectedPatent.classInfo}</p>
                    </div>
                  )}

                  {/* Additional Details Section */}
                  {selectedPatent.details && selectedPatent.details !== 'N/A' && (
                    <div className="mb-6 bg-white p-5 rounded-xl shadow-md border-l-4 border-green-500">
                      <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Additional Information
                      </h3>
                      <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                        {selectedPatent.details.split(';').map((detail, idx) => (
                          detail.trim() && (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{detail.trim()}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 flex-wrap mb-4">
                    <button
                      onClick={() => handleShareWhatsApp(selectedPatent)}
                      className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-lg hover:shadow-xl"
                    >
                      <Share2 size={18} />
                      Share on WhatsApp
                    </button>
                    <button
                      onClick={() => handleCopyToClipboard(selectedPatent)}
                      className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl"
                    >
                      <Copy size={18} />
                      {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                    <button
                      onClick={() => handleDownloadPatent(selectedPatent)}
                      className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl"
                    >
                      <Download size={18} />
                      Download Patent
                    </button>
                  </div>

                  {/* Footer Info */}
                  {selectedPatent.lastUpdated && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Last Updated: {new Date(selectedPatent.lastUpdated).toLocaleString()}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer with Close Button */}
            <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <X size={20} />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;