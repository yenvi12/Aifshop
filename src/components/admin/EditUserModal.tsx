"use client";

import { useState, useEffect } from "react";
import { MdClose } from "react-icons/md";
import toast from "react-hot-toast";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber?: string;
  dateOfBirth?: string;
  bio?: string;
  avatar?: string;
  isVerified: boolean;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface UserFormData {
  isVerified: boolean;
  role: 'USER' | 'ADMIN';
}

export default function EditUserModal({ user, isOpen, onClose, onSave }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<UserFormData>({
    isVerified: false,
    role: 'USER'
  });

  // Initialize form data when user changes
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        isVerified: user.isVerified,
        role: user.role
      });
    }
  }, [user, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        isVerified: false,
        role: 'USER'
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const validateForm = (): boolean => {
    // No validation needed for role and isVerified fields
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

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

      const submitData = {
        isVerified: formData.isVerified,
        role: formData.role
      };

      const response = await fetch(`/api/users?id=${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('User updated successfully!');
        onSave();
        onClose();
      } else {
        toast.error(result.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-light">
          <h2 className="text-xl font-semibold text-brand-dark">Edit User</h2>
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
            {/* Current User Information (Read-only) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brand-dark">Current User Information</h3>

              <div className="bg-brand-light/30 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-secondary mb-1">Email</label>
                    <p className="text-brand-dark">{user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-secondary mb-1">Full Name</label>
                    <p className="text-brand-dark">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Not provided'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-secondary mb-1">Phone Number</label>
                    <p className="text-brand-dark">{user.phoneNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-secondary mb-1">Date of Birth</label>
                    <p className="text-brand-dark">{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                  </div>
                </div>
                {user.bio && (
                  <div>
                    <label className="block text-sm font-medium text-brand-secondary mb-1">Bio</label>
                    <p className="text-brand-dark">{user.bio}</p>
                  </div>
                )}
                <div className="text-sm text-brand-secondary">
                  Personal information cannot be modified by administrators for privacy and security reasons.
                </div>
              </div>
            </div>

            {/* Administrative Controls */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brand-dark">Administrative Controls</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-brand-light px-4 py-2 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isVerified"
                    checked={formData.isVerified}
                    onChange={(e) => setFormData(prev => ({ ...prev, isVerified: e.target.checked }))}
                    className="w-4 h-4 text-brand-primary bg-gray-100 border-gray-300 rounded focus:ring-brand-primary focus:ring-2"
                  />
                  <label htmlFor="isVerified" className="ml-2 text-sm font-medium text-brand-dark">
                    Verified Account
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
                {loading ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}