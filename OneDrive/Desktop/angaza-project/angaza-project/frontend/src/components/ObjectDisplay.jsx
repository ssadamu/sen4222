import React from 'react';

const ObjectDisplay = ({ data, title, className }) => {
  // Check if data is an object
  const isObject = data && typeof data === 'object' && !Array.isArray(data);
  
  if (!isObject) {
    return <div>{data}</div>;
  }

  return (
    <div className={`bg-gray-50 rounded-md p-4 border border-gray-200 ${className || ''}`}>
      {title && <h3 className="text-lg font-medium mb-2">{title}</h3>}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">{key}</span>
            <span className="text-base">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ObjectDisplay;