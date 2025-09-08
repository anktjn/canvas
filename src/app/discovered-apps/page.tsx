"use client";
import React, { useEffect, useState } from 'react';
import { 
  fetchDiscoveredApps, 
  DiscoveredApp 
} from '@/lib/data/discovered-apps';

export default function DiscoveredAppsPage() {
  const [apps, setApps] = useState<DiscoveredApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    appType: '',
    status: '',
    risk: '',
    category: '',
    source: '',
    minAccounts: '',
    maxAccounts: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 20;

  const loadApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDiscoveredApps({
        search: filters.search || undefined,
        appType: filters.appType || undefined,
        status: filters.status || undefined,
        risk: filters.risk || undefined,
        category: filters.category || undefined,
        source: filters.source || undefined,
        minAccounts: filters.minAccounts ? Number(filters.minAccounts) : undefined,
        maxAccounts: filters.maxAccounts ? Number(filters.maxAccounts) : undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setApps(result.data || []);
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
    loadApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '', appType: '', status: '', risk: '', category: '', source: '', minAccounts: '', maxAccounts: ''
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => setCurrentPage(page);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Discovered Apps</h1>
        <p className="text-muted-foreground">All discovered apps ({totalCount} total)</p>
      </div>

      <div className="mb-6 p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Filters & Search</h3>
          <button onClick={clearFilters} className="text-sm text-muted-foreground hover:text-foreground">Clear All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Search</label>
            <input
              type="text"
              placeholder="Search names, URLs, categories..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">App Type</label>
            <select value={filters.appType} onChange={(e) => handleFilterChange('appType', e.target.value)} className="w-full p-2 border rounded-md text-sm">
              <option value="">All</option>
              <option value="Trackable App">Trackable App</option>
              <option value="Integrable App">Integrable App</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="w-full p-2 border rounded-md text-sm">
              <option value="">All</option>
              <option value="Unclassified">Unclassified</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Risk</label>
            <select value={filters.risk} onChange={(e) => handleFilterChange('risk', e.target.value)} className="w-full p-2 border rounded-md text-sm">
              <option value="">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Min Accounts</label>
            <input type="number" value={filters.minAccounts} onChange={(e) => handleFilterChange('minAccounts', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Max Accounts</label>
            <input type="number" value={filters.maxAccounts} onChange={(e) => handleFilterChange('maxAccounts', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Category contains</label>
            <input type="text" value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Source contains</label>
            <input type="text" value={filters.source} onChange={(e) => handleFilterChange('source', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-red-200 rounded-lg bg-red-50">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Accounts</th>
                <th className="text-left p-3 font-medium">Risk</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Categories</th>
                <th className="text-left p-3 font-medium">Sources</th>
                <th className="text-left p-3 font-medium">Last Used</th>
                <th className="text-left p-3 font-medium">URL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: itemsPerPage }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3"><div className="h-4 w-40 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-28 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-16 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-16 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-40 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-40 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-32 rounded bg-muted animate-pulse" /></td>
                    <td className="p-3"><div className="h-4 w-40 rounded bg-muted animate-pulse" /></td>
                  </tr>
                ))
              ) : apps.length > 0 ? (
                apps.map((app) => (
                  <tr key={app.id} className="border-t hover:bg-muted/50">
                    <td className="p-3">
                      <div className="font-medium">{app.name}</div>
                    </td>
                    <td className="p-3 text-sm">{app.app_type || '—'}</td>
                    <td className="p-3 text-sm">{typeof app.accounts === 'number' ? app.accounts : '—'}</td>
                    <td className="p-3">
                      <span className={`text-xs font-medium rounded-full px-2 py-1 ${
                        app.risk === 'High' ? 'bg-red-100 text-red-800' : app.risk === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {app.risk || 'Unknown'}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{app.status || '—'}</td>
                    <td className="p-3 text-sm max-w-xs truncate" title={app.software_categories || ''}>{app.software_categories || '—'}</td>
                    <td className="p-3 text-sm max-w-xs truncate" title={app.sources || ''}>{app.sources || '—'}</td>
                    <td className="p-3 text-sm">{app.last_used ? new Date(app.last_used).toLocaleString() : '—'}</td>
                    <td className="p-3 text-sm">{app.discovery_source_url || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">No apps found matching your criteria</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} apps
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button key={page} onClick={() => handlePageChange(page)} className={`px-3 py-1 text-sm border rounded ${currentPage === page ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>{page}</button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="px-2 text-sm text-muted-foreground">...</span>
                  <button onClick={() => handlePageChange(totalPages)} className={`px-3 py-1 text-sm border rounded ${currentPage === totalPages ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>{totalPages}</button>
                </>
              )}
            </div>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}


