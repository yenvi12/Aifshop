"use client";

import { useState, useEffect, useRef } from "react";

interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  label?: string;
  min?: number;
  max?: number;
  className?: string;
  error?: string;
}

export default function PriceInput({
  value,
  onChange,
  placeholder = "0",
  label,
  min = 0,
  max = 100000000,
  className = "",
  error
}: PriceInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format number to VND display format
  const formatVND = (num: number): string => {
    if (num === 0) return "";
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Parse VND format to number
  const parseVND = (str: string): number => {
    // Remove all non-digit characters
    const numericString = str.replace(/[^\d]/g, '');
    return numericString ? parseInt(numericString, 10) : 0;
  };

  // Update display value when external value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatVND(value));
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    if (isFocused) {
      // While focused, show raw number without formatting
      setDisplayValue(rawValue);
      
      // Parse and validate
      const numericValue = parseVND(rawValue);
      const clampedValue = Math.max(min, Math.min(numericValue, max));
      onChange(clampedValue);
    } else {
      // While not focused, show formatted value
      const numericValue = parseVND(rawValue);
      setDisplayValue(formatVND(numericValue));
      onChange(Math.max(min, Math.min(numericValue, max)));
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number when focused
    setDisplayValue(value.toString());
    // Select all text for easy editing
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.select();
      }
    }, 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Show formatted value when blurred
    setDisplayValue(formatVND(value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation keys
    const allowedKeys = [
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Delete', 'Backspace', 'Tab', 'Home', 'End'
    ];
    
    if (allowedKeys.includes(e.key) || (e.ctrlKey || e.metaKey)) {
      return;
    }

    // Only allow numbers
    if (!/^\d$/.test(e.key) && e.key !== '.') {
      e.preventDefault();
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs text-brand-secondary font-medium">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            w-full px-3 py-2.5 border rounded-lg text-sm font-medium
            transition-all duration-200 ease-in-out
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
              : 'border-brand-light focus:border-brand-primary focus:ring-brand-primary/20'
            }
            focus:outline-none focus:ring-2
            placeholder-brand-secondary/60
            hover:border-brand-primary/60
            ${isFocused ? 'bg-brand-light/20' : 'bg-white'}
          `}
          inputMode="numeric"
          pattern="[0-9]*"
        />
        
        {/* Currency symbol */}
        {!isFocused && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-secondary text-sm font-medium pointer-events-none">
            ₫
          </span>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
      
      {/* Quick preset buttons */}
      <div className="flex gap-1 mt-2 flex-wrap">
        {[
          { label: "500k", value: 500000 },
          { label: "1M", value: 1000000 },
          { label: "5M", value: 5000000 },
          { label: "10M", value: 10000000 },
          { label: "50M", value: 50000000 },
          { label: "100M", value: 100000000 }
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.value)}
            className="px-2 py-1 text-xs bg-brand-light/60 hover:bg-brand-light
                     text-brand-secondary hover:text-brand-dark
                     rounded transition-colors border border-brand-light/50"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}