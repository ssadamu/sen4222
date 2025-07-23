export const Card = ({ children }) => (
    <div className="border rounded-xl shadow-md bg-white">{children}</div>
  );
  
  export const CardContent = ({ children, className }) => (
    <div className={className}>{children}</div>
  );
  