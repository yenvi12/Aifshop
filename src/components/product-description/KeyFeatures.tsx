"use client";

import {
  MdCheckCircle,
  MdStar,
  MdLocalShipping,
  MdVerified,
  MdSecurity,
  MdFavorite,
} from "react-icons/md";
import DescriptionCard from "./shared/DescriptionCard";

interface KeyFeaturesProps {
  features?: string[];
  className?: string;
}

// Icon mapping với rotation để tránh lặp lại
const FEATURE_ICONS = [
  MdCheckCircle,
  MdStar,
  MdLocalShipping,
  MdVerified,
  MdSecurity,
  MdFavorite,
];

export default function KeyFeatures({
  features,
  className = "",
}: KeyFeaturesProps) {
  if (!features || features.length === 0) {
    return null;
  }

  return (
    <section className={`space-y-6 ${className}`}>
      <h2 className="text-2xl md:text-3xl font-bold text-brand-dark mb-6">
        Tính năng nổi bật
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {features.map((feature, index) => {
          const IconComponent =
            FEATURE_ICONS[index % FEATURE_ICONS.length];
          const iconSize = 24;

          return (
            <DescriptionCard
              key={index}
              icon={<IconComponent size={iconSize} />}
              title={feature}
            />
          );
        })}
      </div>
    </section>
  );
}

