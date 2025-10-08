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
      newErrors.rating = "Vui lòng chọn số sao từ 1-5";
    }

    if (!comment.trim()) {
      newErrors.comment = "Vui lòng nhập nội dung đánh giá";
    } else if (comment.length > 500) {
      newErrors.comment = "Nội dung đánh giá không được quá 500 ký tự";
    }

    if (images.length > 5) {
      newErrors.images = "Tối đa 5 ảnh";
    }

    if (videos.length > 2) {
      newErrors.videos = "Tối đa 2 video";
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
      setErrors({ ...errors, images: "Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)" });
      return;
    }

    // Check total images limit
    if (images.length + files.length > 5) {
      setErrors({ ...errors, images: "Tối đa 5 ảnh cho mỗi đánh giá" });
      return;
    }

    // Check file sizes (10MB limit for images)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setErrors({ ...errors, images: `Ảnh không được vượt quá 10MB. Vui lòng chọn file nhỏ hơn.` });
      return;
    }

    try {
      // Get auth token
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setErrors({ ...errors, images: "Bạn cần đăng nhập để tải ảnh" });
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
        let errorMessage = 'Không thể tải video lên. Vui lòng thử lại.';
        if (result.error?.includes('File size must be less than')) {
          errorMessage = 'File video quá lớn. Vui lòng chọn file nhỏ hơn 10MB.';
        } else if (result.error?.includes('Only image and video files are allowed')) {
          errorMessage = 'Chỉ chấp nhận file video hợp lệ.';
        } else if (result.error?.includes('Invalid Supabase token')) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        }
        setErrors({ ...errors, videos: errorMessage });
        return;
      }

      // Add uploaded URLs to images
      setImages([...images, ...result.data.urls]);
      setErrors({ ...errors, images: "" });
    } catch (error) {
      console.error('Image upload error:', error);
      setErrors({ ...errors, images: "Có lỗi xảy ra khi tải ảnh. Vui lòng kiểm tra kết nối và thử lại." });
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
      setErrors({ ...errors, videos: "Chỉ chấp nhận file video (MP4, MOV, AVI, WebM)" });
      return;
    }

    // Check total videos limit
    if (videos.length + files.length > 2) {
      setErrors({ ...errors, videos: "Tối đa 2 video cho mỗi đánh giá" });
      return;
    }

    // Check file sizes (50MB limit for videos)
    const maxSize = 50 * 1024 * 1024; // 50MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setErrors({ ...errors, videos: `Video không được vượt quá 50MB. Vui lòng chọn file nhỏ hơn.` });
      return;
    }

    try {
      // Get auth token
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setErrors({ ...errors, videos: "Bạn cần đăng nhập để tải video" });
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
        let errorMessage = 'Không thể tải ảnh lên. Vui lòng thử lại.';
        if (result.error?.includes('File size must be less than')) {
          errorMessage = 'File ảnh quá lớn. Vui lòng chọn file nhỏ hơn 5MB.';
        } else if (result.error?.includes('Only image and video files are allowed')) {
          errorMessage = 'Chỉ chấp nhận file ảnh hợp lệ.';
        } else if (result.error?.includes('Invalid Supabase token')) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        }
        setErrors({ ...errors, images: errorMessage });
        return;
      }

      // Add uploaded URLs to videos
      setVideos([...videos, ...result.data.urls]);
      setErrors({ ...errors, videos: "" });
    } catch (error) {
      console.error('Video upload error:', error);
      setErrors({ ...errors, videos: "Có lỗi xảy ra khi tải video. Vui lòng kiểm tra kết nối và thử lại." });
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
          {initialReview ? "Chỉnh sửa đánh giá" : "Viết đánh giá"}
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
            Đánh giá sao
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
              {rating > 0 && `${rating}/5 sao`}
            </span>
          </div>
          {errors.rating && <p className="text-red-500 text-sm mt-1">{errors.rating}</p>}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nội dung đánh giá
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Hãy chia sẻ trải nghiệm của bạn với sản phẩm này..."
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
            Ảnh và video (tùy chọn)
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
              Thêm ảnh ({images.length}/5)
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={videos.length >= 2}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MdVideocam className="w-4 h-4" />
              Thêm video ({videos.length}/2)
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
              Hủy
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Đang xử lý..." : initialReview ? "Cập nhật" : "Gửi đánh giá"}
          </button>
        </div>
      </form>
    </div>
  );
}