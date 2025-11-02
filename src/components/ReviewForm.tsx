"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { MdStar, MdPhoto, MdVideocam, MdDelete, MdClose, MdCloudUpload } from "react-icons/md";
import StarRating from "./reviews/StarRating";

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

export default function ReviewForm({
  productId,
  initialReview,
  onSubmit,
  onCancel,
  isLoading = false
}: Props) {
  const [rating, setRating] = useState(initialReview?.rating || 0);
  const [comment, setComment] = useState(initialReview?.comment || "");
  const [images, setImages] = useState<string[]>(initialReview?.images || []);
  const [videos, setVideos] = useState<string[]>(initialReview?.videos || []);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (rating < 1 || rating > 5) {
      newErrors.rating = "Vui lòng chọn đánh giá từ 1-5 sao";
    }

    if (!comment.trim()) {
      newErrors.comment = "Vui lòng nhập nội dung đánh giá";
    } else if (comment.length > 500) {
      newErrors.comment = "Nội dung đánh giá không được vượt quá 500 ký tự";
    }

    if (images.length > 5) {
      newErrors.images = "Tối đa 5 hình ảnh";
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
      setErrors({ ...errors, images: "Chỉ chấp nhận file hình ảnh (JPEG, PNG, GIF, WebP)" });
      return;
    }

    // Check total images limit
    if (images.length + files.length > 5) {
      setErrors({ ...errors, images: "Tối đa 5 hình ảnh cho mỗi đánh giá" });
      return;
    }

    // Check file sizes (10MB limit for images)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setErrors({ ...errors, images: `Hình ảnh không được vượt quá 10MB. Vui lòng chọn file nhỏ hơn.` });
      return;
    }

    try {
      setIsUploading(true);
      // Get auth token
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setErrors({ ...errors, images: "Bạn cần đăng nhập để tải lên hình ảnh" });
        setIsUploading(false);
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
        let errorMessage = 'Tải lên hình ảnh thất bại. Vui lòng thử lại.';
        if (result.error?.includes('File size must be less than')) {
          errorMessage = 'File hình ảnh quá lớn. Vui lòng chọn file nhỏ hơn 5MB.';
        } else if (result.error?.includes('Only image and video files are allowed')) {
          errorMessage = 'Chỉ chấp nhận file hình ảnh hợp lệ.';
        } else if (result.error?.includes('Invalid Supabase token')) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        }
        setErrors({ ...errors, images: errorMessage });
        setIsUploading(false);
        return;
      }

      // Add uploaded URLs to images
      setImages([...images, ...result.data.urls]);
      setErrors({ ...errors, images: "" });
      setIsUploading(false);
    } catch (error) {
      console.error('Image upload error:', error);
      setErrors({ ...errors, images: "Đã xảy ra lỗi khi tải lên hình ảnh. Vui lòng kiểm tra kết nối và thử lại." });
      setIsUploading(false);
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
      setIsUploading(true);
      // Get auth token
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setErrors({ ...errors, videos: "Bạn cần đăng nhập để tải lên video" });
        setIsUploading(false);
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
        let errorMessage = 'Tải lên video thất bại. Vui lòng thử lại.';
        if (result.error?.includes('File size must be less than')) {
          errorMessage = 'File video quá lớn. Vui lòng chọn file nhỏ hơn 10MB.';
        } else if (result.error?.includes('Only image and video files are allowed')) {
          errorMessage = 'Chỉ chấp nhận file video hợp lệ.';
        } else if (result.error?.includes('Invalid Supabase token')) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        }
        setErrors({ ...errors, videos: errorMessage });
        setIsUploading(false);
        return;
      }

      // Add uploaded URLs to videos
      setVideos([...videos, ...result.data.urls]);
      setErrors({ ...errors, videos: "" });
      setIsUploading(false);
    } catch (error) {
      console.error('Video upload error:', error);
      setErrors({ ...errors, videos: "Đã xảy ra lỗi khi tải lên video. Vui lòng kiểm tra kết nối và thử lại." });
      setIsUploading(false);
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
    <div className="review-form-card rounded-2xl p-6 md:p-8 mb-8 animate-fade-in-scale">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">
          {initialReview ? "Chỉnh sửa đánh giá" : "Viết đánh giá của bạn"}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-full"
            aria-label="Đóng"
          >
            <MdClose className="w-6 h-6" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Đánh giá sản phẩm *
          </label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              {Array.from({ length: 5 }).map((_, i) => {
                const starValue = i + 1;
                const isFilled = starValue <= (hoveredRating || rating);
                
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoveredRating(starValue)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-all duration-200 star-hover"
                  >
                    <MdStar
                      className={`
                        w-10 h-10 transition-all duration-200
                        ${isFilled
                          ? "text-yellow-400 fill-current star-filled"
                          : "text-gray-300"
                        }
                      `}
                    />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              {rating > 0 && (
                <span className="text-lg font-semibold text-gray-700">
                  {rating} / 5 sao
                </span>
              )}
              <span className="text-sm text-gray-500">
                {rating === 0 && "Nhấp vào sao để đánh giá"}
              </span>
            </div>
          </div>
          {errors.rating && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <span>⚠️</span>
              {errors.rating}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Nội dung đánh giá *
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Chia sẻ trải nghiệm của bạn với sản phẩm này... Hãy mô tả chi tiết về chất lượng, thiết kế, giá trị và mọi điều bạn muốn người khác biết."
            rows={6}
            className="review-textarea w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8794C0] focus:border-transparent resize-none text-gray-700 text-base"
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-2">
            {errors.comment && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <span>⚠️</span>
                {errors.comment}
              </p>
            )}
            <p className={`text-sm ml-auto ${comment.length > 450 ? "text-orange-500" : "text-gray-500"}`}>
              {comment.length} / 500 ký tự
            </p>
          </div>
        </div>

        {/* Media Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Hình ảnh và Video (tùy chọn)
          </label>

          {/* Upload Buttons */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={images.length >= 5 || isUploading}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border border-gray-300 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-700"
            >
              <MdPhoto className="w-5 h-5" />
              {isUploading ? "Đang tải lên..." : `Thêm ảnh (${images.length}/5)`}
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={videos.length >= 2 || isUploading}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border border-gray-300 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-700"
            >
              <MdVideocam className="w-5 h-5" />
              {isUploading ? "Đang tải lên..." : `Thêm video (${videos.length}/2)`}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
              {images.map((image, index) => (
                <div
                  key={`image-${index}`}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
                >
                  <Image
                    src={image}
                    alt={`Preview ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                    aria-label="Xóa ảnh"
                  >
                    <MdDelete className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {videos.map((video, index) => (
                <div
                  key={`video-${index}`}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
                >
                  <video
                    src={video}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <button
                    type="button"
                    onClick={() => removeVideo(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                    aria-label="Xóa video"
                  >
                    <MdDelete className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(errors.images || errors.videos) && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <span>⚠️</span>
              {errors.images || errors.videos}
            </p>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 font-medium"
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || isUploading}
            className="submit-button-gradient px-8 py-3 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Đang xử lý...
              </>
            ) : initialReview ? (
              "Cập nhật đánh giá"
            ) : (
              "Gửi đánh giá"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
