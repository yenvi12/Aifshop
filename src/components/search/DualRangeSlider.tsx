"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface DualRangeSliderProps {
  min: number;
  max: number;
  onChange: (values: [number, number]) => void;
  minLimit?: number;
  maxLimit?: number;
  step?: number;
  className?: string;
}

export default function DualRangeSlider({
  min,
  max,
  onChange,
  minLimit = 0,
  maxLimit = 100000000,
  step = 100000,
  className = ""
}: DualRangeSliderProps) {
  const [minValue, setMinValue] = useState(min);
  const [maxValue, setMaxValue] = useState(max);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Update values when props change
  useEffect(() => {
    setMinValue(min);
    setMaxValue(max);
  }, [min, max]);

  const getPercentage = useCallback((value: number) => {
    return ((value - minLimit) / (maxLimit - minLimit)) * 100;
  }, [minLimit, maxLimit]);

  const getValueFromPercentage = useCallback((percentage: number) => {
    return Math.round((percentage / 100) * (maxLimit - minLimit) + minLimit);
  }, [minLimit, maxLimit]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    const newMinValue = Math.max(minLimit, Math.min(value, maxValue - step));
    setMinValue(newMinValue);
    onChange([newMinValue, maxValue]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    const newMaxValue = Math.min(maxLimit, Math.max(value, minValue + step));
    setMaxValue(newMaxValue);
    onChange([minValue, newMaxValue]);
  };

  const minPercentage = getPercentage(minValue);
  const maxPercentage = getPercentage(maxValue);

  return (
    <div className={`relative w-full h-8 ${className}`} ref={sliderRef}>
      {/* Track */}
      <div className="absolute top-3.5 w-full h-1.5 bg-brand-light rounded-full">
        <div
          className="absolute top-0 h-full bg-brand-primary rounded-full transition-all duration-150"
          style={{
            left: `${minPercentage}%`,
            width: `${maxPercentage - minPercentage}%`
          }}
        />
      </div>

      {/* Min Range Input */}
      <input
        type="range"
        min={minLimit}
        max={maxLimit}
        step={step}
        value={minValue}
        onChange={handleMinChange}
        className="absolute top-0 w-full h-8 appearance-none bg-transparent cursor-pointer range-slider-thumb"
        style={{
          background: 'transparent'
        }}
      />

      {/* Max Range Input */}
      <input
        type="range"
        min={minLimit}
        max={maxLimit}
        step={step}
        value={maxValue}
        onChange={handleMaxChange}
        className="absolute top-0 w-full h-8 appearance-none bg-transparent cursor-pointer range-slider-thumb"
        style={{
          background: 'transparent'
        }}
      />

      {/* Custom Thumb Styles */}
      <style jsx>{`
        .range-slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid #6366f1;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          transition: all 0.15s ease;
        }

        .range-slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .range-slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid #6366f1;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          transition: all 0.15s ease;
        }

        .range-slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .range-slider-thumb::-webkit-slider-runnable-track {
          height: 8px;
          background: transparent;
        }

        .range-slider-thumb::-moz-range-track {
          height: 8px;
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}