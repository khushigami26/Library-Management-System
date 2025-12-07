"use client";

import { useState, useEffect } from "react";
import { BookOpen, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { validateEmail } from "@/lib/validation";
import ValidationError from "../components/ValidationError";

export default function SignInPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string[];
  }>({});
  const [touchedFields, setTouchedFields] = useState<{
    [key: string]: boolean;
  }>({});
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Check if user is already authenticated when the component loads
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check localStorage first for immediate response
        const localUser = localStorage.getItem("user");
        if (localUser) {
          const userData = JSON.parse(localUser);

          // Redirect based on role immediately
          switch (userData.role) {
            case "admin":
              router.push("/admin/dashboard");
              return;
            case "librarian":
              router.push("/librarian/dashboard");
              return;
            case "student":
              router.push("/student/dashboard");
              return;
            default:
              router.push("/");
              return;
          }
        }

        // Check if user is already authenticated via cookie
        const response = await fetch("/api/auth/verify");
        const data = await response.json();

        if (response.ok && data.authenticated) {
          // Store user data in localStorage if not already there
          localStorage.setItem("user", JSON.stringify(data.user));

          // Redirect based on role
          switch (data.user.role) {
            case "admin":
              router.push("/admin/dashboard");
              return;
            case "librarian":
              router.push("/librarian/dashboard");
              return;
            case "student":
              router.push("/student/dashboard");
              return;
            default:
              router.push("/");
              return;
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Set a timeout to show signin page quickly if verification takes too long
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 800); // Show login form after 800ms at most

    checkAuth();

    return () => clearTimeout(timeout);
  }, [router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing (only if field was touched)
    if (touchedFields[field] && validationErrors[field]) {
      const newErrors = { ...validationErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  const handleBlur = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));

    // Only validate on blur, not during typing
    const newErrors = { ...validationErrors };

    if (field === "email" && formData.email) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.errors;
      } else {
        delete newErrors.email;
      }
      setValidationErrors(newErrors);
    }
  };

  const handleSignIn = async () => {
    // Validate all fields on form submission
    const errors: { [key: string]: string[] } = {};

    // Validate email format
    if (formData.email) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        errors.email = emailValidation.errors;
      }
    } else {
      errors.email = ["Email is required"];
    }

    if (!formData.password) {
      errors.password = ["Password is required"];
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Mark all fields as touched to show errors
      setTouchedFields({
        email: true,
        password: true,
      });
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data in localStorage for session management
        localStorage.setItem("user", JSON.stringify(data.user));

        toast.success("Sign in successful!");

        // Redirect based on role
        switch (data.user.role) {
          case "admin":
            router.push("/admin/dashboard");
            break;
          case "librarian":
            router.push("/librarian/dashboard");
            break;
          case "student":
            router.push("/student/dashboard");
            break;
          default:
            router.push("/");
        }
      } else {
        toast.error(data.error || "Sign in failed");
      }
    } catch (error) {
      console.error("Signin error:", error);
      toast.error("An error occurred during sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Welcome Back</h2>
            <p className="text-gray-500">
              Sign in to access your library account
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4 mt-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email (e.g., user@example.com)"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                className={`mt-1 block w-full rounded-lg border bg-gray-50 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-200 sm:text-sm ${
                  validationErrors.email && touchedFields.email
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300 focus:border-blue-500"
                }`}
              />
              <ValidationError
                errors={validationErrors.email || []}
                show={!!validationErrors.email && touchedFields.email}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  onBlur={() =>
                    setTouchedFields((prev) => ({ ...prev, password: true }))
                  }
                  className={`mt-1 block w-full rounded-lg border bg-gray-50 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:text-sm ${
                    validationErrors.password && touchedFields.password
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <ValidationError
                errors={validationErrors.password || []}
                show={!!validationErrors.password && touchedFields.password}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>

            {/* Sign Up Link */}
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Don't have an account?{" "}
              </span>
              <Link
                href="/signup"
                className="text-sm text-blue-600 hover:underline"
              >
                Sign up here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
