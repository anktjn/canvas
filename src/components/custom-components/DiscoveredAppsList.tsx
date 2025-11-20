"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowUpDown, Globe, AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react';

export type DiscoveredAppListItem = {
  id: string;
  name: string;
  appType: string | null;
  accounts: number | null;
  sources: string | null;
  lastUsed: string | null;
  status: string | null;
  discoverySourceUrl: string | null;
  softwareCategories: string | null;
  risk: string | null;
  compliances: string | null;
};

export type DiscoveredAppsListProps = {
  title?: string;
  apps: DiscoveredAppListItem[];
  totalCount?: number;
  filters?: {
    appType?: string;
    status?: string;
    risk?: string;
    category?: string;
    source?: string;
    minAccounts?: number;
    maxAccounts?: number;
    search?: string;
  };
  isLoading?: boolean;
  progressive?: boolean;
  showFilters?: boolean;
};

type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'accounts-desc'
  | 'accounts-asc'
  | 'risk-asc'
  | 'risk-desc'
  | 'lastUsed-desc'
  | 'lastUsed-asc';

export const DiscoveredAppsList: React.FC<DiscoveredAppsListProps> = ({
  title = 'Discovered Apps',
  apps = [],
  totalCount,
  filters,
  isLoading = false,
  progressive = false,
  showFilters = true,
}) => {
  const [stage, setStage] = React.useState<number>(progressive ? 0 : 2);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [sortBy, setSortBy] = React.useState<SortOption>('name-asc');

  React.useEffect(() => {
    if (!progressive) return;
    const t1 = setTimeout(() => setStage(1), 150);
    const t2 = setTimeout(() => setStage(2), 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [progressive]);

  const showHeader = stage >= 1;
  const showList = stage >= 2;

  // Client-side filtering and sorting
  const filteredAndSortedApps = React.useMemo(() => {
    let result = [...apps];

    // Client-side search (refines server-side search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((app) => {
        const name = (app.name || '').toLowerCase();
        const categories = (app.softwareCategories || '').toLowerCase();
        const sources = (app.sources || '').toLowerCase();
        const risk = (app.risk || '').toLowerCase();
        const url = (app.discoverySourceUrl || '').toLowerCase();
        return (
          name.includes(query) ||
          categories.includes(query) ||
          sources.includes(query) ||
          risk.includes(query) ||
          url.includes(query)
        );
      });
    }

    // Client-side sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'accounts-desc':
          return (b.accounts || 0) - (a.accounts || 0);
        case 'accounts-asc':
          return (a.accounts || 0) - (b.accounts || 0);
        case 'risk-asc':
          return (a.risk || '').localeCompare(b.risk || '');
        case 'risk-desc':
          return (b.risk || '').localeCompare(a.risk || '');
        case 'lastUsed-desc':
          return new Date(b.lastUsed || 0).getTime() - new Date(a.lastUsed || 0).getTime();
        case 'lastUsed-asc':
          return new Date(a.lastUsed || 0).getTime() - new Date(b.lastUsed || 0).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [apps, searchQuery, sortBy]);

  // Build filter summary
  const filterSummary = React.useMemo(() => {
    const parts: string[] = [];
    if (filters?.appType) parts.push(`Type: ${filters.appType}`);
    if (filters?.status) parts.push(`Status: ${filters.status}`);
    if (filters?.risk) parts.push(`Risk: ${filters.risk}`);
    if (filters?.category) parts.push(`Category: ${filters.category}`);
    if (filters?.source) parts.push(`Source: ${filters.source}`);
    if (filters?.minAccounts) parts.push(`Min Accounts: ${filters.minAccounts}`);
    if (filters?.maxAccounts) parts.push(`Max Accounts: ${filters.maxAccounts}`);
    if (filters?.search) parts.push(`Search: "${filters.search}"`);
    return parts.length > 0 ? parts.join(' • ') : null;
  }, [filters]);

  const getRiskBadgeVariant = (risk: string | null) => {
    if (!risk) return 'secondary';
    const riskLower = risk.toLowerCase();
    if (riskLower === 'high') return 'destructive';
    if (riskLower === 'medium') return 'default';
    return 'secondary';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Card className="rounded-lg border min-w-sm max-w-5xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {showHeader && (
              <div className="mt-2 space-y-1">
                {totalCount !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    Showing {apps.length} {totalCount !== apps.length ? `of ${totalCount}` : ''} apps
                  </p>
                )}
                {showFilters && filterSummary && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filters?.appType && (
                      <Badge variant="secondary" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        {filters.appType}
                      </Badge>
                    )}
                    {filters?.status && (
                      <Badge variant="outline" className="text-xs">
                        {filters.status}
                      </Badge>
                    )}
                    {filters?.risk && (
                      <Badge variant={getRiskBadgeVariant(filters.risk)} className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {filters.risk}
                      </Badge>
                    )}
                    {filters?.category && (
                      <Badge variant="outline" className="text-xs">
                        {filters.category}
                      </Badge>
                    )}
                    {filters?.search && (
                      <Badge variant="outline" className="text-xs">
                        "{filters.search}"
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showList ? (
          isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 w-full rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No apps found</p>
              {filterSummary && <p className="text-xs mt-1">Try adjusting your filters</p>}
            </div>
          ) : (
            <>
              {/* Search and Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, category, source, or risk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="accounts-desc">Most Accounts</SelectItem>
                    <SelectItem value="accounts-asc">Least Accounts</SelectItem>
                    <SelectItem value="risk-desc">Risk (High to Low)</SelectItem>
                    <SelectItem value="risk-asc">Risk (Low to High)</SelectItem>
                    <SelectItem value="lastUsed-desc">Recently Used</SelectItem>
                    <SelectItem value="lastUsed-asc">Oldest Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results count */}
              {searchQuery && (
                <div className="text-xs text-muted-foreground mb-3">
                  Showing {filteredAndSortedApps.length} of {apps.length} apps
                </div>
              )}

              {/* Apps List */}
              {filteredAndSortedApps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No apps match your search</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAndSortedApps.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-start justify-between p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <div className="text-sm font-medium">{app.name || 'Unnamed App'}</div>
                          {app.appType && (
                            <Badge variant="secondary" className="text-xs">
                              {app.appType}
                            </Badge>
                          )}
                          {app.status && (
                            <Badge variant="outline" className="text-xs">
                              {app.status}
                            </Badge>
                          )}
                          {app.risk && (
                            <Badge variant={getRiskBadgeVariant(app.risk)} className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {app.risk}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                          {app.accounts !== null && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {app.accounts} accounts
                            </span>
                          )}
                          {app.softwareCategories && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {app.softwareCategories.split(',').slice(0, 2).join(', ')}
                              {app.softwareCategories.split(',').length > 2 && '...'}
                            </span>
                          )}
                          {app.sources && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {app.sources.split(',').slice(0, 1).join(', ')}
                              {app.sources.split(',').length > 1 && '...'}
                            </span>
                          )}
                          {app.lastUsed && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(app.lastUsed)}
                            </span>
                          )}
                        </div>
                        {app.discoverySourceUrl && (
                          <a
                            href={app.discoverySourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3" />
                            View source
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        ) : (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 w-full rounded bg-muted animate-pulse" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscoveredAppsList;

