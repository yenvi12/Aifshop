"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { MdClose, MdPlayCircle } from "react-icons/md";

interface DescriptionMediaGalleryProps {
  media?: {
    videos?: string[];
    images?: string[];
  };
  className?: string;
}

export default function DescriptionMediaGallery({
  media,
  className = "",
}: DescriptionMediaGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const images = media?.images || [];
  const videos = media?.videos || [];

  if ((!images || images.length === 0) && (!videos || videos.length === 0)) {
    return null;
  }

  const handleImageClick = (index: number) => {
    setSelectedImage(index);
  };

  const handleCloseLightbox = () => {
    setSelectedImage(null);
  };

  return (
    <section className={`space-y-6 ${className}`}>
      <h2 className="text-2xl md:text-3xl font-bold text-brand-dark mb-6">
        Hình ảnh & Video
      </h2>

      {/* Videos Section */}
      {videos && videos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-brand-dark mb-4">
            Video sản phẩm
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((video, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 shadow-md"
              >
                <iframe
                  src={video}
                  title={`Video sản phẩm ${index + 1}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Images Section */}
      {images && images.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-brand-dark mb-4">
            Hình ảnh minh họa
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleImageClick(index)}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
                aria-label={`Xem hình ảnh ${index + 1}`}
              >
                <Image
                  src={image}
                  alt={`Hình ảnh minh họa ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-110"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage !== null && images[selectedImage] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseLightbox}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleCloseLightbox}
              className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Đóng"
            >
              <MdClose className="w-6 h-6" />
            </motion.button>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-7xl max-h-[90vh] w-full h-full"
            >
              <Image
                src={images[selectedImage]}
                alt={`Hình ảnh ${selectedImage + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </motion.div>

            {/* Navigation arrows (optional) */}
            {images.length > 1 && (
              <>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(
                      selectedImage > 0
                        ? selectedImage - 1
                        : images.length - 1
                    );
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label="Ảnh trước"
                >
                  ←
                </motion.button>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(
                      selectedImage < images.length - 1
                        ? selectedImage + 1
                        : 0
                    );
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label="Ảnh sau"
                >
                  →
                </motion.button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

