export interface ProductDescriptionProps {
  overview?: string; // Mô tả tổng quan ngắn gọn (hiển thị ở Overview section)
  description?: string; // Mô tả chi tiết đầy đủ (hiển thị ở Detailed Description section)
  features?: string[];
  specifications?: Record<string, string>;
  careInstructions?: Array<{
    title: string;
    content: string;
    icon?: string;
  }>;
  media?: {
    videos?: string[];
    images?: string[];
  };
}

export interface DescriptionAccordionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

export interface ReadMoreButtonProps {
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

