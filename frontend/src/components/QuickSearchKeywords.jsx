import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

const QuickSearchKeywords = ({ onSearch, setSearchMode }) => {
  // Maximum 10 keywords
  const keywords = [
    { text: 'Artificial Intelligence', icon: '🤖' },
    { text: 'Biotechnology', icon: '🧬' },
    { text: 'Renewable Energy', icon: '⚡' },
    { text: 'Pharmaceuticals', icon: '💊' },
    { text: 'Nanotechnology', icon: '🔬' },
    { text: 'Machine Learning', icon: '🧠' },
    { text: 'Quantum Computing', icon: '⚛️' },
    { text: 'Medical Devices', icon: '🏥' },
    { text: 'Robotics', icon: '🦾' },
    { text: 'Blockchain', icon: '⛓️' }
  ];

  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const [showComponent, setShowComponent] = useState(true);

  useEffect(() => {
    const checkOverflow = () => {
      if (!containerRef.current || !wrapperRef.current) return;

      const container = containerRef.current;
      const wrapper = wrapperRef.current;
      const keywordButtons = container.querySelectorAll('.keyword-button');
      
      if (keywordButtons.length === 0) {
        setShowComponent(false);
        return;
      }

      // Check if container is wider than wrapper (overflow/wrapping occurring)
      const containerHeight = container.scrollHeight;
      const wrapperHeight = wrapper.clientHeight;
      const hasOverflow = containerHeight > wrapperHeight + 10; // 10px tolerance

      // Count visible keywords by checking container width
      const containerWidth = wrapper.clientWidth;
      let visibleCount = 0;
      let totalWidth = 0;
      const gap = 8; // 2 (gap-2) * 4px

      keywordButtons.forEach((button) => {
        const buttonWidth = button.offsetWidth;
        if (totalWidth + buttonWidth <= containerWidth) {
          visibleCount++;
          totalWidth += buttonWidth + gap;
        }
      });

      console.log('Visible keywords:', visibleCount, 'Total:', keywordButtons.length, 'Has overflow:', hasOverflow);

      // Hide entire component if less than 3 visible keywords
      if (visibleCount < 3) {
        console.log('Hiding component - less than 3 keywords visible');
        setShowComponent(false);
      } else {
        setShowComponent(true);
      }
    };

    // Check on mount and resize
    const timer1 = setTimeout(checkOverflow, 50);
    const timer2 = setTimeout(checkOverflow, 200);
    const timer3 = setTimeout(checkOverflow, 500);
    
    window.addEventListener('resize', checkOverflow);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', checkOverflow);
    };
  }, []);

  const handleKeywordClick = (keyword) => {
    // Set to local database mode
    setSearchMode('local');
    localStorage.setItem('searchMode', 'local');
    
    // Trigger search with the keyword
    onSearch(keyword);
  };

  // Don't render if less than 3 keywords would be visible
  if (!showComponent) {
    return null;
  }

  return (
    <div ref={wrapperRef} className="w-full flex items-center gap-3 mb-3 overflow-hidden">
      {/* Icon and Label - Always visible */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg">
          <Search className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-gray-900 whitespace-nowrap">Quick Search:</span>
      </div>
      
      {/* Keywords in single row - no wrapping */}
      <div ref={containerRef} className="flex items-center gap-2 overflow-hidden flex-nowrap">
        {keywords.map((keyword, index) => (
          <button
            key={index}
            onClick={() => handleKeywordClick(keyword.text)}
            className="keyword-button group flex items-center gap-1.5 flex-shrink-0 hover:scale-110 transition-transform duration-200"
          >
            <span className="text-lg">{keyword.icon}</span>
            <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 whitespace-nowrap">
              {keyword.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickSearchKeywords;
