"use client";

import { useState } from "react";
import DualRangeSlider from "./DualRangeSlider";
import PriceInput from "./PriceInput";
import { MdRefresh, MdCheck } from "react-icons/md";

interface PriceRangeSectionProps {
  priceRange: [number, number];
  onPriceChange: (min: number, max: number) => void;
  onReset: () => void;
  className?: string;
}

export default function PriceRangeSection({
  priceRange,
  onPriceChange,
  onReset,
  className = ""
}: PriceRangeSectionProps) {
  const [isChanged, setIsChanged] = useState(false);
  const [tempRange, setTempRange] = useState<[number, number]>(priceRange);

  const handleSliderChange = (values: [number, number]) => {
    setTempRange(values);
    setIsChanged(true);
  };

  const handleInputChange = (min: number, max: number) => {
    setTempRange([min, max]);
    setIsChanged(true);
  };

  const handleApply = () => {
    onPriceChange(tempRange[0], tempRange[1]);
    setIsChanged(false);
  };

  const handleReset = () => {
    const resetRange: [number, number] = [0, 100000000];
    setTempRange(resetRange);
    onPriceChange(resetRange[0], resetRange[1]);
    setIsChanged(false);
    onReset();
  };

  return (
    <div className={`price-range-section bg-white rounded-2xl border border-brand-light/50 p-5 space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-semibold text-brand-dark">Khoảng giá</h3>
          <p className="text-xs text-brand-secondary mt-1">Chọn khoảng giá muốn lọc</p>
        </div>
      </div>

      {/* Input + Slider */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-3 items-end">
          <PriceInput
            label="Từ"
            value={tempRange[0]}
            onChange={(value) => handleInputChange(value, tempRange[1])}
            placeholder="0"
            min={0}
            max={tempRange[1]}
            className="flex-1"
          />
          <span className="text-lg text-brand-secondary px-1">-</span>
          <PriceInput
            label="Đến"
            value={tempRange[1]}
            onChange={(value) => handleInputChange(tempRange[0], value)}
            placeholder="100,000,000"
            min={tempRange[0]}
            max={100000000}
            className="flex-1"
          />
        </div>

        {/* Slider */}
        <div className="pt-4">
          <DualRangeSlider
            min={tempRange[0]}
            max={tempRange[1]}
            onChange={handleSliderChange}
            minLimit={0}
            maxLimit={100000000}
            step={500000}
            className="w-full"
          />
          <div className="flex justify-between mt-2 px-1">
            <span className="font-medium text-sm text-brand-primary">{new Intl.NumberFormat('vi-VN').format(tempRange[0])}₫</span>
            <span className="font-medium text-sm text-brand-primary">{new Intl.NumberFormat('vi-VN').format(tempRange[1])}₫</span>
          </div>
        </div>
      </div>

      {/* Preset Row */}
      <div className="flex gap-2 flex-wrap justify-center border-b border-brand-light/30 pb-3">
        {[{ label: "500k", value: 500000 }, { label: "1M", value: 1000000 }, { label: "5M", value: 5000000 }, { label: "10M", value: 10000000 }, { label: "50M", value: 50000000 }, { label: "100M", value: 100000000 }].map((preset) => (
          <button key={preset.label} onClick={() => setTempRange([0, preset.value])} className="px-2 py-0.5 text-xs bg-brand-light/60 hover:bg-brand-light rounded text-brand-secondary hover:text-brand-dark border border-brand-light/50 transition-colors">
            {preset.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={handleApply}
          className="flex items-center gap-1 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
        >
          <MdCheck className="w-4 h-4" />
          Áp dụng
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-4 py-2 border border-brand-light text-brand-secondary text-sm font-medium rounded-lg hover:bg-brand-light/50 transition-colors"
        >
          <MdRefresh className="w-4 h-4" />
          Xóa
        </button>
      </div>
    </div>
  );
}