"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, Building2, Briefcase, Mail, ArrowUpDown, Filter, X, ChevronDown } from 'lucide-react';

export type UserProfileItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'Active' | 'Inactive';
  userCategory: string;
  department: string | null;
  jobTitle: string | null;
  provisionedAppsCount: number;
};

export type UserProfilesCardProps = {
  title?: string;
  organizationName?: string;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  byDepartment?: Array<{ department: string; count: number }>;
  byCategory?: Array<{ category: string; count: number }>;
  topUsers?: UserProfileItem[];
  averageProvisionedApps?: number;
  lastUpdatedIso?: string;
  /**
   * When true, renders loading placeholders
   */
  isLoading?: boolean;
  /**
   * When true, the card reveals sections progressively
   */
  progressive?: boolean;
};

export const UserProfilesCard: React.FC<UserProfilesCardProps> = ({
  title = 'User Profiles Overview',
  organizationName,
  totalUsers,
  activeUsers,
  inactiveUsers,
  byDepartment = [],
  byCategory = [],
  topUsers = [],
  averageProvisionedApps = 0,
  lastUpdatedIso,
  isLoading = false,
  progressive = false,
}) => {
  const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const lastUpdated = lastUpdatedIso ? new Date(lastUpdatedIso).toLocaleString() : undefined;

  // Staged reveal when progressive=true
  const [stage, setStage] = React.useState<number>(progressive ? 0 : 4);
  React.useEffect(() => {
    if (!progressive) return;
    const t1 = setTimeout(() => setStage(1), 150);
    const t2 = setTimeout(() => setStage(2), 350);
    const t3 = setTimeout(() => setStage(3), 550);
    const t4 = setTimeout(() => setStage(4), 750);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [progressive]);

  const showStats = stage >= 1;
  const showBreakdown = stage >= 2;
  const showTopUsers = stage >= 3;
  const showFooter = stage >= 4;

  // Sort options for top users
  type UserSortOption = 'apps-desc' | 'apps-asc' | 'name-asc' | 'name-desc';
  const [userSortBy, setUserSortBy] = React.useState<UserSortOption>('apps-desc');
  // Start collapsed by default
  const [userFiltersOpen, setUserFiltersOpen] = React.useState<boolean>(false);

  // Filter state for top users
  const [userFilters, setUserFilters] = React.useState<{
    department?: string;
    status?: string;
    userCategory?: string;
    minApps?: number;
  }>({});

  // Extract unique values for filter options
  const uniqueDepartments = React.useMemo(() => {
    const depts = new Set<string>();
    topUsers.forEach((user) => {
      if (user.department) depts.add(user.department);
    });
    return Array.from(depts).sort();
  }, [topUsers]);

  const uniqueCategories = React.useMemo(() => {
    const cats = new Set<string>();
    topUsers.forEach((user) => {
      if (user.userCategory) cats.add(user.userCategory);
    });
    return Array.from(cats).sort();
  }, [topUsers]);

  // Filter and sort top users based on selection
  const filteredAndSortedTopUsers = React.useMemo(() => {
    if (!topUsers || topUsers.length === 0) return [];
    let filtered = [...topUsers];

    // Apply filters
    if (userFilters.department) {
      filtered = filtered.filter((user) => user.department === userFilters.department);
    }
    if (userFilters.status) {
      filtered = filtered.filter((user) => user.status === userFilters.status);
    }
    if (userFilters.userCategory) {
      filtered = filtered.filter((user) => user.userCategory === userFilters.userCategory);
    }
    if (typeof userFilters.minApps === 'number') {
      filtered = filtered.filter((user) => user.provisionedAppsCount >= userFilters.minApps!);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (userSortBy) {
        case 'apps-desc':
          return b.provisionedAppsCount - a.provisionedAppsCount;
        case 'apps-asc':
          return a.provisionedAppsCount - b.provisionedAppsCount;
        case 'name-asc':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'name-desc':
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
        default:
          return 0;
      }
    });
    return filtered;
  }, [topUsers, userSortBy, userFilters]);

  // Check if any filters are active
  const hasActiveUserFilters = Object.values(userFilters).some((value) => value !== undefined && value !== '');

  // Clear user filters
  const clearUserFilters = () => {
    setUserFilters({});
  };

  return (
    <Card className="rounded-lg border min-w-sm max-w-2xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {title}
              {organizationName && <span className="text-muted-foreground font-normal"> · {organizationName}</span>}
            </CardTitle>
            {showFooter && lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">Last updated: {lastUpdated}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        {showStats ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Total Users</div>
              {isLoading ? (
                <div className="h-8 w-16 rounded bg-muted animate-pulse" />
              ) : (
                <div className="text-2xl font-bold">{totalUsers}</div>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Active</div>
              {isLoading ? (
                <div className="h-8 w-16 rounded bg-muted animate-pulse" />
              ) : (
                <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Inactive</div>
              {isLoading ? (
                <div className="h-8 w-16 rounded bg-muted animate-pulse" />
              ) : (
                <div className="text-2xl font-bold text-gray-500">{inactiveUsers}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-8 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Department Breakdown */}
        {showBreakdown && byDepartment.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Top Departments
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-6 w-full rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {byDepartment.slice(0, 5).map((dept) => (
                  <Badge key={dept.department} variant="secondary" className="text-xs">
                    {dept.department}: {dept.count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Breakdown */}
        {showBreakdown && byCategory.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              User Categories
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-6 w-full rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {byCategory.map((cat) => (
                  <Badge key={cat.category} variant="outline" className="text-xs">
                    {cat.category}: {cat.count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Top Users */}
        {showTopUsers && topUsers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Top Users by App Count
              </div>
              <div className="flex items-center gap-2">
                {topUsers.length > 1 && (
                  <Select value={userSortBy} onValueChange={(value) => setUserSortBy(value as UserSortOption)}>
                    <SelectTrigger className="h-8 text-xs w-[140px]">
                      <ArrowUpDown className="h-3 w-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apps-desc">Most Apps</SelectItem>
                      <SelectItem value="apps-asc">Least Apps</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Filter Controls for Top Users */}
            {(uniqueDepartments.length > 0 || uniqueCategories.length > 0) && (
              <Collapsible open={userFiltersOpen} onOpenChange={setUserFiltersOpen}>
                <div className="border rounded-md bg-muted/20">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <Filter className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">Filter users</span>
                        {hasActiveUserFilters && (
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">
                            {Object.values(userFilters).filter((v) => v !== undefined && v !== '').length}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasActiveUserFilters && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearUserFilters();
                            }}
                            className="h-6 text-xs px-2"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        )}
                        <ChevronDown
                          className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
                            userFiltersOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2 border-t">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Department Filter */}
                  {uniqueDepartments.length > 0 && (
                    <Select
                      value={userFilters.department || 'all'}
                      onValueChange={(value) =>
                        setUserFilters((prev) => ({
                          ...prev,
                          department: value === 'all' ? undefined : value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="All depts" />
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
                  )}

                  {/* Status Filter */}
                  <Select
                    value={userFilters.status || 'all'}
                    onValueChange={(value) =>
                      setUserFilters((prev) => ({
                        ...prev,
                        status: value === 'all' ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Category Filter */}
                  {uniqueCategories.length > 0 && (
                    <Select
                      value={userFilters.userCategory || 'all'}
                      onValueChange={(value) =>
                        setUserFilters((prev) => ({
                          ...prev,
                          userCategory: value === 'all' ? undefined : value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
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
                  )}

                  {/* Min Apps Filter */}
                  <Select
                    value={userFilters.minApps?.toString() || 'all'}
                    onValueChange={(value) =>
                      setUserFilters((prev) => ({
                        ...prev,
                        minApps: value === 'all' ? undefined : parseInt(value, 10),
                      }))
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Min apps" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any apps</SelectItem>
                      <SelectItem value="5">5+ apps</SelectItem>
                      <SelectItem value="10">10+ apps</SelectItem>
                      <SelectItem value="15">15+ apps</SelectItem>
                      <SelectItem value="20">20+ apps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Filter Badges */}
                {hasActiveUserFilters && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                    {userFilters.department && (
                      <Badge variant="secondary" className="text-xs h-5">
                        <Building2 className="h-2.5 w-2.5 mr-1" />
                        {userFilters.department}
                        <button
                          onClick={() =>
                            setUserFilters((prev) => ({ ...prev, department: undefined }))
                          }
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    )}
                    {userFilters.status && (
                      <Badge
                        variant={userFilters.status === 'Active' ? 'default' : 'secondary'}
                        className="text-xs h-5"
                      >
                        {userFilters.status}
                        <button
                          onClick={() =>
                            setUserFilters((prev) => ({ ...prev, status: undefined }))
                          }
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    )}
                    {userFilters.userCategory && (
                      <Badge variant="outline" className="text-xs h-5">
                        <Briefcase className="h-2.5 w-2.5 mr-1" />
                        {userFilters.userCategory}
                        <button
                          onClick={() =>
                            setUserFilters((prev) => ({ ...prev, userCategory: undefined }))
                          }
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    )}
                    {typeof userFilters.minApps === 'number' && (
                      <Badge variant="outline" className="text-xs h-5">
                        {userFilters.minApps}+ apps
                        <button
                          onClick={() =>
                            setUserFilters((prev) => ({ ...prev, minApps: undefined }))
                          }
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
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
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 w-full rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAndSortedTopUsers.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No users match the selected filters
                  </div>
                ) : (
                  filteredAndSortedTopUsers.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                          {user.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
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
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm font-semibold">{user.provisionedAppsCount}</div>
                      <div className="text-xs text-muted-foreground">apps</div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Average Apps */}
        {showFooter && averageProvisionedApps > 0 && (
          <div className="pt-2 border-t text-sm text-muted-foreground">
            Average provisioned apps per user: <span className="font-semibold text-foreground">{averageProvisionedApps}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserProfilesCard;

