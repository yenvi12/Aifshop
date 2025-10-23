import React from 'react';

interface ListRendererProps {
  type: 'ordered' | 'unordered';
  children: React.ReactNode;
  className?: string;
}

export default function ListRenderer({ 
  type, 
  children, 
  className = '' 
}: ListRendererProps) {
  const baseClasses = "mb-3 space-y-1";
  const combinedClasses = `${baseClasses} ${className}`.trim();

  if (type === 'ordered') {
    return (
      <ol className={`${combinedClasses} list-decimal list-inside`}>
        {children}
      </ol>
    );
  }

  return (
    <ul className={`${combinedClasses} list-disc list-inside`}>
      {children}
    </ul>
  );
}