"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MdAdd, MdEdit, MdDelete, MdPeople, MdImage, MdSearch, MdFilterList, MdCheckBox, MdCheckBoxOutlineBlank, MdDeleteSweep, MdVerified, MdAdminPanelSettings, MdPerson } from "react-icons/md";
import EditUserModal from "@/components/admin/EditUserModal";
import toast from "react-hot-toast";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatar?: string;
  isVerified: boolean;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export default function ManageUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');

  // Bulk selection states
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchUsers(currentPage, searchTerm, roleFilter, verificationFilter);
  }, [searchTerm, roleFilter, verificationFilter, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, verificationFilter]);

  const fetchUsers = async (page: number = 1, search?: string, role?: string, isVerified?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (search) params.append('search', search);
      if (role) params.append('role', role);
      if (isVerified !== undefined && isVerified !== '') params.append('isVerified', isVerified);

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUsers(result.data);
          setTotalPages(result.pagination.totalPages);
          setTotalCount(result.pagination.totalCount);
          setCurrentPage(result.pagination.page);
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    fetchUsers(); // Refresh list after edit
  };

  const handleDelete = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('User deleted successfully');
        fetchUsers(); // Refresh list
      } else {
        toast.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete user');
    }
    setShowDeleteConfirm(false);
    setSelectedUser(null);
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const token = localStorage.getItem('accessToken');
      const deletePromises = selectedUsers.map(id =>
        fetch(`/api/users?id=${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} user(s) successfully`);
        fetchUsers();
        setSelectedUsers([]);
      } else {
        toast.error('Failed to delete users');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete users');
    }
  };

  const handleBulkRoleChange = async (newRole: 'USER' | 'ADMIN') => {
    if (selectedUsers.length === 0) return;

    try {
      const token = localStorage.getItem('accessToken');
      const updatePromises = selectedUsers.map(id => {
        return fetch(`/api/users?id=${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: newRole })
        });
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount > 0) {
        toast.success(`${successCount} user(s) role updated to ${newRole.toLowerCase()} successfully`);
        fetchUsers();
        setSelectedUsers([]);
      } else {
        toast.error('Failed to update user roles');
      }
    } catch (error) {
      console.error('Bulk role update error:', error);
      toast.error('Failed to update user roles');
    }
  };

  const handleBulkVerificationToggle = async (isVerified: boolean) => {
    if (selectedUsers.length === 0) return;

    try {
      const token = localStorage.getItem('accessToken');
      const updatePromises = selectedUsers.map(id => {
        return fetch(`/api/users?id=${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isVerified })
        });
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount > 0) {
        toast.success(`${successCount} user(s) ${isVerified ? 'verified' : 'unverified'} successfully`);
        fetchUsers();
        setSelectedUsers([]);
      } else {
        toast.error(`Failed to ${isVerified ? 'verify' : 'unverify'} users`);
      }
    } catch (error) {
      console.error('Bulk verification update error:', error);
      toast.error(`Failed to ${isVerified ? 'verify' : 'unverify'} users`);
    }
  };

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
              <h1 className="text-2xl font-bold text-brand-dark">Manage Users</h1>
              <p className="text-brand-secondary">Manage user accounts and permissions</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-brand-light p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-secondary w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-brand-light rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-brand-light rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
              >
                <option value="">All Roles</option>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>

              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="px-3 py-2 border border-brand-light rounded-lg focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
              >
                <option value="">All Status</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-light">
              <div className="flex items-center gap-2">
                <span className="text-sm text-brand-secondary">
                  {selectedUsers.length} user(s) selected
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkRoleChange('USER')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Set as User
                </button>
                <button
                  onClick={() => handleBulkRoleChange('ADMIN')}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
                >
                  Set as Admin
                </button>
                <button
                  onClick={() => handleBulkVerificationToggle(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                >
                  Verify
                </button>
                <button
                  onClick={() => handleBulkVerificationToggle(false)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
                >
                  Unverify
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

        {/* Users Table */}
        {users.length === 0 && totalCount > 0 ? (
          <div className="text-center py-12">
            <MdSearch className="w-16 h-16 text-brand-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-dark mb-2">No users found</h3>
            <p className="text-brand-secondary">Try adjusting your search or filters</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-12">
            <MdPeople className="w-16 h-16 text-brand-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-dark mb-2">No users yet</h3>
            <p className="text-brand-secondary mb-6">User registrations will appear here</p>
          </div>
        ) : (
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
                        {selectedUsers.length === users.length && users.length > 0 ? (
                          <MdCheckBox className="w-5 h-5 text-brand-primary" />
                        ) : (
                          <MdCheckBoxOutlineBlank className="w-5 h-5 text-brand-secondary" />
                        )}
                        Avatar & Name
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Verified</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark">Created Date</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-brand-dark">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-light">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-brand-light/25">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSelectUser(user.id)}
                            className="w-5 h-5 mr-2 flex-shrink-0"
                          >
                            {selectedUsers.includes(user.id) ? (
                              <MdCheckBox className="w-5 h-5 text-brand-primary" />
                            ) : (
                              <MdCheckBoxOutlineBlank className="w-5 h-5 text-brand-secondary" />
                            )}
                          </button>
                          <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={`${user.firstName} ${user.lastName}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-brand-secondary">
                                <MdImage className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-brand-dark">{user.firstName} {user.lastName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-secondary">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 w-fit ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role === 'ADMIN' ? <MdAdminPanelSettings className="w-3 h-3" /> : <MdPerson className="w-3 h-3" />}
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          user.isVerified
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-secondary">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <MdEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
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
        {showDeleteConfirm && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-brand-dark mb-4">Delete User</h3>
              <p className="text-brand-secondary mb-6">
                Are you sure you want to delete "{selectedUser.firstName} {selectedUser.lastName}" ({selectedUser.email})? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-brand-light text-brand-dark rounded-lg hover:bg-brand-light/50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(selectedUser.id)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        <EditUserModal
          user={editingUser}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          onSave={handleEditSave}
        />
      </div>
    </main>
  );
}