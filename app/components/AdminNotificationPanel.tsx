"use client";

import { useState, useEffect } from "react";
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  BookOpen,
  X,
  Check,
  Trash2,
  Filter,
  Shield,
  Users,
  Database,
  Activity
} from "lucide-react";
import toast from "react-hot-toast";

interface Notification {
  _id: string;
  type: 'system_alert' | 'user_registration' | 'librarian_request' | 'overdue_alert' | 'fine_notice' | 'maintenance_alert' | 'security_alert';
  title: string;
  message: string;
  userId?: string;
  userName?: string;
  bookId?: string;
  bookTitle?: string;
  dueDate?: string;
  fineAmount?: number;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionRequired: boolean;
  actionUrl?: string;
  createdAt: string;
}

interface AdminNotificationPanelProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminNotificationPanel({ userId, isOpen, onClose }: AdminNotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent' | 'system'>('all');

  // Load cached notifications from localStorage first for immediate display
  useEffect(() => {
    if (isOpen && userId) {
      // Try to load cached data first
      try {
        const cachedData = localStorage.getItem(`admin_notifications_${userId}_${filter}`);
        if (cachedData) {
          const { notifications: cachedNotifications, timestamp } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;
          
          // Use cache if less than 2 minutes old
          if (cacheAge < 2 * 60 * 1000) {
            setNotifications(cachedNotifications);
            setUnreadCount(cachedNotifications.filter((n: Notification) => !n.isRead).length);
          }
        }
      } catch (error) {
        console.error('Error loading cached notifications:', error);
      }
      
      // Always fetch fresh data
      fetchNotifications();
    }
  }, [isOpen, userId, filter]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        userId,
        unreadOnly: filter === 'unread' ? 'true' : 'false',
        limit: '50'
      });
      
      // Create a timeout promise to limit waiting time
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 8000)
      );
      
      // The actual fetch request
      const fetchPromise = fetch(`/api/notifications?${params}`);
      
      // Race between timeout and fetch
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      if (response.ok) {
        const data = await response.json();
        let filteredNotifications = data.notifications;
        
        if (filter === 'urgent') {
          filteredNotifications = data.notifications.filter((n: Notification) => 
            n.priority === 'high' || n.priority === 'urgent'
          );
        } else if (filter === 'system') {
          filteredNotifications = data.notifications.filter((n: Notification) => 
            n.type === 'system_alert' || n.type === 'maintenance_alert' || n.type === 'security_alert'
          );
        }
        
        setNotifications(filteredNotifications);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.isRead).length);
        
        // Cache the notifications in localStorage with timestamp
        try {
          localStorage.setItem(`admin_notifications_${userId}_${filter}`, JSON.stringify({
            notifications: filteredNotifications,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('Error caching notifications:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if ((error as Error).message === 'Request timed out') {
        toast.error('Request timed out. Using cached data if available.');
      } else {
        toast.error('Failed to load notifications');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          action: 'markAsRead'
        }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'markAllAsRead'
        }),
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId
        }),
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        toast.success('Notification deleted');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === 'urgent' ? 'text-red-600' : 
                     priority === 'high' ? 'text-orange-600' : 
                     priority === 'medium' ? 'text-blue-600' : 'text-gray-600';

    switch (type) {
      case 'system_alert':
        return <Shield className={`h-5 w-5 ${iconClass}`} />;
      case 'user_registration':
        return <Users className={`h-5 w-5 ${iconClass}`} />;
      case 'librarian_request':
        return <Database className={`h-5 w-5 ${iconClass}`} />;
      case 'overdue_alert':
        return <Clock className={`h-5 w-5 ${iconClass}`} />;
      case 'fine_notice':
        return <DollarSign className={`h-5 w-5 ${iconClass}`} />;
      case 'maintenance_alert':
        return <AlertCircle className={`h-5 w-5 ${iconClass}`} />;
      case 'security_alert':
        return <Shield className={`h-5 w-5 ${iconClass}`} />;
      default:
        return <Bell className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-gray-300 bg-white';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-red-50 to-red-100">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Admin Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-200 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'all' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'unread' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'urgent' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Urgent
            </button>
            <button
              onClick={() => setFilter('system')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'system' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              System
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No admin notifications to display</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 rounded-lg border-l-4 ${getPriorityColor(notification.priority)} ${
                    !notification.isRead ? 'ring-2 ring-red-200' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type, notification.priority)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          {notification.fineAmount && notification.fineAmount > 0 && (
                            <p className="text-sm text-red-600 font-medium mt-1">
                              Fine: ${notification.fineAmount.toFixed(2)}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="p-1 hover:bg-red-200 rounded"
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4 text-red-500" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification._id)}
                            className="p-1 hover:bg-red-200 rounded"
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                      {notification.actionRequired && notification.actionUrl && (
                        <button
                          onClick={() => {
                            window.location.href = notification.actionUrl!;
                            onClose();
                          }}
                          className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          Take Action →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
