"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { MdStar, MdPhoto, MdVideocam, MdMoreVert, MdEdit, MdDelete } from "react-icons/md";

type Review = {
  id: string;
  rating: number;
  comment: string;
  images: string[];
  videos: string[];
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
};

type Props = {
  reviews: Review[];
  currentUserId: string | null;
  onEditReview: (review: Review) => void;
  onDeleteReview: (reviewId: string) => void;
  editingReviewId?: string | null;
  deletingReviewId?: string | null;
};

export default function ReviewList({
  reviews,
  currentUserId,
  onEditReview,
  onDeleteReview,
  editingReviewId = null,
  deletingReviewId = null
}: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.dropdown-container')) {
        setShowDropdown(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <MdStar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No reviews yet for this product.</p>
        <p className="text-sm text-gray-400 mt-2">Be the first to review!</p>
      </div>
    );
  }

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return (
    <>
      {/* Review Summary */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Customer Reviews</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <MdStar
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(averageRating)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {averageRating.toFixed(1)}/5 ({reviews.length} reviews)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review) => (
           <div key={review.id} className="border border-gray-200 rounded-lg p-6">
             <div className="flex items-start justify-between mb-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                   {review.user.avatar ? (
                     <Image
                       src={review.user.avatar}
                       alt={review.user.name}
                       width={40}
                       height={40}
                       className="w-full h-full rounded-full object-cover"
                     />
                   ) : (
                     <span className="text-gray-600 font-semibold text-sm">
                       {review.user.name.charAt(0).toUpperCase()}
                     </span>
                   )}
                 </div>
                 <div>
                   <p className="font-semibold text-gray-900">{review.user.name}</p>
                   <div className="flex items-center gap-2 mt-1">
                     <div className="flex items-center gap-1">
                       {Array.from({ length: 5 }).map((_, i) => (
                         <MdStar
                           key={i}
                           className={`w-4 h-4 ${
                             i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                           }`}
                         />
                       ))}
                     </div>
                     <span className="text-sm text-gray-500">{review.createdAt}</span>
                   </div>
                 </div>
               </div>

               {/* Dropdown Menu for Edit/Delete */}
               {review.user.id === currentUserId && (
                 <div className="relative dropdown-container">
                   <button
                     onClick={() => setShowDropdown(showDropdown === review.id ? null : review.id)}
                     className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
                     aria-expanded={showDropdown === review.id}
                     aria-haspopup="menu"
                     aria-label={`Options for review by ${review.user.name}`}
                   >
                     <MdMoreVert className="w-5 h-5" />
                   </button>

                   {showDropdown === review.id && (
                     <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                       <button
                         disabled={editingReviewId === review.id}
                         onClick={() => {
                           setShowDropdown(null);
                           onEditReview(review);
                         }}
                         className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-150"
                       >
                         <MdEdit className="w-4 h-4" />
                         {editingReviewId === review.id ? 'Loading...' : 'Edit'}
                       </button>
                       <button
                         disabled={deletingReviewId === review.id}
                         onClick={() => {
                           setShowDropdown(null);
                           onDeleteReview(review.id);
                         }}
                         className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-150"
                       >
                         <MdDelete className="w-4 h-4" />
                         {deletingReviewId === review.id ? 'Deleting...' : 'Delete'}
                       </button>
                     </div>
                   )}
                 </div>
               )}
             </div>

            <p className="text-gray-700 mb-4">{review.comment}</p>

            {/* Media Gallery */}
            {(review.images.length > 0 || review.videos.length > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                {review.images.map((image, index) => (
                  <div
                    key={`image-${index}`}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition"
                    onClick={() => setSelectedImage(image)}
                  >
                    <Image
                      src={image}
                      alt={`Review image ${index + 1}`}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded">
                      <MdPhoto className="w-3 h-3" />
                    </div>
                  </div>
                ))}
                {review.videos.map((video, index) => (
                  <div
                    key={`video-${index}`}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition relative"
                    onClick={() => setSelectedVideo(video)}
                  >
                    <video
                      src={video}
                      className="w-full h-full object-cover"
                      muted
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded">
                      <MdVideocam className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <Image
              src={selectedImage}
              alt="Review image"
              width={800}
              height={800}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <video
              src={selectedVideo}
              controls
              className="max-w-full max-h-full object-contain"
              autoPlay
            />
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}