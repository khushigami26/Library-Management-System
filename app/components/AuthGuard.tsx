"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First check if we have a user in localStorage for immediate UI response
      const localUser = localStorage.getItem("user");
      let userData = localUser ? JSON.parse(localUser) : null;
      
      // If we have userData in localStorage, show UI immediately
      if (userData) {
        // Check role requirements client-side first
        if (requiredRole && userData.role !== requiredRole) {
          toast.error("You don't have permission to access this page.");
          router.push("/signin");
          return;
        }
        
        // Show UI immediately based on localStorage
        setUserRole(userData.role);
        setIsAuthenticated(true);
        setIsLoading(false);
        
        // Then verify with server in background
        fetch("/api/auth/verify")
          .then(response => response.json())
          .then(data => {
            if (!data.authenticated) {
              // Server says not authenticated
              localStorage.removeItem("user");
              toast.error("Your session has expired. Please sign in again.");
              router.push("/signin");
            } else {
              // Update localStorage silently
              localStorage.setItem("user", JSON.stringify(data.user));
            }
          })
          .catch(error => {
            console.error("Background auth verification error:", error);
          });
          
        return;
      }
      
      // If no localStorage data, we need to wait for server verification
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
      userData = data.user;
      
      // Check role requirements
      if (requiredRole && userData.role !== requiredRole) {
        // User doesn't have required role
        toast.error("You don't have permission to access this page.");
        router.push("/signin");
        return;
      }
      
      // Authentication successful
      setUserRole(userData.role);
      setIsAuthenticated(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Auth verification error:", error);
      localStorage.removeItem("user");
      router.push("/signin");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
