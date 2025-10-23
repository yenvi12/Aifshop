import React, { useState } from 'react';
import { MdArrowForward, MdInfo, MdShoppingCart } from 'react-icons/md';

interface ButtonRendererProps {
  text: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  onClick?: (buttonText: string, variant: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function ButtonRenderer({ 
  text, 
  variant, 
  onClick, 
  className = '',
  disabled = false
}: ButtonRendererProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (onClick && !disabled && !isLoading) {
      setIsLoading(true);
      onClick(text, variant);
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const getButtonStyles = () => {
    const baseStyles = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
      primary: "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm hover:shadow-md",
      secondary: "bg-brand-secondary text-white hover:bg-brand-secondary/90 shadow-sm hover:shadow-md",
      outline: "border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white",
      ghost: "bg-brand-light/60 text-brand-dark hover:bg-brand-light/80"
    };

    return `${baseStyles} ${variants[variant]} ${className}`.trim();
  };

  const getIcon = () => {
    if (isLoading) {
      return (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      );
    }

    const icons = {
      primary: <MdArrowForward className="w-4 h-4" />,
      secondary: <MdShoppingCart className="w-4 h-4" />,
      outline: <MdInfo className="w-4 h-4" />,
      ghost: <MdArrowForward className="w-4 h-4" />
    };

    return icons[variant] || <MdArrowForward className="w-4 h-4" />;
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={getButtonStyles()}
    >
      {getIcon()}
      <span>{text}</span>
    </button>
  );
}