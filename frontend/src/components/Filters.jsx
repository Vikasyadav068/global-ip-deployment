import React from 'react';
import { Eye, Briefcase, UserCircle, Globe, CheckCircle, Database, FileText } from 'lucide-react';

const Filters = () => {
  const filters = [
    { icon: Eye, label: 'AI Patents', category: 'type' },
    { icon: Briefcase, label: 'PowerTech Industries', category: 'assignee' },
    { icon: UserCircle, label: 'Emily Zhang', category: 'inventor' },
    { icon: Globe, label: 'United States', category: 'jurisdiction' },
    { icon: CheckCircle, label: 'Active Status', category: 'status' },
    { icon: Database, label: 'Local Database', category: 'source' },
    { icon: FileText, label: 'Recent Filings', category: 'date' },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {filters.map((filter, index) => (
        <button
          key={index}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all"
        >
          <filter.icon size={16} className="text-gray-600" />
          <span className="text-sm">{filter.label}</span>
        </button>
      ))}
    </div>
  );
};

export default Filters;
