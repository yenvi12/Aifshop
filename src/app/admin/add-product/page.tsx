"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MdCloudUpload, MdAdd, MdImage } from "react-icons/md";
import Header from "@/components/Header";
import toast from "react-hot-toast";

interface SizeOption {
  name: string;
  stock: number;
}

interface ProductFormData {
  name: string;
  overview: string; // Tổng quan sản phẩm (ngắn gọn)
  description: string; // Mô tả chi tiết (đầy đủ)
  price: string;
  compareAtPrice: string;
  category: string;
  stock: string; // hiển thị: nếu có size thì = tổng stock size, nếu không có size thì nhập tay
  sizes: SizeOption[];
  badge: string;
  image: File | null;
  images: File[];
}

export default function AddProductPage() {
  const router = useRouter();
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
    badge: "",
    image: null,
    images: []
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, image: file }));
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentImages = formData.images;
    const newImages = [...currentImages, ...files];

    // Limit to 5 images
    if (newImages.length > 5) {
      alert('Maximum 5 additional images allowed');
      return;
    }

    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const removeMainImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
  };

  const removeAdditionalImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    // Price validation (optional)
    let priceValue: number | null = null;
    if (formData.price.trim()) {
      priceValue = parseFloat(formData.price);
      if (isNaN(priceValue) || priceValue <= 0) {
        newErrors.price = "Price must be a number greater than 0";
      }
    }

    // Original Price (Sale) validation (required)
    if (!formData.compareAtPrice.trim()) {
      newErrors.compareAtPrice = "Original price (Sale) is required";
    } else {
      const compareValue = parseFloat(formData.compareAtPrice);
      if (isNaN(compareValue) || compareValue <= 0) {
        newErrors.compareAtPrice = "Original price (Sale) must be a number greater than 0";
      } else if (priceValue !== null && compareValue < priceValue) {
        newErrors.compareAtPrice = "Original price (Sale) must be greater than or equal to Price";
      }
    }

    // Stock / sizes validation
    if (formData.sizes.length > 0) {
      // Has sizes: derive stock from sizes
      let totalSizeStock = 0;
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
      if (totalSizeStock < 0) {
        newErrors.sizes = "Total stock by sizes must be greater than or equal to 0";
      }
    } else {
      // No sizes: require stock input
      const stockValue = parseInt(formData.stock);
      if (!formData.stock.trim() || isNaN(stockValue) || stockValue < 0) {
        newErrors.stock = "Stock quantity is required and must be a number greater than or equal to 0";
      }
    }

    // Image validation
    if (!formData.image) {
      newErrors.image = "Main product image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      toast.error("Please fix the errors below");
      return;
    }

    setLoading(true);

    try {
      // Get JWT token from localStorage or wherever you store it
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please login as admin first');
        router.push('/login');
        return;
      }

      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('overview', formData.overview);
      submitData.append('description', formData.description);
      if (formData.price.trim()) {
        submitData.append('price', formData.price);
      }
      submitData.append('compareAtPrice', formData.compareAtPrice);
      submitData.append('category', formData.category);

      if (formData.sizes.length > 0) {
        // Has sizes: let backend derive stock from sizes
        submitData.append('sizes', JSON.stringify(formData.sizes));
      } else {
        // No sizes: send explicit stock
        submitData.append('stock', formData.stock);
      }
      if (formData.badge) {
        submitData.append('badge', formData.badge);
      }

      if (formData.image) {
        submitData.append('image', formData.image);
      }

      formData.images.forEach((file, index) => {
        submitData.append('images', file);
      });

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Product added successfully!');
        router.push('/admin'); // Redirect to admin dashboard
      } else {
        toast.error(result.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Add product error:', error);
      toast.error('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const staticCategories = [
    'Necklaces',
    'Earrings',
    'Bracelets',
    'Rings',
    'Jewelry Sets',
    'Other'
  ];

  return (
    <main className="min-h-screen bg-brand-light/30">
      

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-xl font-bold text-brand-dark">Add New Product</h1>
            <p className="text-brand-secondary">Create a new product for your store</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-brand-light p-6">
          {/* Validation Messages */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
              <ul className="text-red-700 text-sm space-y-1">
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field}>• {message}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-brand-dark">Basic Information</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full rounded-xl border px-4 py-2 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary ${
                      errors.name ? 'border-red-500' : 'border-brand-light'
                    }`}
                    placeholder="Enter product name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className={`w-full rounded-xl border px-4 py-2 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary ${
                      errors.category ? 'border-red-500' : 'border-brand-light'
                    }`}
                  >
                    <option value="">Select category</option>
                    {staticCategories.map(cat => (
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
                  className="w-full rounded-xl border border-brand-light px-4 py-2 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
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
                  className="w-full rounded-xl border border-brand-light px-4 py-2 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary font-mono text-sm"
                  placeholder="Nhập mô tả chi tiết đầy đủ về sản phẩm. Hỗ trợ Markdown format.\n\nVí dụ:\n## Tính năng nổi bật\n- Tính năng 1\n- Tính năng 2\n\n## Thông tin chi tiết\nMô tả chi tiết về sản phẩm..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mô tả chi tiết, đầy đủ về sản phẩm. Hỗ trợ Markdown format (headings, lists, links, etc.). Sẽ hiển thị ở phần &apos;Mô tả chi tiết&apos;.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₫)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full rounded-xl border px-4 py-2 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary ${
                      errors.price ? 'border-red-500' : 'border-brand-light'
                    }`}
                    placeholder="0₫"
                  />
                  {errors.price && (
                    <p className="text-red-500 text-xs mt-1">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Original Price (Sale) * (₫)</label>
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
                    placeholder="0₫"
                  />
                  {errors.compareAtPrice && (
                    <p className="text-red-500 text-xs mt-1">{errors.compareAtPrice}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Stock Quantity {formData.sizes.length > 0 ? "(auto from sizes)" : "*"}
                </label>
                <input
                  type="number"
                  name="stock"
                  value={
                    formData.sizes.length > 0
                      ? formData.sizes.reduce((sum, s) => sum + (s.stock || 0), 0).toString()
                      : formData.stock
                  }
                  onChange={(e) => {
                    if (formData.sizes.length === 0) {
                      handleInputChange(e);
                    }
                  }}
                  required={formData.sizes.length === 0}
                  min="0"
                  readOnly={formData.sizes.length > 0}
                  className={`w-full rounded-xl border px-4 py-2 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary ${
                    errors.stock ? 'border-red-500' : 'border-brand-light'
                  } ${formData.sizes.length > 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="0"
                />
                {errors.stock && (
                  <p className="text-red-500 text-xs mt-1">{errors.stock}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Badge</label>
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
            </div>

            {/* Size Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-brand-dark">Size Options</h2>
                <button
                  type="button"
                  onClick={addSize}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-accent text-white hover:opacity-90 text-sm"
                >
                  <MdAdd className="w-4 h-4" />
                  Add Size
                </button>
              </div>

              {formData.sizes.length === 0 ? (
                <p className="text-brand-secondary text-sm">No size options added. Click &quot;Add Size&quot; to add custom sizes.</p>
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
                        <label className="block text-sm font-medium mb-1">Stock</label>
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
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-brand-dark">Product Images</h2>

              {/* Main Image */}
              <div>
                <label className="block text-sm font-medium mb-2">Main Image *</label>
                {formData.image ? (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(formData.image)}
                      alt="Main product image"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={removeMainImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center ${
                    errors.image ? 'border-red-500' : 'border-brand-light'
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMainImageChange}
                      className="hidden"
                      id="main-image"
                    />
                    <label htmlFor="main-image" className="cursor-pointer">
                      <MdCloudUpload className="w-12 h-12 text-brand-accent mx-auto mb-4" />
                      <p className="text-brand-accent mb-2">
                        Click to upload main image
                      </p>
                      <p className="text-xs text-brand-accent">PNG, JPG, GIF up to 10MB</p>
                    </label>
                  </div>
                )}
                {errors.image && (
                  <p className="text-red-500 text-xs mt-1">{errors.image}</p>
                )}
              </div>

              {/* Additional Images */}
              <div>
                <label className="block text-sm font-medium mb-2">Additional Images (Max 5)</label>

                {/* Display selected images */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {formData.images.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Additional ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeAdditionalImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload area */}
                {formData.images.length < 5 && (
                  <div className="border-2 border-dashed border-brand-light rounded-xl p-8 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleAdditionalImagesChange}
                      className="hidden"
                      id="additional-images"
                    />
                    <label htmlFor="additional-images" className="cursor-pointer">
                      <MdImage className="w-12 h-12 text-brand-accent mx-auto mb-4" />
                      <p className="text-brand-accent mb-2">
                        {formData.images.length > 0
                          ? `Add more images (${formData.images.length}/5)`
                          : 'Click to upload additional images'
                        }
                      </p>
                      <p className="text-xs text-brand-accent">PNG, JPG, GIF up to 10MB each</p>
                    </label>
                  </div>
                )}

                {formData.images.length >= 5 && (
                  <p className="text-amber-600 text-sm">Maximum 5 additional images reached</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6 border-t border-brand-light">
              <Link
                href="/admin"
                className="px-6 py-2 rounded-xl border border-brand-light text-brand-dark hover:bg-brand-light/50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-brand-accent text-white hover:opacity-90 disabled:opacity-60"
              >
                <MdAdd className="w-4 h-4" />
                {loading ? 'Adding Product...' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}