"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import DescriptionOverview from "./DescriptionOverview";
import KeyFeatures from "./KeyFeatures";
import DetailedDescription from "./DetailedDescription";
import SpecificationsTable from "./SpecificationsTable";
import CareInstructions from "./CareInstructions";
import DescriptionMediaGallery from "./DescriptionMediaGallery";
import type { ProductDescriptionProps } from "./types";

export default function ProductDescription({
  overview,
  description,
  features,
  specifications,
  careInstructions,
  media,
}: ProductDescriptionProps) {
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = sectionRefs.current.indexOf(entry.target as HTMLElement);
            if (index !== -1) {
              setVisibleSections((prev) => new Set([...prev, index]));
            }
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      sectionRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  const sections = [
    { 
      component: DescriptionOverview, 
      props: { overview }, 
      condition: !!overview,
      key: 'overview'
    },
    { 
      component: KeyFeatures, 
      props: { features }, 
      condition: !!(features && features.length > 0),
      key: 'features'
    },
    { 
      component: DetailedDescription, 
      props: { description }, 
      condition: !!description,
      key: 'detailed'
    },
    { 
      component: SpecificationsTable, 
      props: { specifications }, 
      condition: !!(specifications && Object.keys(specifications).length > 0),
      key: 'specifications'
    },
    { 
      component: CareInstructions, 
      props: { careInstructions }, 
      condition: !!(careInstructions && careInstructions.length > 0),
      key: 'care'
    },
    { 
      component: DescriptionMediaGallery, 
      props: { media }, 
      condition: !!((media?.videos && media.videos.length > 0) || (media?.images && media.images.length > 0)),
      key: 'media'
    },
  ].filter((section) => section.condition);

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">Chưa có thông tin mô tả cho sản phẩm này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 md:space-y-16 py-8">
      {sections.map((section, index) => {
        const Component = section.component;
        const isVisible = visibleSections.has(index);

        return (
          <motion.section
            key={section.key}
            ref={(el) => {
              if (el) sectionRefs.current[index] = el;
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={
              isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
            }
            transition={{
              duration: 0.6,
              delay: index * 0.1,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="w-full"
          >
            <Component {...section.props} />
          </motion.section>
        );
      })}
    </div>
  );
}

