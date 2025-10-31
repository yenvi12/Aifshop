"use client";

interface PricePreset {
  label: string;
  value: [number, number];
  description?: string;
}

interface PricePresetsProps {
  onPresetSelect: (range: [number, number]) => void;
  className?: string;
}

const PRICE_PRESETS: PricePreset[] = [
  {
    label: "Dưới 100k",
    value: [0, 100000],
    description: "Giá rẻ nhất"
  },
  {
    label: "100k - 500k",
    value: [100000, 500000],
    description: "Giá phổ thông"
  },
  {
    label: "500k - 1M",
    value: [500000, 1000000],
    description: "Giá cao cấp"
  },
  {
    label: "Trên 1M",
    value: [1000000, 10000000],
    description: "Giá cao nhất"
  },
  {
    label: "Tất cả",
    value: [0, 10000000],
    description: "Không giới hạn"
  }
];

export default function PricePresets({ onPresetSelect, className = "" }: PricePresetsProps) {
  const formatVND = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-xs font-semibold text-brand-secondary uppercase tracking-wide">
        Khoảng giá phổ biến
      </h4>
      
      <div className="grid grid-cols-2 gap-2">
        {PRICE_PRESETS.map((preset, index) => (
          <button
            key={index}
            onClick={() => onPresetSelect(preset.value)}
            className="
              group relative p-3 text-left rounded-xl border border-brand-light
              hover:border-brand-primary hover:bg-brand-primary/5
              transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-brand-primary/20
              bg-white hover:shadow-sm
            "
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-brand-dark group-hover:text-brand-primary transition-colors">
                  {preset.label}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-brand-secondary">
                    {formatVND(preset.value[0])}
                  </span>
                  <span className="text-xs text-brand-secondary">-</span>
                  <span className="text-xs text-brand-secondary">
                    {formatVND(preset.value[1])}
                  </span>
                </div>
              </div>
              
              {preset.description && (
                <p className="text-xs text-brand-secondary group-hover:text-brand-secondary/80 transition-colors">
                  {preset.description}
                </p>
              )}
            </div>
            
            {/* Hover effect indicator */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </button>
        ))}
      </div>
    </div>
  );
}