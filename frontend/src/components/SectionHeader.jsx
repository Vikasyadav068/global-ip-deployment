import React from 'react';

const SectionHeader = ({ 
  title, 
  description, 
  icon: Icon, 
  iconColor = "text-blue-600",
  gradientFrom = "from-blue-50/50",
  gradientTo = "to-indigo-50/50",
  borderColor = "border-blue-100",
  titleColor = "text-blue-900"
}) => {
  return (
    <div className={`w-full bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl p-6 border ${borderColor} mt-4`}>
      <div className="max-w-4xl">
        <h3 className={`text-2xl font-bold ${titleColor} mb-2 flex items-center gap-2`}>
          {Icon && <Icon className={iconColor} size={28} />}
          {title}
        </h3>
        <p className="text-base text-gray-700 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

export default SectionHeader;
