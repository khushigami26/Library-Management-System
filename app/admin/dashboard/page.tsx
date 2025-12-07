"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  BookOpen,
  Search,
  User,
  LogOut,
  Clock,
  Users,
  BookMarked,
  Plus,
  Settings as SettingsIcon,
  BarChart3,
  AlertCircle,
  Shield,
  Database,
  Activity,
  FileText,
  Bell,
} from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import Profile from "../../components/Profile";
import { getActivities } from "@/lib/activity";

// Lazy load components that aren't needed immediately
const BookManagement = lazy(() => import("../../components/BookManagement"));
const StudentManagement = lazy(
  () => import("../../components/StudentManagement")
);
const LibrarianManagement = lazy(
  () => import("../../components/LibrarianManagement")
);
const AdminNotificationPanel = lazy(
  () => import("../../components/AdminNotificationPanel")
);
const RecentActivities = lazy(
  () => import("../../components/RecentActivities")
);

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Statistics {
  totalUsers: number;
  totalLibrarians: number;
  totalBooks: number;
  activeLoans: number;
  overdue?: number;
}

interface SystemSettingsState {
  libraryName: string;
  maxBooksPerUser: number;
  loanPeriodDays: number;
  sessionTimeoutMinutes: number;
  passwordPolicy: "strong" | "medium" | "basic";
  twoFactorAuthMode: "required_admins" | "optional" | "disabled";
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activities, setActivities] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [statistics, setStatistics] = useState<Statistics>({
    totalUsers: 0,
    totalLibrarians: 0,
    totalBooks: 0,
    activeLoans: 0,
  });
  const [settings, setSettings] = useState<SystemSettingsState | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const router = useRouter();

  // Initialize user from localStorage immediately
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Normalize user object - ensure _id and userId are set
        if (!parsedUser._id && parsedUser.userId) {
          parsedUser._id = parsedUser.userId;
        }
        if (!parsedUser.userId && parsedUser._id) {
          parsedUser.userId = parsedUser._id;
        }
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    // Also verify and refresh user data from API
    const verifyUser = async () => {
      try {
        const response = await fetch("/api/auth/verify");
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            // Normalize user object
            const normalizedUser = {
              ...data.user,
              _id: data.user._id || data.user.userId,
              userId: data.user.userId || data.user._id,
            };
            setUser(normalizedUser);
            localStorage.setItem("user", JSON.stringify(normalizedUser));
          }
        }
      } catch (error) {
        console.error("Error verifying user:", error);
      }
    };

    verifyUser();

    // Try to load cached statistics first for immediate display
    try {
      const cachedStats = localStorage.getItem("admin_statistics_cache");
      if (cachedStats) {
        const { statistics: cachedStatistics, timestamp } =
          JSON.parse(cachedStats);
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          // 5 minute cache
          setStatistics(cachedStatistics);
        }
      }
    } catch (error) {
      console.error("Error loading cached statistics:", error);
    }

    // Fetch fresh data with slight delays for better loading experience
    const timer1 = setTimeout(() => fetchStatistics(), 100);
    const timer2 = setTimeout(() => fetchActivities(), 300);
    const timer3 = setTimeout(() => fetchSettings(), 300);

    // Set up polling intervals with reduced frequency to minimize API load
    const activityInterval = setInterval(fetchActivities, 10000); // 10 seconds
    const statsInterval = setInterval(fetchStatistics, 60000); // 60 seconds

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearInterval(activityInterval);
      clearInterval(statsInterval);
    };
  }, []);

  // Fetch unread notification count with progressive enhancement
  useEffect(() => {
    if (user?._id) {
      // Check for cached unread count first
      try {
        const cachedCount = localStorage.getItem(
          `admin_unread_count_${user._id}`
        );
        if (cachedCount) {
          const { count, timestamp } = JSON.parse(cachedCount);
          // Use cache if it's less than 2 minutes old
          if (Date.now() - timestamp < 2 * 60 * 1000) {
            setUnreadCount(count);
          }
        }
      } catch (error) {
        console.error("Error loading cached notification count:", error);
      }

      // Fetch fresh count with slight delay
      setTimeout(() => fetchUnreadCount(), 500);

      // Set up polling interval with reduced frequency
      const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user?._id]);

  const fetchActivities = async () => {
    try {
      const activities = await getActivities();
      setActivities(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      // Silently fail - keep showing existing activities
    }
  };

  const fetchStatistics = async () => {
    // Try to load cached statistics first
    try {
      const cachedStats = localStorage.getItem("admin_statistics_cache");
      if (cachedStats) {
        const { statistics: cachedStatistics, timestamp } =
          JSON.parse(cachedStats);
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          // 5 minute cache
          setStatistics(cachedStatistics);
        }
      }
    } catch (error) {
      console.error("Error loading cached statistics:", error);
    }

    // Then fetch fresh data with timeout and retry
    try {
      let attempts = 0;
      const maxAttempts = 3;
      const baseTimeout = 5000;

      while (attempts < maxAttempts) {
        try {
          const timeoutMs = baseTimeout * Math.pow(1.5, attempts);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
          );

          const fetchPromise = fetch("/api/statistics");

          const response = (await Promise.race([
            fetchPromise,
            timeoutPromise,
          ])) as Response;

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              const newStats = {
                totalUsers: data.data?.overview?.totalUsers || 0,
                totalLibrarians: data.data?.overview?.totalLibrarians || 0,
                totalBooks: data.data?.overview?.totalBooks || 0,
                activeLoans: data.data?.overview?.activeLoans || 0,
                overdue: data.data?.overview?.overdue || 0,
              };
              setStatistics(newStats);

              // Cache the statistics
              try {
                localStorage.setItem(
                  "admin_statistics_cache",
                  JSON.stringify({
                    statistics: newStats,
                    timestamp: Date.now(),
                  })
                );
              } catch (error) {
                console.error("Error caching statistics:", error);
              }
              return; // Exit after successful fetch
            }
          }
          throw new Error(`Invalid response: ${response.status}`);
        } catch (error) {
          attempts++;
          if (attempts === maxAttempts) {
            throw error;
          }
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, attempts))
          );
        }
      }
      throw new Error("Failed to fetch statistics after all attempts");
    } catch (error) {
      console.error("Error fetching statistics:", error);
      toast.error(
        error instanceof Error && error.message.includes("timed out")
          ? "Statistics are taking longer than usual to load. Using cached data."
          : "Could not fetch latest statistics. Using cached data."
      );

      // Try to use cached data as fallback
      try {
        const cachedStats = localStorage.getItem("admin_statistics_cache");
        if (cachedStats) {
          const { statistics: cachedStatistics } = JSON.parse(cachedStats);
          setStatistics(cachedStatistics);
        }
      } catch (cacheError) {
        console.error("Error loading cached statistics:", cacheError);
      }
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings({
            libraryName: data.settings.libraryName || "University Library",
            maxBooksPerUser: data.settings.maxBooksPerUser ?? 5,
            loanPeriodDays: data.settings.loanPeriodDays ?? 14,
            sessionTimeoutMinutes: data.settings.sessionTimeoutMinutes ?? 30,
            passwordPolicy: data.settings.passwordPolicy || "strong",
            twoFactorAuthMode:
              data.settings.twoFactorAuthMode || "required_admins",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("System settings saved");
        setSettings({
          libraryName: data.settings.libraryName,
          maxBooksPerUser: data.settings.maxBooksPerUser,
          loanPeriodDays: data.settings.loanPeriodDays,
          sessionTimeoutMinutes: data.settings.sessionTimeoutMinutes,
          passwordPolicy: data.settings.passwordPolicy,
          twoFactorAuthMode: data.settings.twoFactorAuthMode,
        });
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user?._id) return;

    try {
      // Use timeout protection with longer timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out")), 10000);
      });

      const fetchPromise = fetch(
        `/api/notifications?userId=${user._id}&unreadOnly=true`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Race between timeout and fetch
      const response = (await Promise.race([
        fetchPromise,
        timeoutPromise,
      ])) as Response;

      if (response.ok) {
        const data = await response.json();
        const count = data.notifications.length;
        setUnreadCount(count);

        // Cache the count in localStorage with timestamp
        try {
          localStorage.setItem(
            `admin_unread_count_${user._id}`,
            JSON.stringify({
              count,
              timestamp: Date.now(),
            })
          );
        } catch (error) {
          console.error("Error caching notification count:", error);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Request timed out") {
        console.warn("Notification count fetch timed out - using cached data");
      } else {
        console.error("Error fetching unread count:", error);
      }
      // Silently fail - keep using the last known count
    }
  };

  const handleLogout = async () => {
    try {
      // Call the API to clear the cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Clear localStorage
      localStorage.removeItem("user");

      // Redirect to home page
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear localStorage and redirect even if API call fails
      localStorage.removeItem("user");
      router.push("/");
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-red-600" />
                <h1 className="ml-2 text-xl font-semibold text-gray-900">
                  Library Management System - Admin
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-700">{user.name}</span>
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                    Administrator
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "dashboard"
                      ? "bg-red-100 text-red-700 border-r-2 border-red-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "users"
                      ? "bg-red-100 text-red-700 border-r-2 border-red-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span>User Management</span>
                </button>
                <button
                  onClick={() => setActiveTab("books")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "books"
                      ? "bg-red-100 text-red-700 border-r-2 border-red-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <BookOpen className="h-5 w-5" />
                  <span>Book Management</span>
                </button>
                <button
                  onClick={() => setActiveTab("librarians")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "librarians"
                      ? "bg-red-100 text-red-700 border-r-2 border-red-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Shield className="h-5 w-5" />
                  <span>Librarian Management</span>
                </button>
                <button
                  onClick={() => setActiveTab("system")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "system"
                      ? "bg-red-100 text-red-700 border-r-2 border-red-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <SettingsIcon className="h-5 w-5" />
                  <span>System Settings</span>
                </button>
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "reports"
                      ? "bg-red-100 text-red-700 border-r-2 border-red-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                  <span>System Reports</span>
                </button>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "profile"
                      ? "bg-red-100 text-red-700 border-r-2 border-red-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </button>

                {/* Notifications Section */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowNotifications(true)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                      showNotifications
                        ? "bg-red-100 text-red-700 border-r-2 border-red-600"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5" />
                      <span>Notifications</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              </nav>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Welcome back, {user.name}!
                    </h2>
                    <p className="text-gray-600">
                      System Administration Dashboard
                    </p>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Total Users
                          </p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {(statistics.totalUsers || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Shield className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Librarians
                          </p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {(statistics.totalLibrarians || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <BookMarked className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Total Books
                          </p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {(statistics.totalBooks || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Activity className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Active Loans
                          </p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {(statistics.activeLoans || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <button
                        onClick={() => setActiveTab("users")}
                        className="flex items-center justify-center space-x-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <Users className="h-5 w-5 text-blue-600" />
                        <span className="text-blue-700">Manage Students</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("librarians")}
                        className="flex items-center justify-center space-x-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                      >
                        <Shield className="h-5 w-5 text-green-600" />
                        <span className="text-blue-700">Manage Librarians</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("books")}
                        className="flex items-center justify-center space-x-2 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        <BookOpen className="h-5 w-5 text-purple-600" />
                        <span className="text-purple-700">Manage Books</span>
                      </button>
                    </div>
                  </div>

                  {/* Recent Activities Component */}
                  <Suspense
                    fallback={
                      <div className="bg-white p-6 rounded-lg shadow-sm border animate-pulse h-64"></div>
                    }
                  >
                    <RecentActivities
                      refreshInterval={30000}
                      maxActivities={20}
                    />
                  </Suspense>

                  {/* System Status */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      System Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Database Status
                          </span>
                          <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Online
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Server Status
                          </span>
                          <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Running
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Last Backup
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            2 hours ago
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Active Sessions
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            45
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            System Load
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            23%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Memory Usage
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            67%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "users" && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                    </div>
                  }
                >
                  <StudentManagement userRole={user.role} />
                </Suspense>
              )}

              {activeTab === "books" && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                    </div>
                  }
                >
                  <BookManagement
                    userRole={user.role}
                    onBookChange={() => {
                      // This will trigger a refresh in student panels
                      // The student panels already refresh every 30 seconds
                      toast.success(
                        "Book changes will be visible to students shortly"
                      );
                    }}
                  />
                </Suspense>
              )}

              {activeTab === "librarians" && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                    </div>
                  }
                >
                  <LibrarianManagement userRole={user.role} />
                </Suspense>
              )}

              {activeTab === "system" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      System Settings
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        General Settings
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Library Name
                          </label>
                          <input
                            type="text"
                            value={settings?.libraryName ?? ""}
                            onChange={(e) =>
                              setSettings((prev) =>
                                prev
                                  ? { ...prev, libraryName: e.target.value }
                                  : prev
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Books Per User
                          </label>
                          <input
                            type="number"
                            value={settings?.maxBooksPerUser ?? 0}
                            onChange={(e) =>
                              setSettings((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      maxBooksPerUser: Number(e.target.value),
                                    }
                                  : prev
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Loan Period (days)
                          </label>
                          <input
                            type="number"
                            value={settings?.loanPeriodDays ?? 0}
                            onChange={(e) =>
                              setSettings((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      loanPeriodDays: Number(e.target.value),
                                    }
                                  : prev
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Security Settings
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Session Timeout (minutes)
                          </label>
                          <input
                            type="number"
                            value={settings?.sessionTimeoutMinutes ?? 0}
                            onChange={(e) =>
                              setSettings((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      sessionTimeoutMinutes: Number(
                                        e.target.value
                                      ),
                                    }
                                  : prev
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password Policy
                          </label>
                          <select
                            value={settings?.passwordPolicy ?? "strong"}
                            onChange={(e) =>
                              setSettings((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      passwordPolicy: e.target.value as any,
                                    }
                                  : prev
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          >
                            <option value="strong">
                              Strong (8+ chars, symbols, numbers)
                            </option>
                            <option value="medium">Medium (6+ chars)</option>
                            <option value="basic">Basic (4+ chars)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Two-Factor Authentication
                          </label>
                          <select
                            value={
                              settings?.twoFactorAuthMode ?? "required_admins"
                            }
                            onChange={(e) =>
                              setSettings((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      twoFactorAuthMode: e.target.value as any,
                                    }
                                  : prev
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          >
                            <option value="required_admins">
                              Required for Admins
                            </option>
                            <option value="optional">Optional</option>
                            <option value="disabled">Disabled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Backup & Maintenance
                      </h3>
                      <button
                        onClick={saveSettings}
                        disabled={savingSettings}
                        className={`bg-red-600 text-white px-4 py-2 rounded-lg transition-colors ${
                          savingSettings
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:bg-red-700"
                        }`}
                      >
                        {savingSettings ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "reports" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      System Reports
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        User & Books
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Total Students
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {(statistics.totalUsers || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Total Librarians
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {(statistics.totalLibrarians || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Total Books
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {(statistics.totalBooks || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Active Loans
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {(statistics.activeLoans || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Overdue</span>
                          <span className="text-sm font-medium text-gray-900">
                            {(statistics.overdue || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Realtime Snapshot
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Last Updated
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {new Date().toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Polling</span>
                          <span className="text-sm font-medium text-gray-900">
                            Every 60s
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Recent System Events
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            System backup completed successfully
                          </p>
                          <p className="text-xs text-gray-500">2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Users className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            New librarian account created
                          </p>
                          <p className="text-xs text-gray-500">4 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            High memory usage detected
                          </p>
                          <p className="text-xs text-gray-500">6 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "profile" && (
                <Profile
                  user={user}
                  onProfileUpdate={(updatedUser) => setUser(updatedUser)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Admin Notification Panel - Lazy loaded */}
        {user._id && showNotifications && (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200">
                  <p className="text-center">Loading notifications...</p>
                  <div className="flex justify-center mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                </div>
              </div>
            }
          >
            <AdminNotificationPanel
              userId={user._id}
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </Suspense>
        )}
      </div>
    </AuthGuard>
  );
}
