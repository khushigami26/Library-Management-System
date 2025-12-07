"use client";

export type Activity = {
  id: string;
  action: string;
  details: string;
  timestamp: string; // ISO
  role?: string;
  actor?: string;
};

// List of actions that don't require authentication
export const PUBLIC_ACTIONS = [
  "user_signup",
  "login_attempt",
  "password_reset_request",
  "verify_email",
  "system_startup",
];

export async function addActivity(
  action: string,
  details: string,
  role?: string,
  actor?: string,
  entityType?: string,
  entityId?: string,
  entityName?: string
) {
  try {
    const isPublicAction = PUBLIC_ACTIONS.includes(action);
    console.log("addActivity called:", { action, isPublicAction, role });
    let token = null;

    if (!isPublicAction) {
      // Only try to get authentication for non-public actions
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        token = user.token;
      } catch (e) {
        console.warn("Could not parse user data from localStorage");
      }

      // Get cookie token if available using document.cookie
      if (!token && typeof document !== "undefined") {
        const cookies = document.cookie.split(";");
        const tokenCookie = cookies.find((c) => c.trim().startsWith("token="));
        if (tokenCookie) {
          token = tokenCookie.split("=")[1];
        }
      }
    }

    const response = await fetch("/api/activities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        action,
        details,
        role: role || "system",
        actor: actor || "system",
        isPublicAction,
        entityType: entityType || "book",
        entityId: entityId || null,
        entityName: entityName || "Unknown",
      }),
      credentials: "include", // Include cookies in the request
    });

    // Check if response has content before parsing
    const contentType = response.headers.get("content-type");
    let data: any = {};

    if (contentType && contentType.includes("application/json")) {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
      }
    }

    if (!response.ok) {
      // For public actions, just log the error but don't throw
      if (isPublicAction) {
        console.warn("Failed to log public activity:", action, data?.error);
        return null;
      }

      // For protected actions, handle auth errors
      if (response.status === 401) {
        console.error("Authentication required for logging activity");
        throw new Error("Authentication required");
      }

      // Handle other errors
      console.error("Failed to log activity to MongoDB:", data?.error);
      console.error("Full error response:", data);
      throw new Error(data?.error || "Failed to log activity");
    }

    return data;
  } catch (err) {
    const error = err as Error;
    console.error("Error logging activity:", error);
    // For public actions, don't throw errors
    if (PUBLIC_ACTIONS.includes(action)) {
      return null;
    }
    // Rethrow authentication errors for protected actions
    if (error.message === "Authentication required") {
      throw error;
    }
    // For other errors, just log them but don't stop execution
    return null;
  }
}

export async function getActivities(limit?: number): Promise<Activity[]> {
  try {
    const url = limit ? `/api/activities?limit=${limit}` : "/api/activities";
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      return data.activities.map((activity: any) => ({
        id: activity._id,
        action: activity.action,
        details: activity.details,
        timestamp: activity.timestamp,
        role: activity.role,
        actor: activity.actor,
      }));
    }
  } catch (error) {
    console.error("Error fetching activities:", error);
  }

  return [];
}
