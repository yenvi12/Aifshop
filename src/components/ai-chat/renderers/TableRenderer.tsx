import React from 'react';

interface TableRendererProps {
  headers?: string[];
  rows?: string[][];
  children?: React.ReactNode;
  className?: string;
}

export default function TableRenderer({ 
  headers, 
  rows, 
  children, 
  className = '' 
}: TableRendererProps) {
  const baseClasses = "mb-3 overflow-x-auto";
  const combinedClasses = `${baseClasses} ${className}`.trim();

  // If we have structured data, render our custom table
  if (headers && rows) {
    return (
      <div className={combinedClasses}>
        <table className="min-w-full border-collapse border border-brand-light rounded-lg overflow-hidden">
          <thead className="bg-brand-primary/10">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="border border-brand-light px-3 py-2 text-left text-sm font-semibold text-brand-dark"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-brand-light">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-brand-light/20">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border border-brand-light px-3 py-2 text-sm text-brand-dark"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Fallback to markdown table rendering
  return (
    <div className={combinedClasses}>
      <table className="min-w-full border-collapse border border-brand-light rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  );
}