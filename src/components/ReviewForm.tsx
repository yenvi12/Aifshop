"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { MdStar, MdPhoto, MdVideocam, MdDelete, MdClose } from "react-icons/md";

type Review = {
  id?: string;
  rating: number;
  comment: string;
  images: string[];
  videos: string[];
};

type Props = {
  productId: string;
  initialReview?: Review;
  onSubmit: (review: Review) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
};

export default function ReviewForm({ productId, initialReview, onSubmit, onCancel, isLoading = false }: Props) {
  const [rating, setRating] = useState(initialReview?.rating || 0);
  const [comment, setComment] = useState(initialReview?.comment || "");
  const [images, setImages] = useState<string[]>(initialReview?.images || []);
  const [videos, setVideos] = useState<string[]>(initialReview?.videos || []);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (rating < 1 || rating > 5) {
      newErrors.rating = "Please select a rating from 1-5 stars";
    }

    if (!comment.trim()) {
      newErrors.comment = "Please enter your review content";
    } else if (comment.length > 500) {
      newErrors.comment = "Review content must not exceed 500 characters";
    }

    if (images.length > 5) {
      newErrors.images = "Maximum 5 photos allowed";
    }

    if (videos.length > 2) {
      newErrors.videos = "Maximum 2 videos allowed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit({
        id: initialReview?.id,
        rating,
        comment: comment.trim(),
        images,
        videos,
      });

      // Reset form if it's a new review
      if (!initialReview) {
        setRating(0);
        setComment("");
        setImages([]);
        setVideos([]);
        setErrors({});
      }
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setErrors({ ...errors, images: "Only image files are allowed (JPEG, PNG, GIF, WebP)" });
      return;
    }

    // Check total images limit
    if (images.length + files.length > 5) {
      setErrors({ ...errors, images: "Maximum 5 photos per review" });
      return;
    }

    // Check file sizes (10MB limit for images)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setErrors({ ...errors, images: `Images must not exceed 10MB. Please select smaller files.` });
      return;
    }

    try {
      // Get auth token
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setErrors({ ...errors, images: "You need to login to upload photos" });
        return;
      }

      // Upload files to server
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('folder', 'reviews');

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        // Provide user-friendly error messages
        let errorMessage = 'Failed to upload images. Please try again.';
        if (result.error?.includes('File size must be less than')) {
          errorMessage = 'Image file too large. Please select files smaller than 5MB.';
        } else if (result.error?.includes('Only image and video files are allowed')) {
          errorMessage = 'Only valid image files are allowed.';
        } else if (result.error?.includes('Invalid Supabase token')) {
          errorMessage = 'Session expired. Please log in again.';
        }
        setErrors({ ...errors, images: errorMessage });
        return;
      }

      // Add uploaded URLs to images
      setImages([...images, ...result.data.urls]);
      setErrors({ ...errors, images: "" });
    } catch (error) {
      console.error('Image upload error:', error);
      setErrors({ ...errors, images: "An error occurred while uploading photos. Please check your connection and try again." });
    }

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const invalidFiles = files.filter(file => !file.type.startsWith('video/'));
    if (invalidFiles.length > 0) {
      setErrors({ ...errors, videos: "Only video files are allowed (MP4, MOV, AVI, WebM)" });
      return;
    }

    // Check total videos limit
    if (videos.length + files.length > 2) {
      setErrors({ ...errors, videos: "Maximum 2 videos per review" });
      return;
    }

    // Check file sizes (50MB limit for videos)
    const maxSize = 50 * 1024 * 1024; // 50MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setErrors({ ...errors, videos: `Videos must not exceed 50MB. Please select smaller files.` });
      return;
    }

    try {
      // Get auth token
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setErrors({ ...errors, videos: "You need to login to upload videos" });
        return;
      }

      // Upload files to server
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('folder', 'reviews');

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        // Provide user-friendly error messages
        let errorMessage = 'Failed to upload videos. Please try again.';
        if (result.error?.includes('File size must be less than')) {
          errorMessage = 'Video file too large. Please select files smaller than 10MB.';
        } else if (result.error?.includes('Only image and video files are allowed')) {
          errorMessage = 'Only valid video files are allowed.';
        } else if (result.error?.includes('Invalid Supabase token')) {
          errorMessage = 'Session expired. Please log in again.';
        }
        setErrors({ ...errors, videos: errorMessage });
        return;
      }

      // Add uploaded URLs to videos
      setVideos([...videos, ...result.data.urls]);
      setErrors({ ...errors, videos: "" });
    } catch (error) {
      console.error('Video upload error:', error);
      setErrors({ ...errors, videos: "An error occurred while uploading videos. Please check your connection and try again." });
    }

    // Reset input
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          {initialReview ? "Edit Review" : "Write Review"}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <MdClose className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Star Rating
          </label>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i + 1)}
                onMouseEnter={() => setHoveredRating(i + 1)}
                onMouseLeave={() => setHoveredRating(0)}
                className="text-2xl transition"
              >
                <MdStar
                  className={`${
                    i < (hoveredRating || rating)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-600">
              {rating > 0 && `${rating}/5 stars`}
            </span>
          </div>
          {errors.rating && <p className="text-red-500 text-sm mt-1">{errors.rating}</p>}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review Content
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            maxLength={500}
          />
          <div className="flex justify-between mt-1">
            {errors.comment && <p className="text-red-500 text-sm">{errors.comment}</p>}
            <p className="text-sm text-gray-500 ml-auto">{comment.length}/500</p>
          </div>
        </div>

        {/* Media Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos and Videos (optional)
          </label>

          {/* Upload Buttons */}
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={images.length >= 5}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MdPhoto className="w-4 h-4" />
              Add Photos ({images.length}/5)
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={videos.length >= 2}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MdVideocam className="w-4 h-4" />
              Add Videos ({videos.length}/2)
            </button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleVideoUpload}
            className="hidden"
          />

          {/* Media Preview */}
          {(images.length > 0 || videos.length > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((image, index) => (
                <div key={`image-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={image}
                    alt={`Upload preview ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                  >
                    <MdDelete className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {videos.map((video, index) => (
                <div key={`video-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <video
                    src={video}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <button
                    type="button"
                    onClick={() => removeVideo(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                  >
                    <MdDelete className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(errors.images || errors.videos) && (
            <p className="text-red-500 text-sm mt-1">
              {errors.images || errors.videos}
            </p>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : initialReview ? "Update" : "Submit Review"}
          </button>
        </div>
      </form>
    </div>
  );
}