"use client";

import { useState, useEffect } from "react";
import { MdClose, MdCloudUpload, MdImage, MdAdd } from "react-icons/md";
import toast from "react-hot-toast";

interface SizeOption {
  name: string;
  stock: number;
}

interface Product {
   id: string;
   name: string;
   description?: string;
   price: number | null;
   compareAtPrice?: number | null;
   category: string;
   image?: string;
   images?: string[];
   stock: number;
   sizes?: SizeOption[];
   rating?: number;
   badge?: string;
   isActive: boolean;
 }

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface ProductFormData {
   name: string;
   overview: string; // Tổng quan sản phẩm (ngắn gọn)
   description: string; // Mô tả chi tiết (đầy đủ)
   price: string;
   compareAtPrice: string;
   category: string;
   stock: string;
   sizes: SizeOption[];
   rating: string;
   badge: string;
   image: File | null;
   images: File[];
   isActive: boolean;
   removeMainImage: boolean;
   imagesToRemove: string[];
}

export default function EditProductModal({ product, isOpen, onClose, onSave }: EditProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<ProductFormData>({
     name: "",
     overview: "", // Tổng quan sản phẩm
     description: "", // Mô tả chi tiết
     price: "",
     compareAtPrice: "",
     category: "",
     stock: "",
     sizes: [],
     rating: "0",
     badge: "",
     image: null,
     images: [],
     isActive: true,
     removeMainImage: false,
     imagesToRemove: []
   });

  const categories = [
    'Necklaces',
    'Earrings',
    'Bracelets',
    'Rings',
    'Jewelry Sets',
    'Other'
  ];

  // Initialize form data when product changes
   useEffect(() => {
     if (product && isOpen) {
       setFormData({
         name: product.name,
         overview: (product as any).overview || "",
         description: product.description || "",
         price: product.price?.toString() || "",
         compareAtPrice: product.compareAtPrice?.toString() || "",
         category: product.category,
         stock: product.stock.toString(),
         sizes: product.sizes || [],
         rating: product.rating?.toString() || "0",
         badge: product.badge || "",
         image: null, // New image file
         images: [], // New images files
         isActive: product.isActive,
         removeMainImage: false,
         imagesToRemove: []
       });

       // Reset file inputs when modal opens
       const mainImageInput = document.getElementById('edit-main-image') as HTMLInputElement;
       const additionalImagesInput = document.getElementById('edit-additional-images') as HTMLInputElement;
       if (mainImageInput) mainImageInput.value = '';
       if (additionalImagesInput) additionalImagesInput.value = '';
     }
   }, [product, isOpen]);

   // Reset form when modal closes
   useEffect(() => {
     if (!isOpen) {
       setFormData({
         name: "",
         description: "",
         price: "",
         compareAtPrice: "",
         category: "",
         stock: "",
         sizes: [],
         rating: "0",
         badge: "",
         image: null,
         images: [],
         isActive: true,
         removeMainImage: false,
         imagesToRemove: []
       });
       setErrors({});
     }
   }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, image: file, removeMainImage: false }));
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentImages = formData.images;
    const newImages = [...currentImages, ...files];

    if (newImages.length > 5) {
      toast.error('Maximum 5 additional images allowed');
      return;
    }

    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSizeChange = (index: number, field: 'name' | 'stock', value: string) => {
    const updatedSizes = [...formData.sizes];
    if (field === 'stock') {
      updatedSizes[index][field] = parseInt(value) || 0;
    } else {
      updatedSizes[index][field] = value;
    }
    setFormData(prev => ({ ...prev, sizes: updatedSizes }));
  };

  const addSize = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, { name: "", stock: 0 }]
    }));
  };

  const removeSize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index)
    }));
  };

  const removeAdditionalImage = (index: number) => {
     setFormData(prev => ({
       ...prev,
       images: prev.images.filter((_, i) => i !== index)
     }));
   };

  const removeCurrentMainImage = () => {
    setFormData(prev => ({
      ...prev,
      removeMainImage: true,
      image: null
    }));
  };

  const removeCurrentAdditionalImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      imagesToRemove: [...prev.imagesToRemove, imageUrl]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (formData.price.trim() && (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0)) {
      newErrors.price = "Price must be a number greater than 0";
    }

    if (!formData.stock.trim() || isNaN(parseInt(formData.stock)) || parseInt(formData.stock) < 0) {
      newErrors.stock = "Stock quantity is required and must be a number greater than or equal to 0";
    }

    // Original Price (Sale) validation (required)
    if (!formData.compareAtPrice.trim()) {
      newErrors.compareAtPrice = "Original price (Sale) is required";
    } else {
      const compareValue = parseFloat(formData.compareAtPrice);
      if (isNaN(compareValue) || compareValue <= 0) {
        newErrors.compareAtPrice = "Original price (Sale) must be a number greater than 0";
      } else if (formData.price.trim() && compareValue < parseFloat(formData.price)) {
        newErrors.compareAtPrice = "Original price (Sale) must be greater than or equal to Price";
      }
    }

    // Size validation
    let totalSizeStock = 0;
    if (formData.sizes.length > 0) {
      formData.sizes.forEach((size, index) => {
        if (!size.name.trim()) {
          newErrors[`size_${index}_name`] = `Size ${index + 1} name is required`;
        }
        if (isNaN(size.stock) || size.stock < 0) {
          newErrors[`size_${index}_stock`] = `Size ${index + 1} stock must be a number 0 or more`;
        } else {
          totalSizeStock += size.stock;
        }
      });

      // Check total size stocks <= stock quantity
      const stockValue = parseInt(formData.stock);
      if (stockValue && totalSizeStock > stockValue) {
        newErrors.sizes = `Total size stocks (${totalSizeStock}) cannot exceed stock quantity (${stockValue})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    setErrors({});
    if (!validateForm()) {
      toast.error("Please fix the errors below");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('overview', formData.overview);
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      submitData.append('compareAtPrice', formData.compareAtPrice);
      submitData.append('category', formData.category);
      submitData.append('stock', formData.stock);
      if (formData.sizes.length > 0) {
        submitData.append('sizes', JSON.stringify(formData.sizes));
      }
      if (formData.rating) {
        submitData.append('rating', formData.rating);
      }
      if (formData.badge) {
        submitData.append('badge', formData.badge);
      }
      submitData.append('isActive', formData.isActive.toString());

      // Image management
      if (formData.removeMainImage) {
        submitData.append('removeMainImage', 'true');
      } else if (formData.image) {
        submitData.append('image', formData.image);
      }

      if (formData.imagesToRemove.length > 0) {
        submitData.append('imagesToRemove', JSON.stringify(formData.imagesToRemove));
      }

      formData.images.forEach((file, index) => {
        submitData.append('images', file);
      });

      const response = await fetch(`/api/products?id=${product.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Product updated successfully!');
        onSave();
        onClose();
      } else {
        toast.error(result.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-light">
          <h2 className="text-xl font-bold text-brand-accent">Chỉnh sửa sản phẩm</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-brand-light/50 rounded-lg"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brand-dark">Thông tin cơ bản</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">
                    Tên sản phẩm 
                    <span className="text-red-500">*</span>
                    </label>                  
                    <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full rounded-xl border px-4 py-2 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                      errors.name ? 'border-red-500' : 'border-brand-light'
                    }`}
                    placeholder="Enter product name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Danh mục 
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className={`w-full rounded-xl border px-4 py-2 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                      errors.category ? 'border-red-500' : 'border-brand-light'
                    }`}
                  >
                    <option value="">Lựa chọn danh mục</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-xs mt-1">{errors.category}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tổng quan sản phẩm <span className="text-gray-400 font-normal">(Mô tả ngắn gọn)</span>
                </label>
                <textarea
                  name="overview"
                  value={formData.overview}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-xl border border-brand-light px-4 py-2 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                  placeholder="Nhập mô tả tổng quan ngắn gọn về sản phẩm (2-3 câu). Sẽ hiển thị ở phần 'Tổng quan sản phẩm'."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mô tả ngắn gọn, súc tích về sản phẩm. Khoảng 100-200 từ là lý tưởng.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Mô tả chi tiết <span className="text-gray-400 font-normal">(Mô tả đầy đủ)</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={8}
                  className="w-full rounded-xl border border-brand-light px-4 py-2 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent font-mono text-sm"
                  placeholder="Nhập mô tả chi tiết đầy đủ về sản phẩm. Hỗ trợ Markdown format.\n\nVí dụ:\n## Tính năng nổi bật\n- Tính năng 1\n- Tính năng 2\n\n## Thông tin chi tiết\nMô tả chi tiết về sản phẩm..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mô tả chi tiết, đầy đủ về sản phẩm. Hỗ trợ Markdown format (headings, lists, links, etc.). Sẽ hiển thị ở phần 'Mô tả chi tiết'.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Giá ($)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full rounded-xl border px-4 py-2 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                      errors.price ? 'border-red-500' : 'border-brand-light'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className="text-red-500 text-xs mt-1">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Giá gốc (Sale) 
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="compareAtPrice"
                    value={formData.compareAtPrice}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className={`w-full rounded-xl border px-4 py-2 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary ${
                      errors.compareAtPrice ? 'border-red-500' : 'border-brand-light'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.compareAtPrice && (
                    <p className="text-red-500 text-xs mt-1">{errors.compareAtPrice}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Số lượng tồn kho 
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className={`w-full rounded-xl border px-4 py-2 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                      errors.stock ? 'border-red-500' : 'border-brand-light'
                    }`}
                    placeholder="0"
                  />
                  {errors.stock && (
                    <p className="text-red-500 text-xs mt-1">{errors.stock}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nhãn</label>
                <select
                  name="badge"
                  value={formData.badge}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-brand-light px-4 py-2 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                >
                  <option value="">No badge</option>
                  <option value="New">New</option>
                  <option value="Sale">Sale</option>
                  <option value="Hot">Hot</option>
                  <option value="Best Seller">Best Seller</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-brand-primary bg-gray-100 border-gray-300 rounded focus:ring-brand-primary focus:ring-2"
                />
                <label htmlFor="isActive" className="ml-2 text-sm font-medium text-brand-dark">
                  Active (Sản phẩm sẽ được hiển thị với khách hàng)
                </label>
              </div>
            </div>

            {/* Size Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-brand-dark">Chọn size</h3>
                <button
                  type="button"
                  onClick={addSize}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary text-white hover:opacity-90 text-sm"
                >
                  <MdAdd className="w-4 h-4" />
                  Add size
                </button>
              </div>

              {formData.sizes.length === 0 ? (
                <p className="text-brand-secondary text-sm">Không có tùy chọn kích thước nào được thêm vào. Nhấn &quot;Add Size&quot; để thêm kích thước cho sản phẩm.</p>
              ) : (
                <div className="space-y-3">
                  {formData.sizes.map((size, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border border-brand-light rounded-lg">
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Size Name</label>
                        <input
                          type="text"
                          value={size.name}
                          onChange={(e) => handleSizeChange(index, 'name', e.target.value)}
                          className={`w-full rounded-lg border px-3 py-1 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary ${
                            errors[`size_${index}_name`] ? 'border-red-500' : 'border-brand-light'
                          }`}
                          placeholder="e.g. S, M, L, XL"
                        />
                        {errors[`size_${index}_name`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`size_${index}_name`]}</p>
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Số lượng</label>
                        <input
                          type="number"
                          value={size.stock}
                          onChange={(e) => handleSizeChange(index, 'stock', e.target.value)}
                          min="0"
                          className={`w-full rounded-lg border px-3 py-1 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary ${
                            errors[`size_${index}_stock`] ? 'border-red-500' : 'border-brand-light'
                          }`}
                          placeholder="0"
                        />
                        {errors[`size_${index}_stock`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`size_${index}_stock`]}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSize(index)}
                        className="mt-6 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* General size error */}
              {errors.sizes && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm font-medium">Size Validation Error</p>
                  <p className="text-red-700 text-sm mt-1">{errors.sizes}</p>
                </div>
              )}
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brand-dark">Quản lý hình ảnh</h3>

              {/* Main Image */}
              <div>
                <label className="block text-sm font-medium mb-2">Ảnh chính</label>

                {/* Current main image */}
                {product.image && !formData.image && !formData.removeMainImage && (
                  <div className="mb-4">
                    <div className="relative inline-block">
                      <img
                        src={product.image}
                        alt="Current main image"
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={removeCurrentMainImage}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                        title="Remove main image"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* New main image */}
                {formData.image ? (
                  <div className="relative inline-block">
                    <img
                      src={URL.createObjectURL(formData.image)}
                      alt="New main image"
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: null }))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      title="Remove new image"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-brand-light rounded-xl p-4 text-center w-fit">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMainImageChange}
                      className="hidden"
                      id="edit-main-image"
                    />
                    <label htmlFor="edit-main-image" className="cursor-pointer">
                      <MdCloudUpload className="w-8 h-8 text-brand-secondary mx-auto mb-2" />
                      <p className="text-brand-secondary text-sm">
                        {product.image ? 'Replace main image' : 'Upload main image'}
                      </p>
                    </label>
                  </div>
                )}
              </div>

              {/* Additional Images */}
              <div>
                <label className="block text-sm font-medium mb-2">Thêm hình ảnh</label>

                {/* Current additional images */}
                {product.images && product.images.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-brand-secondary mb-2">Current images (click × to remove):</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                      {product.images
                        .filter(img => !formData.imagesToRemove.includes(img))
                        .map((img, index) => (
                          <div key={img} className="relative">
                            <img
                              src={img}
                              alt={`Current additional ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => removeCurrentAdditionalImage(img)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                              title="Remove this image"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* New additional images */}
                {formData.images.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-brand-secondary mb-2">New images to add:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {formData.images.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`New additional ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removeAdditionalImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                            title="Remove new image"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload area */}
                <div className="border-2 border-dashed border-brand-light rounded-xl p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAdditionalImagesChange}
                    className="hidden"
                    id="edit-additional-images"
                  />
                  <label htmlFor="edit-additional-images" className="cursor-pointer">
                    <MdImage className="w-10 h-10 text-brand-secondary mx-auto mb-2" />
                    <p className="text-brand-secondary mb-1">
                      Add more images
                    </p>
                    <p className="text-xs text-brand-secondary">PNG, JPG, GIF up to 10MB each</p>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-brand-light">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl border border-brand-light text-brand-dark hover:bg-brand-light/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-brand-primary text-white hover:opacity-90 disabled:opacity-60"
              >
                {loading ? 'Updating...' : 'Update Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}