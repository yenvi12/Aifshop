import React from 'react';

interface TextRendererProps {
  children: React.ReactNode;
  strong?: boolean;
  italic?: boolean;
  code?: boolean;
  className?: string;
}

export default function TextRenderer({ 
  children, 
  strong = false, 
  italic = false, 
  code = false,
  className = ''
}: TextRendererProps) {
  const baseClasses = "text-sm leading-relaxed text-brand-dark";
  
  const styleClasses = [
    strong && "font-semibold",
    italic && "italic",
    code && "font-mono text-xs bg-brand-light/40 px-1 py-0.5 rounded border border-brand-light/60"
  ].filter(Boolean).join(' ');

  const combinedClasses = `${baseClasses} ${styleClasses} ${className}`.trim();

  if (code) {
    return <code className={combinedClasses}>{children}</code>;
  }

  return <span className={combinedClasses}>{children}</span>;
}