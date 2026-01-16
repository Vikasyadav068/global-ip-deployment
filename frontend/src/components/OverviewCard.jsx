import React from 'react';

const OverviewCard = ({ title, value, subtitle, icon: Icon, iconBg, iconColor }) => {
  return (
    <div className="bg-white/90 rounded-2xl p-6 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-gray-600 font-semibold">{title}</h3>
        <div className={`p-3 ${iconBg} rounded-xl`}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
      <div className="mb-2">
        <span className="text-4xl font-bold">{value}</span>
      </div>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
};

export default OverviewCard;
