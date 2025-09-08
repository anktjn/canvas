"use client";
import React, { useState, useEffect } from 'react';
import { fetchUserProfiles, UserProfile } from '@/lib/data/user-profiles';

export default function UserProfilesPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    department: '',
    status: '' as '' | 'Active' | 'Inactive',
    userCategory: '' as '' | 'Full-time' | 'Contractor' | 'External',
    workLocation: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 20;

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchUserProfiles({
        department: filters.department || undefined,
        status: (filters.status || undefined) as 'Active' | 'Inactive' | undefined,
        userCategory: (filters.userCategory || undefined) as 'Full-time' | 'Contractor' | 'External' | '' | undefined,
        workLocation: filters.workLocation || undefined,
        search: filters.search || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setUsers(result.data || []);
        setTotalCount(result.count || 0);
        setTotalPages(Math.ceil((result.count || 0) / itemsPerPage));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filters, currentPage]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setFilters({
      department: '',
      status: '' as '' | 'Active' | 'Inactive',
      userCategory: '' as '' | 'Full-time' | 'Contractor' | 'External',
      workLocation: '',
      search: '',
    });
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">User Profiles</h1>
        <p className="text-muted-foreground">
          Complete user profile data from your organization ({totalCount} total users)
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Filters & Search</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Search</label>
            <input
              type="text"
              placeholder="Search names, emails, titles..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Department</label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Marketing">Marketing</option>
              <option value="HR">HR</option>
              <option value="Product">Product</option>
              <option value="Customer Success">Customer Success</option>
              <option value="Sales">Sales</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <select
              value={filters.userCategory}
              onChange={(e) => handleFilterChange('userCategory', e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            >
              <option value="">All Categories</option>
              <option value="Full-time">Full-time</option>
              <option value="Contractor">Contractor</option>
              <option value="External">External</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Location</label>
            <select
              value={filters.workLocation}
              onChange={(e) => handleFilterChange('workLocation', e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            >
              <option value="">All Locations</option>
              <option value="san francisco">San Francisco</option>
              <option value="los angeles">Los Angeles</option>
              <option value="seattle">Seattle</option>
              <option value="bangalore">Bangalore</option>
              <option value="singapore">Singapore</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 border border-red-200 rounded-lg bg-red-50">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Complete User Data Table */}
      <div className="border rounded-lg overflow-hidden bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">User ID</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Username</th>
                <th className="text-left p-3 font-medium">Department</th>
                <th className="text-left p-3 font-medium">Job Title</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Location</th>
                <th className="text-left p-3 font-medium">Start Date</th>
                <th className="text-left p-3 font-medium">End Date</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Apps</th>
                <th className="text-left p-3 font-medium">Personal Email</th>
                <th className="text-left p-3 font-medium">Additional Info</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-left p-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: itemsPerPage }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3"><div className="h-4 w-16 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-32 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-40 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-24 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-28 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-16 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-16 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-12 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-32 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-24 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
                  </tr>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 text-sm font-mono">{user.user_id}</td>
                    <td className="p-3">
                      <div className="font-medium">{user.first_name} {user.last_name}</div>
                    </td>
                    <td className="p-3 text-sm">{user.email}</td>
                    <td className="p-3 text-sm">{user.username || '—'}</td>
                    <td className="p-3 text-sm">{user.department || '—'}</td>
                    <td className="p-3 text-sm">{user.job_title || '—'}</td>
                    <td className="p-3">
                      <span className={`text-xs font-medium rounded-full px-2 py-1 ${
                        user.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{user.user_category || '—'}</td>
                    <td className="p-3 text-sm">{user.work_location_code || '—'}</td>
                    <td className="p-3 text-sm">{user.start_date || '—'}</td>
                    <td className="p-3 text-sm">{user.end_date || '—'}</td>
                    <td className="p-3 text-sm">{user.role || '—'}</td>
                    <td className="p-3 text-sm text-center">{user.provisioned_apps_count}</td>
                    <td className="p-3 text-sm">{user.personal_email || '—'}</td>
                    <td className="p-3 text-sm max-w-xs truncate" title={user.additional_information || ''}>
                      {user.additional_information || '—'}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={17} className="p-8 text-center text-muted-foreground">
                    No users found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} users
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 text-sm border rounded ${
                      currentPage === page 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="px-2 text-sm text-muted-foreground">...</span>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className={`px-3 py-1 text-sm border rounded ${
                      currentPage === totalPages 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
