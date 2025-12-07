"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  User,
  LogOut,
  Clock,
  Users,
  BookMarked,
  History,
  Plus,
  Settings,
  BarChart3,
  AlertCircle,
  FileText,
  Activity,
  Bell,
} from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import BookManagement from "../../components/BookManagement";
import StudentManagement from "../../components/StudentManagement";
import TransactionManagement from "../../components/TransactionManagement";
import Profile from "../../components/Profile";
import RecentActivities from "../../components/RecentActivities";
import { getActivities } from "@/lib/activity";
import { toast } from "react-hot-toast";
import LibrarianNotificationPanel from "../../components/LibrarianNotificationPanel";

interface User {
  name: string;
  email: string;
  role: string;
  _id: string;
  userId?: string; // Some responses include userId instead of _id
}

interface Statistics {
  totalBooks: number;
  activeMembers: number;
  booksOut: number;
  overdue: number;
}

interface Book {
  title: string;
  author: string;
  borrowCount: number;
}

interface Category {
  _id: string;
  count: number;
}

interface ActiveUser {
  name: string;
  studentId: string;
  transactionCount: number;
}

interface DailyTransaction {
  _id: string;
  borrows: number;
  returns: number;
}

interface Fines {
  totalFines: number;
  finesPaid: number;
  unpaidFines: number;
}

interface ReportData {
  period?: number;
  overview: {
    totalBooks: number;
    totalUsers: number;
    totalLibrarians: number;
    activeLoans: number;
    overdue: number;
    totalTransactions: number;
    availability: {
      totalCopies: number;
      availableCopies: number;
    };
  };
  trends: {
    daily: DailyTransaction[];
    categories: Category[];
  };
  insights: {
    popularBooks: Book[];
    activeUsers: ActiveUser[];
  };
  finances: {
    fines: Fines;
  };
}

export default function LibrarianDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activities, setActivities] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [statistics, setStatistics] = useState<Statistics>({
    totalBooks: 0,
    activeMembers: 0,
    booksOut: 0,
    overdue: 0,
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const router = useRouter();

  const fetchReports = async (period: string = "30") => {
    try {
      const response = await fetch(`/api/statistics?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReportData({
            ...data.data,
            period: parseInt(period),
          });
        }
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to fetch reports data");
    }
  };

  useEffect(() => {
    const fetchActivities = async () => {
      const activitiesData = await getActivities(10);
      setActivities(activitiesData);
    };

    const fetchStatistics = async () => {
      try {
        const response = await fetch("/api/statistics");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Make sure all expected fields are available
            const newStats = {
              totalBooks: data.data?.overview?.totalBooks || 0,
              activeMembers: data.data?.overview?.totalUsers || 0,
              booksOut: data.data?.overview?.activeLoans || 0,
              overdue: data.data?.overview?.overdue || 0,
            };
            setStatistics(newStats);
          }
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
        // Don't update statistics if there was an error
      }
    };

    fetchActivities();
    fetchStatistics();
    fetchReports("30");

    const activityInterval = setInterval(fetchActivities, 3000);
    const statsInterval = setInterval(fetchStatistics, 30000); // Update stats every 30 seconds
    const reportsInterval = setInterval(() => fetchReports("30"), 60000); // Update reports every minute

    return () => {
      clearInterval(activityInterval);
      clearInterval(statsInterval);
      clearInterval(reportsInterval);
    };
  }, []);

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
  }, []);

  // Fetch unread notification count with progressive enhancement
  useEffect(() => {
    if (user?._id) {
      // Check for cached unread count first
      try {
        const cachedCount = localStorage.getItem(`unread_count_${user._id}`);
        if (cachedCount) {
          const { count, timestamp } = JSON.parse(cachedCount);
          // Use cache if it's less than 5 minutes old
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setUnreadCount(count);
          }
        }
      } catch (error) {
        console.error("Error loading cached notification count:", error);
      }

      // Always fetch fresh count
      fetchUnreadCount();

      // Set up polling interval, but at a lower frequency to reduce API load
      const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user?._id]);

  const fetchUnreadCount = async () => {
    if (!user?._id) return;

    try {
      // Create a timeout promise to limit waiting time (increased to 10 seconds)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 10000)
      );

      // The actual fetch request
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
            `unread_count_${user._id}`,
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

  // Transactions managed in TransactionManagement component now

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <AuthGuard requiredRole="librarian">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-green-600" />
                <h1 className="ml-2 text-xl font-semibold text-gray-900">
                  Library Management System
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-700">{user.name}</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Librarian
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
                      ? "bg-green-100 text-green-700 border-r-2 border-green-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab("books")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "books"
                      ? "bg-green-100 text-green-700 border-r-2 border-green-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <BookMarked className="h-5 w-5" />
                  <span>Manage Books</span>
                </button>
                <button
                  onClick={() => setActiveTab("members")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "members"
                      ? "bg-green-100 text-green-700 border-r-2 border-green-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span>Members</span>
                </button>
                <button
                  onClick={() => setActiveTab("transactions")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "transactions"
                      ? "bg-green-100 text-green-700 border-r-2 border-green-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <History className="h-5 w-5" />
                  <span>Transactions</span>
                </button>
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "reports"
                      ? "bg-green-100 text-green-700 border-r-2 border-green-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Reports</span>
                </button>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "profile"
                      ? "bg-green-100 text-green-700 border-r-2 border-green-600"
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
                        ? "bg-green-100 text-green-700 border-r-2 border-green-600"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5" />
                      <span>Notifications</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
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
                      Library Management Dashboard
                    </p>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <BookMarked className="h-6 w-6 text-blue-600" />
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
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Users className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Active Members
                          </p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {(statistics.activeMembers || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Books Out
                          </p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {(statistics.booksOut || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Overdue
                          </p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {(statistics.overdue || 0).toLocaleString()}
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => setActiveTab("books")}
                        className="flex items-center justify-center space-x-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <Plus className="h-5 w-5 text-blue-600" />
                        <span className="text-blue-700">Add New Book</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("members")}
                        className="flex items-center justify-center space-x-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                      >
                        <Users className="h-5 w-5 text-green-600" />
                        <span className="text-green-700">Register Member</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("transactions")}
                        className="flex items-center justify-center space-x-2 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        <BookMarked className="h-5 w-5 text-purple-600" />
                        <span className="text-purple-700">Process Return</span>
                      </button>
                    </div>
                  </div>

                  {/* Recent Activities Component */}
                  <RecentActivities
                    refreshInterval={30000}
                    maxActivities={15}
                  />
                </div>
              )}

              {activeTab === "books" && (
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
              )}
              {activeTab === "members" && (
                <StudentManagement userRole={user.role} />
              )}
              {activeTab === "transactions" && <TransactionManagement />}

              {activeTab === "reports" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Library Reports & Analytics
                    </h2>
                    <div className="flex space-x-4">
                      <select
                        onChange={(e) => {
                          const period = e.target.value;
                          fetchReports(period);
                        }}
                        defaultValue="30"
                        className="px-3 py-2 border rounded-lg text-gray-700"
                      >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">Last Year</option>
                      </select>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FileText className="h-5 w-5" />
                        <span>Export Report</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Popular Books{" "}
                        {reportData?.period
                          ? `(Last ${reportData.period} Days)`
                          : ""}
                      </h3>
                      <div className="space-y-3">
                        {reportData?.insights?.popularBooks?.map(
                          (book, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                            >
                              <div className="flex-1">
                                <p className="text-sm text-gray-900 truncate">
                                  {book.title}
                                </p>
                                <p className="text-xs text-gray-600">
                                  by {book.author}
                                </p>
                              </div>
                              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                {book.borrowCount} borrows
                              </span>
                            </div>
                          )
                        )}
                        {(!reportData?.insights?.popularBooks ||
                          reportData.insights.popularBooks.length === 0) && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No data available
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Monthly Statistics
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">
                            Active Users
                          </span>
                          <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                            {reportData?.overview?.totalUsers || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">
                            Total Books
                          </span>
                          <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {reportData?.overview?.totalBooks || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">
                            Active Loans
                          </span>
                          <span className="text-sm font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                            {reportData?.overview?.activeLoans || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">
                            Overdue Books
                          </span>
                          <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                            {reportData?.overview?.overdue || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">
                            Fines Collected
                          </span>
                          <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                            $
                            {reportData?.finances?.fines?.finesPaid?.toFixed(
                              2
                            ) || "0.00"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Reports */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Category Statistics
                      </h3>
                      <div className="space-y-3">
                        {reportData?.trends?.categories?.map(
                          (category, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                            >
                              <span className="text-sm text-gray-600">
                                {category._id || "Uncategorized"}
                              </span>
                              <div className="flex space-x-3">
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  {category.count} books
                                </span>
                              </div>
                            </div>
                          )
                        )}
                        {(!reportData?.trends?.categories ||
                          reportData.trends.categories.length === 0) && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No category data available
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Most Active Users
                      </h3>
                      <div className="space-y-3">
                        {reportData?.insights?.activeUsers?.map(
                          (user, index) => (
                            <div
                              key={index}
                              className="p-2 hover:bg-gray-50 rounded"
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                Student ID: {user.studentId}
                              </p>
                              <p className="text-xs text-gray-500">
                                {user.transactionCount} transactions
                              </p>
                            </div>
                          )
                        )}
                        {(!reportData?.insights?.activeUsers ||
                          reportData.insights.activeUsers.length === 0) && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No active user data available
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Daily Transaction Trends */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Daily Transaction Trends
                    </h3>
                    <div className="space-y-3">
                      {reportData?.trends?.daily?.map((day, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                        >
                          <span className="text-sm text-gray-600">
                            {new Date(day._id).toLocaleDateString()}
                          </span>
                          <div className="flex space-x-3">
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              {day.borrows} borrows
                            </span>
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {day.returns} returns
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!reportData?.trends?.daily ||
                        reportData.trends.daily.length === 0) && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No transaction trend data available
                        </p>
                      )}
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
      </div>

      {/* Librarian Notification Panel */}
      {(user._id || user.userId) && (
        <LibrarianNotificationPanel
          userId={user._id || user.userId || ""}
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </AuthGuard>
  );
}
