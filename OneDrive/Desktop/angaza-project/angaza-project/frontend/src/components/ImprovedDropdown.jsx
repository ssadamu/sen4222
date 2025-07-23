import React from 'react';

const ImprovedDropdown = ({ label, options, value, onChange, className }) => {
  // Format object options for display
  const formatOptions = (options) => {
    // If options is an object with key-value pairs
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      return Object.entries(options).map(([key, value]) => ({
        value: key,
        label: value
      }));
    }
    // If already in array format
    return options;
  };

  const formattedOptions = formatOptions(options);

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select an option</option>
        {formattedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ImprovedDropdown;