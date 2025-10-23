import React from 'react';

interface HeaderRendererProps {
  level: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}

export default function HeaderRenderer({ 
  level, 
  children, 
  className = '' 
}: HeaderRendererProps) {
  const baseClasses = "font-semibold text-brand-dark mb-2";
  
  const levelClasses = {
    1: "text-lg font-bold",
    2: "text-base font-semibold", 
    3: "text-sm font-medium"
  };

  const combinedClasses = `${baseClasses} ${levelClasses[level]} ${className}`.trim();

  switch (level) {
    case 1:
      return <h1 className={combinedClasses}>{children}</h1>;
    case 2:
      return <h2 className={combinedClasses}>{children}</h2>;
    case 3:
      return <h3 className={combinedClasses}>{children}</h3>;
    default:
      return <h3 className={combinedClasses}>{children}</h3>;
  }
}