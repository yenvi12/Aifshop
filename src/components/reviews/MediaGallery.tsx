"use client";

import { useState } from "react";
import Image from "next/image";
import { MdPhoto, MdVideocam, MdClose, MdPlayArrow } from "react-icons/md";

type MediaGalleryProps = {
  images: string[];
  videos: string[];
  maxVisible?: number;
};

export default function MediaGallery({
  images,
  videos,
  maxVisible = 4
}: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<{ type: "image" | "video"; src: string } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allMedia = [
    ...images.map((img, idx) => ({ type: "image" as const, src: img, index: idx })),
    ...videos.map((vid, idx) => ({ type: "video" as const, src: vid, index: idx }))
  ];

  const visibleMedia = allMedia.slice(0, maxVisible);
  const remainingCount = allMedia.length - maxVisible;

  const openLightbox = (media: { type: "image" | "video"; src: string }, index: number) => {
    setSelectedMedia({ type: media.type, src: media.src });
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
  };

  const navigateMedia = (direction: "prev" | "next") => {
    if (!selectedMedia) return;

    const currentIndex = allMedia.findIndex(
      (m) => m.src === selectedMedia.src && m.type === selectedMedia.type
    );

    if (direction === "next") {
      const nextIndex = (currentIndex + 1) % allMedia.length;
      const nextMedia = allMedia[nextIndex];
      setSelectedMedia({ type: nextMedia.type, src: nextMedia.src });
      setSelectedIndex(nextIndex);
    } else {
      const prevIndex = currentIndex === 0 ? allMedia.length - 1 : currentIndex - 1;
      const prevMedia = allMedia[prevIndex];
      setSelectedMedia({ type: prevMedia.type, src: prevMedia.src });
      setSelectedIndex(prevIndex);
    }
  };

  if (allMedia.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
        {visibleMedia.map((media, index) => (
          <div
            key={`${media.type}-${media.index}`}
            className="media-gallery-item aspect-square rounded-xl overflow-hidden bg-gray-100 relative group"
            onClick={() => openLightbox({ type: media.type, src: media.src }, index)}
          >
            {media.type === "image" ? (
              <Image
                src={media.src}
                alt={`Review image ${media.index + 1}`}
                width={200}
                height={200}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={media.src}
                className="w-full h-full object-cover"
                muted
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => e.currentTarget.pause()}
              />
            )}

            {/* Media Type Badge */}
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg flex items-center gap-1">
              {media.type === "image" ? (
                <MdPhoto className="w-3 h-3" />
              ) : (
                <MdVideocam className="w-3 h-3" />
              )}
            </div>

            {/* Play Icon for Videos */}
            {media.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors duration-200">
                <MdPlayArrow className="w-8 h-8 text-white opacity-80 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            )}
          </div>
        ))}

        {/* Show More Overlay */}
        {remainingCount > 0 && (
          <div
            className="media-gallery-item aspect-square rounded-xl overflow-hidden bg-gray-200 cursor-pointer flex items-center justify-center relative group"
            onClick={() => openLightbox(allMedia[maxVisible] as { type: "image" | "video"; src: string }, maxVisible)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#5A6794]/80 to-[#8794C0]/80 backdrop-blur-sm group-hover:from-[#5A6794] group-hover:to-[#8794C0] transition-all duration-300" />
            <div className="relative z-10 text-center">
              <div className="text-2xl font-bold text-white mb-1">
                +{remainingCount}
              </div>
              <div className="text-sm text-white/90">
                {remainingCount === 1 ? "mục khác" : "mục khác"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 media-lightbox flex items-center justify-center p-4 bg-black/90"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors duration-200"
            aria-label="Close"
          >
            <MdClose className="w-6 h-6" />
          </button>

          {/* Navigation Buttons */}
          {allMedia.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateMedia("prev");
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white bg-black/50 hover:bg-black/70 rounded-full p-3 transition-colors duration-200"
                aria-label="Previous"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateMedia("next");
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white bg-black/50 hover:bg-black/70 rounded-full p-3 transition-colors duration-200"
                aria-label="Next"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Media Content */}
          <div
            className="relative max-w-7xl max-h-full w-full media-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMedia.type === "image" ? (
              <Image
                src={selectedMedia.src}
                alt="Review media"
                width={1200}
                height={1200}
                className="max-w-full max-h-[90vh] object-contain mx-auto rounded-lg"
              />
            ) : (
              <video
                src={selectedMedia.src}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] mx-auto rounded-lg"
              />
            )}

            {/* Counter */}
            {allMedia.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                {selectedIndex + 1} / {allMedia.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

