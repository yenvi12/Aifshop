"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MdAdd, MdEdit, MdDelete, MdInventory, MdImage, MdStar, MdViewList, MdViewModule, MdSearch, MdFilterList, MdCheckBox, MdCheckBoxOutlineBlank, MdDeleteSweep } from "react-icons/md";
import EditProductModal from "@/components/admin/EditProductModal";
import toast from "react-hot-toast";

interface Product {
   id: string;
   name: string;
   price: number | null;
   compareAtPrice?: number | null;
   category: string;
   image?: string;
   stock: number;
   rating?: number;
   badge?: string;
   isActive: boolean;
   createdAt: string;
 }

export default function ManageProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Bulk selection states
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products when filters or page change
  useEffect(() => {
    if (searchTerm || categoryFilter || statusFilter || currentPage > 1) {
      fetchProducts(currentPage, searchTerm, categoryFilter, statusFilter);
    } else {
      // If no filters, still fetch paginated
      fetchProducts(currentPage);
    }
  }, [searchTerm, categoryFilter, statusFilter, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  const fetchProducts = async (page: number = 1, search?: string, category?: string, status?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '6'
      });

      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (status) params.append('status', status);

      const response = await fetch(`/api/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProducts(result.data);
          setTotalPages(result.pagination.totalPages);
          setTotalCount(result.pagination.totalCount);
          setCurrentPage(result.pagination.page);
        }
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAllProducts(result.data); // For categories
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    fetchProducts(); // Refresh list after edit
  };

  const handleDelete = async (productId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/products?id=${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Product deleted successfully');
        fetchProducts(); // Refresh list
      } else {
        toast.error('Failed to delete product');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete product');
    }
    setShowDeleteConfirm(false);
    setSelectedProduct(null);
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;

    try {
      const token = localStorage.getItem('accessToken');
      const deletePromises = selectedProducts.map(id =>
        fetch(`/api/products?id=${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} product(s) successfully`);
        fetchProducts();
        setSelectedProducts([]);
      } else {
        toast.error('Failed to delete products');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete products');
    }
  };

  const handleBulkStatusUpdate = async (isActive: boolean) => {
    if (selectedProducts.length === 0) return;

    try {
      const token = localStorage.getItem('accessToken');
      const updatePromises = selectedProducts.map(id => {
        const formData = new FormData();
        formData.append('isActive', isActive.toString());

        return fetch(`/api/products?id=${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount > 0) {
        toast.success(`${successCount} product(s) ${isActive ? 'activated' : 'deactivated'} successfully`);
        fetchProducts();
        setSelectedProducts([]);
      } else {
        toast.error(`Failed to ${isActive ? 'activate' : 'deactivate'} products`);
      }
    } catch (error) {
      console.error('Bulk status update error:', error);
      toast.error(`Failed to ${isActive ? 'activate' : 'deactivate'} products`);
    }
  };

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(allProducts.map(p => p.category)));

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-light/30">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-light/30">
     

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-brand-dark">Manage Products</h1>
              <p className="text-brand-secondary">Edit and delete your products</p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border ${
                viewMode === 'grid'
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'border-brand-light text-brand-secondary hover:bg-brand-light/50'
              }`}
              title="Grid View"
            >
              <MdViewModule className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border ${
                viewMode === 'list'
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'border-brand-light text-brand-secondary hover:bg-brand-light/50'
              }`}
              title="List View"
            >
              <MdViewList className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        {allProducts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-brand-light p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-secondary w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search products by name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-brand-light rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-brand-light rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-brand-light rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedProducts.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-light">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-brand-secondary">
                    {selectedProducts.length} product(s) selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkStatusUpdate(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate(false)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products Display */}
        {products.length === 0 && totalCount > 0 ? (
          <div className="text-center py-12">
            <MdSearch className="w-16 h-16 text-brand-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-dark mb-2">No products found</h3>
            <p className="text-brand-secondary">Try adjusting your search or filters</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-12">
            <MdInventory className="w-16 h-16 text-brand-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-dark mb-2">No products yet</h3>
            <p className="text-brand-secondary mb-6">Start by adding your first product from the Admin Dashboard</p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-lg hover:opacity-90"
            >
              <MdAdd className="w-5 h-5" />
              Go to Admin Dashboard
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-brand-light overflow-hidden">
                {/* Checkbox for bulk selection */}
                <div className="absolute top-2 left-2 z-10">
                  <button
                    onClick={() => handleSelectProduct(product.id)}
                    className="w-6 h-6 bg-white/90 rounded border border-brand-light flex items-center justify-center hover:bg-white"
                  >
                    {selectedProducts.includes(product.id) ? (
                      <MdCheckBox className="w-5 h-5 text-brand-primary" />
                    ) : (
                      <MdCheckBoxOutlineBlank className="w-5 h-5 text-brand-secondary" />
                    )}
                  </button>
                </div>

                {/* Product Image */}
                <div className="relative h-48 bg-gray-100">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-brand-secondary">
                      <MdImage className="w-12 h-12" />
                    </div>
                  )}

                  {/* Badge */}
                  {product.badge && (
                    <span className="absolute top-2 left-2 text-xs px-2 py-1 rounded-full bg-brand-primary text-white">
                      {product.badge}
                    </span>
                  )}

                  {/* Status */}
                  <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${
                    product.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-brand-dark mb-1 line-clamp-1">{product.name}</h3>
                  <p className="text-sm text-brand-secondary mb-2">{product.category}</p>

                  {/* Rating */}
                  {product.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      <MdStar className="w-4 h-4 text-amber-400" />
                      <span className="text-sm text-brand-secondary">{product.rating.toFixed(1)}</span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="font-bold text-brand-dark">
                      {product.price ? `${product.price.toLocaleString('vi-VN')}₫` : product.compareAtPrice ? `${product.compareAtPrice.toLocaleString('vi-VN')}₫` : 'Price not set'}
                    </span>
                    {product.compareAtPrice && product.price && (
                      <span className="text-sm text-brand-secondary line-through">
                        ${(product.compareAtPrice.toLocaleString('vi-VN'))}₫
                      </span>
                    )}
                  </div>

                  {/* Stock */}
                  <p className="text-sm text-brand-secondary mb-4">
                    Stock: {product.stock}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                    >
                      <MdEdit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowDeleteConfirm(true);
                      }}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <MdDelete className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl shadow-sm border border-brand-light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-light/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 hover:bg-brand-light/50 px-2 py-1 rounded"
                      >
                        {selectedProducts.length === products.length && products.length > 0 ? (
                          <MdCheckBox className="w-5 h-5 text-brand-primary" />
                        ) : (
                          <MdCheckBoxOutlineBlank className="w-5 h-5 text-brand-secondary" />
                        )}
                        Product
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Stock</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Rating</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-brand-dark">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-light">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-brand-light/25">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSelectProduct(product.id)}
                            className="w-5 h-5 mr-2 flex-shrink-0"
                          >
                            {selectedProducts.includes(product.id) ? (
                              <MdCheckBox className="w-5 h-5 text-brand-primary" />
                            ) : (
                              <MdCheckBoxOutlineBlank className="w-5 h-5 text-brand-secondary" />
                            )}
                          </button>
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-brand-secondary">
                                <MdImage className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-brand-dark line-clamp-1">{product.name}</div>
                            {product.badge && (
                              <span className="text-xs px-2 py-1 rounded-full bg-brand-primary text-white mt-1 inline-block">
                                {product.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-secondary">{product.category}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-brand-dark">
                            {product.price ? `${product.price.toLocaleString('vi-VN')}₫` : product.compareAtPrice ? `${product.compareAtPrice.toLocaleString('vi-VN')}₫` : 'Price not set'}
                          </span>
                          {product.compareAtPrice && product.price && (
                            <span className="text-sm text-brand-secondary line-through">
                              ${(product.compareAtPrice.toLocaleString('vi-VN'))}₫
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-secondary">{product.stock}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          product.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {product.rating && (
                          <div className="flex items-center gap-1">
                            <MdStar className="w-4 h-4 text-amber-400" />
                            <span className="text-sm text-brand-secondary">{product.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <MdEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <MdDelete className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-8">
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                  currentPage === 1
                    ? 'border-brand-light text-brand-secondary cursor-not-allowed'
                    : 'border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white'
                }`}
              >
                Previous
              </button>

              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                    currentPage === page
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'border-brand-light text-brand-secondary hover:bg-brand-light/50'
                  }`}
                >
                  {page}
                </button>
              ))}

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                  currentPage === totalPages
                    ? 'border-brand-light text-brand-secondary cursor-not-allowed'
                    : 'border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-brand-dark mb-4">Delete Product</h3>
              <p className="text-brand-secondary mb-6">
                Are you sure you want to delete &quot;{selectedProduct.name}&quot;? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-brand-light text-brand-dark rounded-lg hover:bg-brand-light/50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(selectedProduct.id)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Modal */}
        <EditProductModal
          product={editingProduct}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingProduct(null);
          }}
          onSave={handleEditSave}
        />
      </div>
    </main>
  );
}