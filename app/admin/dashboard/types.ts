// Statistics type for better type safety
export interface Statistics {
  totalUsers: number;
  totalLibrarians: number;
  totalBooks: number;
  activeLoans: number;
  overdue?: number;
}

// StatisticsResponse type for better type safety
export interface StatisticsResponse {
  success: boolean;
  data: {
    overview: {
      totalUsers: number;
      totalLibrarians: number;
      totalBooks: number;
      activeLoans: number;
      overdue: number;
    };
  };
}

// User type
export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

// System settings type
export interface SystemSettingsState {
  libraryName: string;
  maxBooksPerUser: number;
  loanPeriodDays: number;
  sessionTimeoutMinutes: number;
  passwordPolicy: 'strong' | 'medium' | 'basic';
  twoFactorAuthMode: 'required_admins' | 'optional' | 'disabled';
}