import { useState } from "react";

export const Tabs = ({ children, defaultValue }) => {
  const [value, setValue] = useState(defaultValue);
  const childrenWithProps = React.Children.map(children, (child) => {
    if (child.type.displayName === "TabsList") {
      return React.cloneElement(child, { value, onValueChange: setValue });
    }
    if (child.type.displayName === "TabsContent" && child.props.value === value) {
      return child;
    }
    return null;
  });

  return <div>{childrenWithProps}</div>;
};

export const TabsList = ({ children, value, onValueChange }) => (
  <div className="flex gap-2 flex-wrap">
    {React.Children.map(children, (child) =>
      React.cloneElement(child, { value, onValueChange })
    )}
  </div>
);

export const TabsTrigger = ({ value, children, onValueChange }) => (
  <button
    onClick={() => onValueChange(value)}
    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
  >
    {children}
  </button>
);

export const TabsContent = ({ children }) => <div className="mt-4">{children}</div>;

Tabs.displayName = "Tabs";
TabsList.displayName = "TabsList";
TabsTrigger.displayName = "TabsTrigger";
TabsContent.displayName = "TabsContent";
