"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, Mail, Building2, Briefcase, MapPin, Search, ArrowUpDown, Filter, X, ChevronDown, ChevronUp, ListFilter } from 'lucide-react';

export type UserProfileListItem = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'Active' | 'Inactive';
  userCategory: string;
  department: string | null;
  jobTitle: string | null;
  workLocation: string | null;
  provisionedAppsCount: number;
};

export type UserProfilesListProps = {
  title?: string;
  users: UserProfileListItem[];
  totalCount?: number;
  filters?: {
    department?: string;
    status?: string;
    userCategory?: string;
    workLocation?: string;
    minApps?: number;
    maxApps?: number;
    search?: string;
  };
  isLoading?: boolean;
  progressive?: boolean;
  showFilters?: boolean;
};

type SortOption = 
  | 'name-asc'
  | 'name-desc'
  | 'email-asc'
  | 'email-desc'
  | 'apps-asc'
  | 'apps-desc'
  | 'department-asc'
  | 'department-desc';

export const UserProfilesList: React.FC<UserProfilesListProps> = ({
  title = 'User Profiles',
  users = [],
  totalCount,
  filters,
  isLoading = false,
  progressive = false,
  showFilters = true,
}) => {
  const [stage, setStage] = React.useState<number>(progressive ? 0 : 2);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [sortBy, setSortBy] = React.useState<SortOption>('name-asc');
  const [visibleCount, setVisibleCount] = React.useState<number>(5);
  // Auto-expand filters if initial filters are provided
  const [filtersOpen, setFiltersOpen] = React.useState<boolean>(false);
  
  // Client-side filter state
  const [localFilters, setLocalFilters] = React.useState<{
    department?: string;
    status?: string;
    userCategory?: string;
    workLocation?: string;
    minApps?: number;
    maxApps?: number;
  }>({
    department: filters?.department,
    status: filters?.status,
    userCategory: filters?.userCategory,
    workLocation: filters?.workLocation,
    minApps: filters?.minApps,
    maxApps: filters?.maxApps,
  });

  React.useEffect(() => {
    if (!progressive) return;
    const t1 = setTimeout(() => setStage(1), 150);
    const t2 = setTimeout(() => setStage(2), 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [progressive]);

  React.useEffect(() => {
    setVisibleCount(5);
  }, [users]);

  React.useEffect(() => {
    setVisibleCount(5);
  }, [localFilters, searchQuery]);

  const showHeader = stage >= 1;
  const showList = stage >= 2;

  // Extract unique values for filter options
  const uniqueDepartments = React.useMemo(() => {
    const depts = new Set<string>();
    users.forEach((user) => {
      if (user.department) depts.add(user.department);
    });
    return Array.from(depts).sort();
  }, [users]);

  const uniqueCategories = React.useMemo(() => {
    const cats = new Set<string>();
    users.forEach((user) => {
      if (user.userCategory) cats.add(user.userCategory);
    });
    return Array.from(cats).sort();
  }, [users]);

  const uniqueLocations = React.useMemo(() => {
    const locs = new Set<string>();
    users.forEach((user) => {
      if (user.workLocation) locs.add(user.workLocation);
    });
    return Array.from(locs).sort();
  }, [users]);

  // Client-side filtering and sorting
  const filteredAndSortedUsers = React.useMemo(() => {
    let result = [...users];

    // Apply local filters
    if (localFilters.department) {
      result = result.filter((user) => user.department === localFilters.department);
    }
    if (localFilters.status) {
      result = result.filter((user) => user.status === localFilters.status);
    }
    if (localFilters.userCategory) {
      result = result.filter((user) => user.userCategory === localFilters.userCategory);
    }
    if (localFilters.workLocation) {
      result = result.filter((user) => user.workLocation === localFilters.workLocation);
    }
    if (typeof localFilters.minApps === 'number') {
      result = result.filter((user) => user.provisionedAppsCount >= localFilters.minApps!);
    }
    if (typeof localFilters.maxApps === 'number') {
      result = result.filter((user) => user.provisionedAppsCount <= localFilters.maxApps!);
    }

    // Client-side search (refines server-side search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((user) => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email.toLowerCase();
        const department = (user.department || '').toLowerCase();
        const jobTitle = (user.jobTitle || '').toLowerCase();
        return (
          fullName.includes(query) ||
          email.includes(query) ||
          department.includes(query) ||
          jobTitle.includes(query)
        );
      });
    }

    // Client-side sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'name-desc':
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
        case 'email-asc':
          return a.email.localeCompare(b.email);
        case 'email-desc':
          return b.email.localeCompare(a.email);
        case 'apps-asc':
          return a.provisionedAppsCount - b.provisionedAppsCount;
        case 'apps-desc':
          return b.provisionedAppsCount - a.provisionedAppsCount;
        case 'department-asc':
          return (a.department || '').localeCompare(b.department || '');
        case 'department-desc':
          return (b.department || '').localeCompare(a.department || '');
        default:
          return 0;
      }
    });

    return result;
  }, [users, searchQuery, sortBy, localFilters]);

  // Clear all filters
  const clearFilters = () => {
    setLocalFilters({});
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(localFilters).some((value) => value !== undefined && value !== '');

  const visibleUsers = React.useMemo(() => {
    return filteredAndSortedUsers.slice(0, visibleCount);
  }, [filteredAndSortedUsers, visibleCount]);

  const hasMoreUsers = filteredAndSortedUsers.length > visibleCount;
  const canShowLess = visibleCount > 5;

  // Build filter summary
  const filterSummary = React.useMemo(() => {
    const parts: string[] = [];
    if (filters?.department) parts.push(`Department: ${filters.department}`);
    if (filters?.status) parts.push(`Status: ${filters.status}`);
    if (filters?.userCategory) parts.push(`Category: ${filters.userCategory}`);
    if (filters?.workLocation) parts.push(`Location: ${filters.workLocation}`);
    if (typeof filters?.minApps === 'number') parts.push(`Min Apps: ${filters.minApps}`);
    if (typeof filters?.maxApps === 'number') parts.push(`Max Apps: ${filters.maxApps}`);
    if (filters?.search) parts.push(`Search: "${filters.search}"`);
    return parts.length > 0 ? parts.join(' • ') : null;
  }, [filters]);

  return (
    <Card className="rounded-lg border min-w-sm max-w-4xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {showHeader && (
              <div className="mt-2 space-y-1">
                {totalCount !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    Showing {visibleUsers.length} of {filteredAndSortedUsers.length}{' '}
                    {totalCount !== filteredAndSortedUsers.length ? `(of ${totalCount} total)` : ''} users
                  </p>
                )}
                {showFilters && filterSummary && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filters?.department && (
                      <Badge variant="secondary" className="text-xs">
                        <Building2 className="h-3 w-3 mr-1" />
                        {filters.department}
                      </Badge>
                    )}
                    {filters?.status && (
                      <Badge variant={filters.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                        {filters.status}
                      </Badge>
                    )}
                    {filters?.userCategory && (
                      <Badge variant="outline" className="text-xs">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {filters.userCategory}
                      </Badge>
                    )}
                    {filters?.workLocation && (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {filters.workLocation}
                      </Badge>
                    )}
                    {typeof filters?.minApps === 'number' && (
                      <Badge variant="outline" className="text-xs">
                        Min Apps: {filters.minApps}+
                      </Badge>
                    )}
                    {typeof filters?.maxApps === 'number' && (
                      <Badge variant="outline" className="text-xs">
                        Max Apps: {filters.maxApps}
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
                <div key={i} className="h-16 w-full rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No users found</p>
              {filterSummary && (
                <p className="text-xs mt-1">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <>
              {/* Search and Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, department, or job title..."
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
                    <SelectItem value="email-asc">Email (A-Z)</SelectItem>
                    <SelectItem value="email-desc">Email (Z-A)</SelectItem>
                    <SelectItem value="apps-desc">Most Apps</SelectItem>
                    <SelectItem value="apps-asc">Least Apps</SelectItem>
                    <SelectItem value="department-asc">Department (A-Z)</SelectItem>
                    <SelectItem value="department-desc">Department (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Controls */}
              {showFilters && (
                <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-4">
                  <div className="border rounded-lg bg-muted/30">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Filters</span>
                          {hasActiveFilters && (
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                              {Object.values(localFilters).filter((v) => v !== undefined && v !== '').length}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {hasActiveFilters && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearFilters();
                              }}
                              className="h-7 text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Clear All
                            </Button>
                          )}
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                              filtersOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Department Filter */}
                    {uniqueDepartments.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Department
                        </label>
                        <Select
                          value={localFilters.department || 'all'}
                          onValueChange={(value) =>
                            setLocalFilters((prev) => ({
                              ...prev,
                              department: value === 'all' ? undefined : value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="All departments" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All departments</SelectItem>
                            {uniqueDepartments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Status Filter */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Status</label>
                      <Select
                        value={localFilters.status || 'all'}
                        onValueChange={(value) =>
                          setLocalFilters((prev) => ({
                            ...prev,
                            status: value === 'all' ? undefined : value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Category Filter */}
                    {uniqueCategories.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          Category
                        </label>
                        <Select
                          value={localFilters.userCategory || 'all'}
                          onValueChange={(value) =>
                            setLocalFilters((prev) => ({
                              ...prev,
                              userCategory: value === 'all' ? undefined : value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {uniqueCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Location Filter */}
                    {uniqueLocations.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Location
                        </label>
                        <Select
                          value={localFilters.workLocation || 'all'}
                          onValueChange={(value) =>
                            setLocalFilters((prev) => ({
                              ...prev,
                              workLocation: value === 'all' ? undefined : value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="All locations" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All locations</SelectItem>
                            {uniqueLocations.map((loc) => (
                              <SelectItem key={loc} value={loc}>
                                {loc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Min Apps Filter */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Min Apps</label>
                      <Input
                        type="number"
                        placeholder="Any"
                        value={localFilters.minApps || ''}
                        onChange={(e) =>
                          setLocalFilters((prev) => ({
                            ...prev,
                            minApps: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          }))
                        }
                        className="h-8 text-xs"
                        min="0"
                      />
                    </div>

                    {/* Max Apps Filter */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Max Apps</label>
                      <Input
                        type="number"
                        placeholder="Any"
                        value={localFilters.maxApps || ''}
                        onChange={(e) =>
                          setLocalFilters((prev) => ({
                            ...prev,
                            maxApps: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          }))
                        }
                        className="h-8 text-xs"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Active Filter Badges */}
                  {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {localFilters.department && (
                        <Badge variant="secondary" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          {localFilters.department}
                          <button
                            onClick={() =>
                              setLocalFilters((prev) => ({ ...prev, department: undefined }))
                            }
                            className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {localFilters.status && (
                        <Badge
                          variant={localFilters.status === 'Active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {localFilters.status}
                          <button
                            onClick={() =>
                              setLocalFilters((prev) => ({ ...prev, status: undefined }))
                            }
                            className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {localFilters.userCategory && (
                        <Badge variant="outline" className="text-xs">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {localFilters.userCategory}
                          <button
                            onClick={() =>
                              setLocalFilters((prev) => ({ ...prev, userCategory: undefined }))
                            }
                            className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {localFilters.workLocation && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {localFilters.workLocation}
                          <button
                            onClick={() =>
                              setLocalFilters((prev) => ({ ...prev, workLocation: undefined }))
                            }
                            className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {typeof localFilters.minApps === 'number' && (
                        <Badge variant="outline" className="text-xs">
                          Min: {localFilters.minApps}+
                          <button
                            onClick={() =>
                              setLocalFilters((prev) => ({ ...prev, minApps: undefined }))
                            }
                            className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {typeof localFilters.maxApps === 'number' && (
                        <Badge variant="outline" className="text-xs">
                          Max: {localFilters.maxApps}
                          <button
                            onClick={() =>
                              setLocalFilters((prev) => ({ ...prev, maxApps: undefined }))
                            }
                            className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                    </div>
                  )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

            {/* Results count */}
            {(searchQuery || hasActiveFilters || filteredAndSortedUsers.length !== users.length) && (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <ListFilter className="h-3 w-3" />
                  Showing {visibleUsers.length} of {filteredAndSortedUsers.length}{' '}
                  {filteredAndSortedUsers.length !== users.length ? 'filtered ' : ''}users
                  {totalCount !== undefined && filteredAndSortedUsers.length === users.length && (
                    <span className="opacity-80"> (of {totalCount} total)</span>
                  )}
                </Badge>
                {typeof filters?.minApps === 'number' && (
                  <Badge variant="outline" className="text-xs">
                    Min Apps: {filters.minApps}+
                  </Badge>
                )}
                {typeof filters?.maxApps === 'number' && (
                  <Badge variant="outline" className="text-xs">
                    Max Apps: {filters.maxApps}
                  </Badge>
                )}
                </div>
              )}

              {/* User List */}
              {filteredAndSortedUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No users match your search</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <>
                <div className="space-y-2">
                    {visibleUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-start justify-between p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-medium">
                        {user.firstName} {user.lastName}
                      </div>
                      <Badge
                        variant={user.status === 'Active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {user.status}
                      </Badge>
                      {user.userCategory && (
                        <Badge variant="outline" className="text-xs">
                          {user.userCategory}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </span>
                      {user.department && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {user.department}
                        </span>
                      )}
                      {user.jobTitle && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {user.jobTitle}
                        </span>
                      )}
                      {user.workLocation && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {user.workLocation}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <div className="text-sm font-semibold">{user.provisionedAppsCount}</div>
                    <div className="text-xs text-muted-foreground">apps</div>
                  </div>
                </div>
                  ))}
                </div>

                  {(hasMoreUsers || canShowLess) && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (hasMoreUsers) {
                            setVisibleCount((prev) => Math.min(prev + 5, filteredAndSortedUsers.length));
                          } else {
                            setVisibleCount(5);
                          }
                        }}
                        className="gap-2"
                      >
                        {hasMoreUsers ? (
                          <>
                            Show More ({filteredAndSortedUsers.length - visibleCount} remaining)
                            <ChevronDown className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Show Less
                            <ChevronUp className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )
        ) : (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 w-full rounded bg-muted animate-pulse" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserProfilesList;

