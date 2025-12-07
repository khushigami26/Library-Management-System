"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  User,
  LogOut,
  Clock,
  Calendar,
  BookMarked,
  History,
  Bell,
  DollarSign
} from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import Profile from "../../components/Profile";
import { toast } from "react-hot-toast";
import { addActivity } from "@/lib/activity";

// Lazy load components that aren't needed immediately
const BookOperations = lazy(() => import("../../components/BookOperations"));
const StudentNotificationPanel = lazy(() => import("../../components/StudentNotificationPanel"));

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  studentId: string;
  department: string;
}

export default function StudentDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
  const [books, setBooks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFinePayment, setShowFinePayment] = useState<string | null>(null);
  const router = useRouter();

  // Initialize user from localStorage immediately
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Use _id as the primary identifier
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    
    // Also verify and refresh user data from API
    const verifyUser = async () => {
      try {
        const response = await fetch('/api/auth/verify');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            // Use user object as is with _id as primary identifier
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
          }
        }
      } catch (error) {
        console.error('Error verifying user:', error);
      }
    };
    
    verifyUser();
  }, []);

  // Fetch unread notification count with progressive enhancement
  useEffect(() => {
    const effectiveUserId = user?._id;
    if (effectiveUserId) {
      // Check for cached unread count first
      try {
        const cachedCount = localStorage.getItem(`unread_count_${effectiveUserId}`);
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

  // Fetch transactions when user is available and on relevant tabs
  useEffect(() => {
    const effectiveUserId = user?._id || (() => {
      try {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        return currentUser._id;
      } catch {
        return null;
      }
    })();

    if (effectiveUserId) {
      // Fetch transactions immediately for borrowed, history, fines, and dashboard tabs
      if (activeTab === "borrowed" || activeTab === "history" || activeTab === "fines" || activeTab === "dashboard") {
        // Small delay to ensure state is ready
        const timer = setTimeout(() => {
          fetchTransactions();
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [user?._id, activeTab]);

  // Set up polling for real-time updates (every 30 seconds)
  useEffect(() => {
    const effectiveUserId = user?._id || (() => {
      try {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        return currentUser._id;
      } catch {
        return null;
      }
    })();
    
    if (effectiveUserId && (activeTab === "borrowed" || activeTab === "history" || activeTab === "fines" || activeTab === "dashboard")) {
      const interval = setInterval(() => {
        fetchTransactions();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?._id, activeTab]);

  const fetchUnreadCount = async () => {
    const effectiveUserId = user?._id;
    if (!effectiveUserId) return;
    
    try {
      // Create a timeout promise to limit waiting time
      const timeoutPromise: Promise<Response> = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 3000)
      );
      
      // The actual fetch request
      const fetchPromise = fetch(`/api/notifications?userId=${effectiveUserId}&unreadOnly=true`);
      
      // Race between timeout and fetch
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (response.ok) {
        const data = await response.json();
        const count = data.notifications.length;
        setUnreadCount(count);
        
        // Cache the count in localStorage with timestamp
        try {
          localStorage.setItem(`unread_count_${effectiveUserId}`, JSON.stringify({
            count,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('Error caching notification count:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // Silently fail - keep using the last known count
    }
  };

  const fetchTransactions = async () => {
    // Get userId from user object or localStorage
    const effectiveUserId = user?._id || (() => {
      try {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        return currentUser._id;
      } catch {
        return null;
      }
    })();
    
    if (!effectiveUserId || isLoading) return;
    
    setIsLoading(true);
    try {
      const timeoutPromise: Promise<Response> = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 5000)
      );
      
      const fetchPromise = fetch(`/api/transactions?userId=${effectiveUserId}`);
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.transactions) {
          setTransactions(data.transactions);
          
          // Cache transactions
          try {
            localStorage.setItem(`student_transactions_${effectiveUserId}`, JSON.stringify({
              transactions: data.transactions,
              timestamp: Date.now()
            }));
          } catch (error) {
            console.error('Error caching transactions:', error);
          }
        }
      } else {
        console.error('Failed to fetch transactions:', response.status);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Try to use cached data
      try {
        const cached = localStorage.getItem(`student_transactions_${effectiveUserId}`);
        if (cached) {
          const { transactions: cachedTx } = JSON.parse(cached);
          setTransactions(cachedTx);
        }
      } catch (e) {
        console.error('Error loading cached transactions:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Call the API to clear the cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Clear localStorage
      localStorage.removeItem("user");
      
      // Redirect to home page
      router.push("/");
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear localStorage and redirect even if API call fails
      localStorage.removeItem("user");
      router.push("/");
    }
  };

  const handleReturnBook = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'return',
          returnDate: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.transaction) {
          await fetchTransactions();
          
          const tx = transactions.find(t => t._id === transactionId);
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          
          if (tx) {
            await addActivity("Book returned", `${tx.bookTitle} returned by ${currentUser.email || "student"}${data.transaction.fineAmount > 0 ? ` (fine $${data.transaction.fineAmount.toFixed(2)})` : ""}`, "student", currentUser.name);

            if (currentUser._id || currentUser.userId) {
              try {
                const message = data.transaction.fineAmount > 0 
                  ? `You have successfully returned "${tx.bookTitle}". Fine amount: $${data.transaction.fineAmount.toFixed(2)}.`
                  : `You have successfully returned "${tx.bookTitle}". Thank you for returning it on time!`;
                
                await fetch('/api/notifications', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId: currentUser._id || currentUser.userId,
                    type: 'return_confirmation',
                    title: 'Book Returned Successfully',
                    message,
                    bookTitle: tx.bookTitle,
                    fineAmount: data.transaction.fineAmount || 0,
                    priority: data.transaction.fineAmount > 0 ? 'high' : 'low',
                    actionRequired: data.transaction.fineAmount > 0,
                    actionUrl: data.transaction.fineAmount > 0 ? '/student/dashboard?tab=fines' : undefined
                  }),
                });
              } catch (error) {
                console.error('Error creating return notification:', error);
              }
            }
          }

          if (data.transaction.fineAmount > 0) {
            toast.error(`Book returned. You have a fine of $${data.transaction.fineAmount.toFixed(2)} for late return.`);
          } else {
            toast.success("Book returned successfully!");
          }
          
          // Refresh notifications immediately
          setTimeout(() => {
            fetchUnreadCount();
            // Force notification panel to refresh if open
            setNotificationRefreshKey(prev => prev + 1);
          }, 500);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to return book');
      }
    } catch (error) {
      console.error('Error returning book:', error);
      toast.error('Failed to return book. Please try again.');
    }
  };

  const handleRenew = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'renew',
          renewDays: 14
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.transaction) {
          await fetchTransactions();
          
          const tx = transactions.find(t => t._id === transactionId);
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          
          if (tx) {
            await addActivity("Loan renewed", `${tx.bookTitle} renewed by ${currentUser.email || "student"} to ${data.transaction.dueDate}`, "student", currentUser.name);
            
            if (currentUser._id || currentUser.userId) {
              try {
                await fetch('/api/notifications', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId: currentUser._id || currentUser.userId,
                    type: 'renewal_confirmation',
                    title: 'Book Loan Renewed',
                    message: `You have successfully renewed "${tx.bookTitle}". New due date: ${new Date(data.transaction.dueDate).toLocaleDateString()}.`,
                    bookTitle: tx.bookTitle,
                    dueDate: data.transaction.dueDate,
                    priority: 'low',
                    actionRequired: false,
                    actionUrl: '/student/dashboard?tab=borrowed'
                  }),
                });
                
                toast.success(`Book loan renewed successfully. New due date: ${new Date(data.transaction.dueDate).toLocaleDateString()}`);
              } catch (error) {
                console.error('Error creating renewal notification:', error);
              }
            }
            
            // Refresh notifications immediately
            setTimeout(() => {
              fetchUnreadCount();
            }, 500);
          }
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to renew book');
      }
    } catch (error) {
      console.error('Error renewing book:', error);
      toast.error('Failed to renew book. Please try again.');
    }
  };

  const handlePayFine = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'payFine',
          finePaid: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh transactions
          await fetchTransactions();
          
          const tx = transactions.find(t => t._id === transactionId);
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          
          if (tx) {
            await addActivity("Fine paid", `${currentUser.email || "student"} paid $${tx.fineAmount.toFixed(2)} for ${tx.bookTitle}`, "student", currentUser.name);

            // Create notification
            if (currentUser._id || currentUser.userId) {
              try {
                await fetch('/api/notifications', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId: currentUser._id || currentUser.userId,
                    type: 'fine_notice',
                    title: 'Fine Paid Successfully',
                    message: `You have successfully paid $${tx.fineAmount.toFixed(2)} for "${tx.bookTitle}".`,
                    bookTitle: tx.bookTitle,
                    fineAmount: tx.fineAmount,
                    priority: 'medium',
                    actionRequired: false
                  }),
                });
              } catch (error) {
                console.error('Error creating fine notification:', error);
              }
            }
          }
          
          toast.success("Fine paid successfully!");
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to pay fine');
      }
    } catch (error) {
      console.error('Error paying fine:', error);
      toast.error('Failed to pay fine. Please try again.');
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <AuthGuard requiredRole="student">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <h1 className="ml-2 text-xl font-semibold text-gray-900">
                  Library Management System
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-700">{user.name}</span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Student
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
                      ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <BookOpen className="h-5 w-5" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab("books")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "books"
                      ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <BookMarked className="h-5 w-5" />
                  <span>Browse Books</span>
                </button>
                <button
                  onClick={() => setActiveTab("borrowed")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "borrowed"
                      ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Clock className="h-5 w-5" />
                  <span>Borrowed Books</span>
                </button>
                <button
                  onClick={() => setActiveTab("fines")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "fines"
                      ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <DollarSign className="h-5 w-5" />
                  <span>Fines & Payments</span>
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "history"
                      ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <History className="h-5 w-5" />
                  <span>Reading History</span>
                </button>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === "profile"
                      ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600"
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
                        ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5" />
                      <span>Notifications</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
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
                      Student ID: {user.studentId} | Department: {user.department}
                    </p>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <BookMarked className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Books Borrowed
                          </p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {transactions.filter(t => t.status === 'active').length}
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
                          <p className="text-sm font-medium text-gray-600">Overdue</p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {transactions.filter(t => t.status === 'overdue').length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <History className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Read</p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {transactions.filter(t => t.status === 'returned').length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Recent Activity
                    </h3>
                    {isLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Loading recent activity...</p>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p>No recent activity.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {transactions.slice(0, 5).map((tx) => (
                          <div key={tx._id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {tx.status === 'returned' ? `Returned "${tx.bookTitle}"` : `Borrowed "${tx.bookTitle}"`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {tx.status === 'returned' && tx.returnDate 
                                  ? `Returned on ${new Date(tx.returnDate).toLocaleDateString()}`
                                  : tx.borrowDate 
                                    ? `Borrowed on ${new Date(tx.borrowDate).toLocaleDateString()}`
                                    : 'Recently'}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              tx.status === 'returned' ? 'bg-green-100 text-green-800' :
                              tx.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "books" && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                }>
                  <BookOperations 
                    userId={user._id} 
                    onNotificationRefresh={() => {
                      fetchUnreadCount();
                      // Force notification panel to refresh if open
                      setNotificationRefreshKey(prev => prev + 1);
                    }}
                  />
                </Suspense>
              )}

              {activeTab === "borrowed" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Borrowed Books
                    </h2>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="p-6">
                      {isLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-gray-500 mt-2">Loading borrowed books...</p>
                        </div>
                      ) : transactions.filter(t => t.status === 'active' || t.status === 'overdue').length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No books currently borrowed.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {transactions
                            .filter(t => t.status === 'active' || t.status === 'overdue')
                            .map((tx) => {
                              const dueDate = new Date(tx.dueDate);
                              const isOverdue = dueDate < new Date() && tx.status !== 'returned';
                              return (
                                <div key={tx._id} className={`flex items-center justify-between p-4 rounded-lg ${
                                  isOverdue ? 'bg-red-50 border border-red-200' : 'bg-blue-50'
                                }`}>
                                  <div className="flex items-center space-x-4">
                                    <BookOpen className={`h-8 w-8 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                                    <div>
                                      <h3 className="font-semibold text-gray-900">
                                        {tx.bookTitle}
                                      </h3>
                                      <p className="text-sm text-gray-600">By {tx.bookAuthor || 'Unknown Author'}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Borrowed: {new Date(tx.borrowDate).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-600">Due Date</p>
                                    <p className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                      {dueDate.toLocaleDateString()}
                                    </p>
                                    <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                                      isOverdue 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {isOverdue ? 'Overdue' : 'Active'}
                                    </span>
                                    <div className="flex items-center space-x-2 mt-3">
                                      <button
                                        onClick={() => handleReturnBook(tx._id)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                      >
                                        Return Book
                                      </button>
                                      <button
                                        onClick={() => handleRenew(tx._id)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                      >
                                        Renew
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "fines" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Fines & Payments
                    </h2>
                  </div>

                  {/* Outstanding Fines Summary */}
                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Outstanding Fines</h3>
                        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg">
                          <DollarSign className="inline h-5 w-5 mr-2" />
                          Total: ${transactions
                            .filter(t => t.fineAmount > 0 && !t.finePaid)
                            .reduce((sum, t) => sum + t.fineAmount, 0)
                            .toFixed(2)}
                        </div>
                      </div>

                      {isLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-gray-500 mt-2">Loading fines...</p>
                        </div>
                      ) : transactions.filter(t => t.fineAmount > 0 && !t.finePaid).length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <DollarSign className="h-12 w-12 mx-auto mb-4 text-green-300" />
                          <p>No outstanding fines. You're all caught up!</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {transactions
                            .filter(t => t.fineAmount > 0 && !t.finePaid)
                            .map((tx) => (
                              <div key={tx._id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex items-center space-x-4">
                                  <DollarSign className="h-8 w-8 text-red-600" />
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{tx.bookTitle}</h3>
                                    <p className="text-sm text-gray-600">By {tx.bookAuthor || 'Unknown Author'}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Due Date: {new Date(tx.dueDate).toLocaleDateString()} • 
                                      {tx.returnDate && `Returned: ${new Date(tx.returnDate).toLocaleDateString()}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">Fine Amount</p>
                                  <p className="text-xl font-semibold text-red-600">
                                    ${tx.fineAmount.toFixed(2)}
                                  </p>
                                  <span className="inline-block px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 mt-2">
                                    Unpaid
                                  </span>
                                  <button
                                    onClick={() => handlePayFine(tx._id)}
                                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                  >
                                    Pay Fine
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment History */}
                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
                      {isLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-gray-500 mt-2">Loading payment history...</p>
                        </div>
                      ) : transactions.filter(t => t.finePaid && t.fineAmount > 0).length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No payment history available.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {transactions
                            .filter(t => t.finePaid && t.fineAmount > 0)
                            .sort((a, b) => {
                              const dateA = new Date(a.finePaidDate || a.returnDate || a.borrowDate);
                              const dateB = new Date(b.finePaidDate || b.returnDate || b.borrowDate);
                              return dateB.getTime() - dateA.getTime();
                            })
                            .map((tx) => (
                              <div key={tx._id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center space-x-4">
                                  <DollarSign className="h-8 w-8 text-green-600" />
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{tx.bookTitle}</h3>
                                    <p className="text-sm text-gray-600">By {tx.bookAuthor || 'Unknown Author'}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Paid: {tx.finePaidDate ? new Date(tx.finePaidDate).toLocaleDateString() : 
                                        tx.returnDate ? new Date(tx.returnDate).toLocaleDateString() : 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">Amount Paid</p>
                                  <p className="text-xl font-semibold text-green-600">
                                    ${tx.fineAmount.toFixed(2)}
                                  </p>
                                  <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 mt-2">
                                    Paid
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Reading History
                    </h2>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="p-6">
                      {isLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-gray-500 mt-2">Loading reading history...</p>
                        </div>
                      ) : transactions.filter(t => t.status === 'returned').length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No reading history available.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {transactions
                            .filter(t => t.status === 'returned')
                            .sort((a, b) => {
                              const dateA = new Date(a.returnDate || a.borrowDate);
                              const dateB = new Date(b.returnDate || b.borrowDate);
                              return dateB.getTime() - dateA.getTime();
                            })
                            .map((tx) => (
                            <div
                              key={tx._id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center space-x-4">
                                <BookOpen className="h-8 w-8 text-gray-600" />
                                <div>
                                  <h3 className="font-semibold text-gray-900">
                                    {tx.bookTitle}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    By {tx.bookAuthor || 'Unknown Author'}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Borrowed: {new Date(tx.borrowDate).toLocaleDateString()} • 
                                    Returned: {tx.returnDate ? new Date(tx.returnDate).toLocaleDateString() : 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Return Date</p>
                                <p className="font-semibold text-gray-900">
                                  {tx.returnDate ? new Date(tx.returnDate).toLocaleDateString() : 'N/A'}
                                </p>
                                {tx.fineAmount > 0 && (
                                  <p className={`text-xs mt-1 ${tx.finePaid ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.finePaid ? 'Fine Paid' : `Fine: $${tx.fineAmount.toFixed(2)}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
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

      {/* Student Notification Panel - Lazy loaded */}
      {user._id && showNotifications && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200">
              <p className="text-center">Loading notifications...</p>
              <div className="flex justify-center mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          </div>
        }>
          <StudentNotificationPanel
            key={notificationRefreshKey}
            userId={user._id || ''}
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </Suspense>
      )}
    </AuthGuard>
  );
}
