"use client";

import { useState } from "react";
import { BookOpen, Users, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addActivity } from "@/lib/activity";
import toast from "react-hot-toast";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateForm,
} from "@/lib/validation";
import ValidationError from "../components/ValidationError";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    department: "",
    adminSecretKey: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string[];
  }>({});
  const [touchedFields, setTouchedFields] = useState<{
    [key: string]: boolean;
  }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const router = useRouter();

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

    switch (field) {
      case "email":
        if (formData.email) {
          const emailValidation = validateEmail(formData.email);
          if (!emailValidation.isValid) {
            newErrors.email = emailValidation.errors;
          } else {
            delete newErrors.email;
          }
        }
        break;

      case "password":
        if (formData.password) {
          const passwordValidation = validatePassword(formData.password);
          if (!passwordValidation.isValid) {
            newErrors.password = passwordValidation.errors;
          } else {
            delete newErrors.password;
          }
        }
        break;

      case "confirmPassword":
        if (formData.confirmPassword) {
          const confirmValidation = validateConfirmPassword(
            formData.password,
            formData.confirmPassword
          );
          if (!confirmValidation.isValid) {
            newErrors.confirmPassword = confirmValidation.errors;
          } else {
            delete newErrors.confirmPassword;
          }
        }
        break;

      case "name":
        if (formData.name && formData.name.trim().length < 2) {
          newErrors.name = ["Name must be at least 2 characters long"];
        } else {
          delete newErrors.name;
        }
        break;

      case "role":
        if (!formData.role) {
          newErrors.role = ["Please select a role"];
        } else {
          delete newErrors.role;
        }
        break;

      case "adminSecretKey":
        if (
          formData.role === "admin" &&
          (!formData.adminSecretKey || formData.adminSecretKey.trim() === "")
        ) {
          newErrors.adminSecretKey = ["Admin secret key is required"];
        } else {
          delete newErrors.adminSecretKey;
        }
        break;
    }

    setValidationErrors(newErrors);
  };

  const validateAdminKey = (key: string): boolean => {
    return key.length >= 8; // Minimum length requirement for admin key
  };

  const handleSignUp = async () => {
    // Reset validation errors
    const newErrors: { [key: string]: string[] } = {};

    // Validate required fields
    if (!formData.name?.trim()) {
      newErrors.name = ["Name is required"];
    }

    if (!formData.email?.trim()) {
      newErrors.email = ["Email is required"];
    } else {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.errors;
      }
    }

    if (!formData.password) {
      newErrors.password = ["Password is required"];
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = ["Passwords do not match"];
    }

    if (!formData.role) {
      newErrors.role = ["Please select a role"];
    }

    // Validate admin secret key if role is admin
    if (formData.role === "admin") {
      if (!formData.adminSecretKey?.trim()) {
        newErrors.adminSecretKey = ["Admin secret key is required"];
      } else if (!validateAdminKey(formData.adminSecretKey)) {
        newErrors.adminSecretKey = [
          "Admin secret key must be at least 8 characters long",
        ];
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      // Mark all validated fields as touched
      const touchedFieldsToSet = Object.keys(newErrors).reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {} as { [key: string]: boolean });
      setTouchedFields(touchedFieldsToSet);
      toast.error("Please fix the validation errors before proceeding.");
      return;
    }

    setIsLoading(true);

    try {
      setIsLoading(true);
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          department: formData.department,
          ...(formData.role === "admin" && {
            adminSecretKey: formData.adminSecretKey,
          }),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Log signup activity
        try {
          await addActivity(
            "user_signup",
            `New user registered with email: ${formData.email}, role: ${formData.role}`,
            formData.role
          );
        } catch (error) {
          // Don't block signup if activity logging fails
          console.warn("Failed to log signup activity:", error);
        }

        toast.success(
          "Account created successfully! Please sign in to access your dashboard."
        );
        router.push("/signin");
      } else {
        // Handle specific error cases
        if (data.error === "Invalid admin secret key") {
          setValidationErrors((prev) => ({
            ...prev,
            adminSecretKey: ["Invalid admin secret key provided"],
          }));
          setTouchedFields((prev) => ({
            ...prev,
            adminSecretKey: true,
          }));
        } else if (data.error === "User already exists") {
          setValidationErrors((prev) => ({
            ...prev,
            email: ["This email is already registered"],
          }));
          setTouchedFields((prev) => ({
            ...prev,
            email: true,
          }));
        } else {
          toast.error(data.error || "Failed to create account");
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("An error occurred during signup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Join Our Library</h2>
            <p className="text-gray-500">
              Create your account to start exploring
            </p>
          </div>

          <div className="space-y-4 mt-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 sm:text-sm p-2 ${
                  validationErrors.name && touchedFields.name
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300 focus:border-blue-500"
                }`}
              />
              <ValidationError
                errors={validationErrors.name || []}
                show={!!validationErrors.name && touchedFields.name}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email *
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email (e.g., user@example.com)"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 sm:text-sm p-2 ${
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

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700"
              >
                I am a *
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
                onBlur={() => handleBlur("role")}
                className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 sm:text-sm p-2 ${
                  validationErrors.role && touchedFields.role
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300 focus:border-blue-500"
                }`}
              >
                <option value="">Select your role</option>
                <option value="admin">Administrator </option>
                <option value="student">Student</option>
                <option value="librarian">Librarian</option>
              </select>
              <ValidationError
                errors={validationErrors.role || []}
                show={!!validationErrors.role && touchedFields.role}
              />
            </div>

            {formData.role === "admin" && (
              <div className="space-y-1">
                <label
                  htmlFor="adminSecretKey"
                  className="block text-sm font-medium text-gray-700"
                >
                  Admin Secret Key *
                </label>
                <div className="relative">
                  <input
                    id="adminSecretKey"
                    type={showAdminKey ? "text" : "password"}
                    placeholder="Enter admin secret key"
                    value={formData.adminSecretKey}
                    onChange={(e) =>
                      handleInputChange("adminSecretKey", e.target.value)
                    }
                    onBlur={() => handleBlur("adminSecretKey")}
                    className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 sm:text-sm p-2 pr-10 ${
                      validationErrors.adminSecretKey &&
                      touchedFields.adminSecretKey
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-blue-500"
                    }`}
                    required={formData.role === "admin"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminKey(!showAdminKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showAdminKey ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Required for admin registration. Contact system administrator
                  if you don't have this key.
                </p>
                <ValidationError
                  errors={validationErrors.adminSecretKey || []}
                  show={
                    !!validationErrors.adminSecretKey &&
                    touchedFields.adminSecretKey
                  }
                />
              </div>
            )}

            {formData.role === "student" && (
              <div>
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-gray-700"
                >
                  Department
                </label>
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) =>
                    handleInputChange("department", e.target.value)
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                >
                  <option value="">Select your department</option>
                  <option value="computer-science">Computer Science</option>
                  <option value="information-technology">
                    Information Technology
                  </option>
                  <option value="software-engineering">
                    Software Engineering
                  </option>
                  <option value="data-science">Data Science</option>
                  <option value="mathematics">Mathematics</option>
                  <option value="engineering">Engineering</option>
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  onBlur={() => handleBlur("password")}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 sm:text-sm p-2 pr-10 ${
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  onBlur={() => handleBlur("confirmPassword")}
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 sm:text-sm p-2 pr-10 ${
                    validationErrors.confirmPassword &&
                    touchedFields.confirmPassword
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <ValidationError
                errors={validationErrors.confirmPassword || []}
                show={
                  !!validationErrors.confirmPassword &&
                  touchedFields.confirmPassword
                }
              />
            </div>
          </div>

          <button
            onClick={handleSignUp}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 mt-6 disabled:opacity-50"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>

          <div className="text-center text-sm text-gray-500 mt-4">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </div>

          <div className="text-center mt-4">
            <span className="text-sm text-gray-600">
              Already have an account?{" "}
            </span>
            <Link
              href="signin"
              className="text-sm text-blue-600 hover:underline"
            >
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
