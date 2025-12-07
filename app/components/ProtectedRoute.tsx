"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if we have a user in localStorage
        const localUser = localStorage.getItem("user");
        let userData = localUser ? JSON.parse(localUser) : null;
        
        if (userData) {
          // We have a user in localStorage, do quick client-side check first
          if (!allowedRoles.includes(userData.role)) {
            // User doesn't have required role
            router.push("/signin");
            return;
          }
          
          // Show the UI immediately based on localStorage
          setIsAuthorized(true);
          setIsLoading(false);
          
          // Then verify with server in background
          const response = await fetch("/api/auth/verify");
          const data = await response.json();

          if (!response.ok || !data.authenticated) {
            // Server says not authenticated, redirect
            localStorage.removeItem("user");
            router.push("/signin");
            return;
          }

          // Silently update localStorage with latest user data
          localStorage.setItem("user", JSON.stringify(data.user));
          
          // Double check role with latest server data
          if (!allowedRoles.includes(data.user.role)) {
            router.push("/signin");
          }
        } else {
          // No user in localStorage, must verify with server
          const response = await fetch("/api/auth/verify");
          const data = await response.json();

          if (!response.ok || !data.authenticated) {
            // Server says not authenticated
            localStorage.removeItem("user");
            router.push("/signin");
            return;
          }

          // Update localStorage with latest user data from server
          localStorage.setItem("user", JSON.stringify(data.user));
          
          // Check if user has an allowed role
          if (!allowedRoles.includes(data.user.role)) {
            // User doesn't have the required role
            router.push("/signin");
            return;
          }

          setIsAuthorized(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Auth verification error:", error);
        localStorage.removeItem("user");
        router.push("/signin");
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, allowedRoles]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
