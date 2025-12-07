import React, { useState, useEffect } from "react";
import {
  Clock,
  User,
  BookOpen,
  UserPlus,
  UserMinus,
  Plus,
  Minus,
  Activity,
} from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  performer: {
    name: string;
    role: string;
  };
  target: {
    type: string;
    name: string;
  };
  description: string;
  timestamp: string;
  timeAgo: string;
}

interface RecentActivitiesProps {
  refreshInterval?: number;
  maxActivities?: number;
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({
  refreshInterval = 30000, // 30 seconds
  maxActivities = 20,
}) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch activities
  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/activities?limit=${maxActivities}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Handle 403 (access denied) silently - user doesn't have permission
        if (response.status === 403) {
          setError("You don't have permission to view activities");
          setActivities([]);
          setLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setActivities(data.activities || []);
      setError(null);
    } catch (error) {
      console.error("Error fetching activities:", error);
      setError("Failed to load recent activities");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    fetchActivities();

    const interval = setInterval(fetchActivities, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, maxActivities]);

  // Get icon for activity type
  const getActivityIcon = (action: string) => {
    switch (action) {
      case "USER_ADDED":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "USER_REMOVED":
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case "USER_UPDATED":
        return <User className="h-4 w-4 text-blue-500" />;
      case "BOOK_ADDED":
        return <Plus className="h-4 w-4 text-green-500" />;
      case "BOOK_REMOVED":
        return <Minus className="h-4 w-4 text-red-500" />;
      case "BOOK_UPDATED":
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case "BOOK_BORROWED":
        return <BookOpen className="h-4 w-4 text-orange-500" />;
      case "BOOK_RETURNED":
        return <BookOpen className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get color for user role badge
  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "librarian":
        return "bg-blue-100 text-blue-800";
      case "student":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activities
          </h3>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activities
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">Last 24 hours</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">
                No recent activities to display
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Activities will appear here when users perform actions
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.action)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 line-clamp-2">
                        {activity.description}
                      </p>

                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                            activity.performer.role
                          )}`}
                        >
                          {activity.performer.role}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {activity.performer.name}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {activity.target.type}: {activity.target.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {activities.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Showing {activities.length} recent activities</span>
              <span>Auto-refreshes every {refreshInterval / 1000}s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivities;
