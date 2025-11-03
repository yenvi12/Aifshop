"use client";

import {
  MdCleaningServices,
  MdStorage,
  MdWarning,
  MdCheckCircle,
  MdInfo,
} from "react-icons/md";
import DescriptionAccordion from "./shared/DescriptionAccordion";

interface CareInstructionsProps {
  careInstructions?: Array<{
    title: string;
    content: string;
    icon?: string;
  }>;
  className?: string;
}

// Icon mapping
const CARE_ICONS: Record<string, React.ReactNode> = {
  cleaning: <MdCleaningServices className="w-6 h-6" />,
  storage: <MdStorage className="w-6 h-6" />,
  warning: <MdWarning className="w-6 h-6" />,
  check: <MdCheckCircle className="w-6 h-6" />,
  info: <MdInfo className="w-6 h-6" />,
  default: <MdInfo className="w-6 h-6" />,
};

export default function CareInstructions({
  careInstructions,
  className = "",
}: CareInstructionsProps) {
  if (!careInstructions || careInstructions.length === 0) {
    return null;
  }

  return (
    <section className={`space-y-4 ${className}`}>
      <h2 className="text-2xl md:text-3xl font-bold text-brand-dark mb-6">
        Hướng dẫn bảo quản
      </h2>

      <div className="space-y-3">
        {careInstructions.map((instruction, index) => {
          const iconKey = instruction.icon?.toLowerCase() || "default";
          const icon =
            CARE_ICONS[iconKey] ||
            CARE_ICONS[instruction.icon || "default"] ||
            CARE_ICONS.default;

          return (
            <DescriptionAccordion
              key={index}
              title={instruction.title}
              icon={icon}
              defaultOpen={index === 0}
            >
              <div className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                {instruction.content}
              </div>
            </DescriptionAccordion>
          );
        })}
      </div>
    </section>
  );
}

