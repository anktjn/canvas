export type UserProfile = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  status: 'Active' | 'Inactive';
  user_category: 'Full-time' | 'Contractor' | 'External' | '';
  email: string;
  department: string | null;
  job_title: string | null;
  start_date: string | null;
  end_date: string | null;
  additional_information: string | null;
  work_location_code: string | null;
  username: string | null;
  personal_email: string | null;
  role: string | null;
  provisioned_apps_count: number;
  created_at: string;
  updated_at: string;
};

export type FetchUserProfilesInput = {
  department?: string;
  status?: 'Active' | 'Inactive';
  userCategory?: 'Full-time' | 'Contractor' | 'External' | '';
  workLocation?: string;
  limit?: number;
  offset?: number;
  search?: string;
};

export type UserProfilesResponse = {
  data?: UserProfile[];
  error?: string;
  count?: number;
};

/**
 * Fetch user profiles from the API
 * Uses the internal API route which queries Supabase
 */
export async function fetchUserProfiles(
  input: FetchUserProfilesInput = {}
): Promise<UserProfilesResponse> {
  try {
    const params = new URLSearchParams();
    
    if (input.department) params.set('department', input.department);
    if (input.status) params.set('status', input.status);
    if (input.userCategory) params.set('user_category', input.userCategory);
    if (input.workLocation) params.set('work_location', input.workLocation);
    if (input.limit) params.set('limit', String(input.limit));
    if (input.offset) params.set('offset', String(input.offset));
    if (input.search) params.set('search', input.search);

    const url = `/api/user-profiles?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}` };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get user profile statistics for dashboard cards
 */
export type UserProfileStats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  byDepartment: Array<{ department: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  byLocation: Array<{ location: string; count: number }>;
  averageProvisionedApps: number;
};

export async function fetchUserProfileStats(): Promise<{ data?: UserProfileStats; error?: string }> {
  try {
    // Fetch all user profiles for statistics
    const response = await fetchUserProfiles({ limit: 1000 });
    
    if (response.error || !response.data) {
      return { error: response.error || 'Failed to fetch user data' };
    }

    const users = response.data;
    
    // Calculate statistics
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'Active').length;
    const inactiveUsers = totalUsers - activeUsers;
    
    // Department breakdown
    const departmentCounts = users.reduce((acc, user) => {
      const dept = user.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byDepartment = Object.entries(departmentCounts)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);
    
    // Category breakdown
    const categoryCounts = users.reduce((acc, user) => {
      const category = user.user_category || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byCategory = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    
    // Location breakdown
    const locationCounts = users.reduce((acc, user) => {
      const location = user.work_location_code || 'Unknown';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byLocation = Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
    
    // Average provisioned apps
    const totalApps = users.reduce((sum, user) => sum + user.provisioned_apps_count, 0);
    const averageProvisionedApps = totalUsers > 0 ? Math.round((totalApps / totalUsers) * 10) / 10 : 0;
    
    const stats: UserProfileStats = {
      totalUsers,
      activeUsers,
      inactiveUsers,
      byDepartment,
      byCategory,
      byLocation,
      averageProvisionedApps,
    };
    
    return { data: stats };
    
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
