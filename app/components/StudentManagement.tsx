"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  User,
  Mail,
  BookOpen,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { addActivity } from "@/lib/activity";
import toast from "react-hot-toast";
import { validateEmail, validatePassword } from "@/lib/validation";
import ValidationError from "./ValidationError";

interface Student {
  _id: string;
  name: string;
  email: string;
  studentId?: string;
  department?: string;
  status: string;
  joinDate: string;
  booksBorrowed: number;
  fines: number;
}

interface StudentManagementProps {
  userRole: string;
}

export default function StudentManagement({
  userRole,
}: StudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    password: "",
    confirmPassword: "",
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch students from API
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        // Filter only students
        const studentUsers = data.users.filter(
          (user: any) => user.role === "student"
        );
        setStudents(studentUsers);
      } else {
        toast.error("Failed to fetch students");
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to fetch students");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors on input change if form was previously submitted
    if (isSubmitted) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    // Name validation
    if (!formData.name) {
      errors.name = "Name is required";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Name must be at least 3 characters long";
    }

    // Email validation
    if (!formData.email) {
      errors.email = "Email is required";
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)
    ) {
      errors.email = "Invalid email address";
    }

    // Password validation
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.confirmPassword !== formData.password) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Department validation
    if (!formData.department) {
      errors.department = "Please select a department";
    }

    return errors;
  };

  const handleAddStudent = async () => {
    setIsSubmitted(true);
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fix all errors before submitting");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: "student",
          department: formData.department,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addActivity(
          "User added",
          `${formData.name} (${formData.email})`,
          "librarian",
          undefined,
          "user",
          data.user?._id || data.user?.id,
          formData.name
        );
        toast.success("Student added successfully!");
        setFormData({
          name: "",
          email: "",
          department: "",
          password: "",
          confirmPassword: "",
        });
        setShowAddForm(false);
        fetchStudents(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to add student");
      }
    } catch (error) {
      console.error("Error adding student:", error);
      toast.error("Failed to add student");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      department: student.department || "",
      password: "",
      confirmPassword: "",
    });
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${editingStudent._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          department: formData.department,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addActivity(
          "User updated",
          `${formData.name} (${formData.email})`,
          "librarian",
          undefined,
          "user",
          editingStudent._id,
          formData.name
        );
        toast.success("Student updated successfully!");
        setEditingStudent(null);
        setFormData({
          name: "",
          email: "",
          department: "",
          password: "",
          confirmPassword: "",
        });
        fetchStudents(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to update student");
      }
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("Failed to update student");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const response = await fetch(`/api/users/${studentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const student = students.find((s) => s._id === studentId);
        if (student) {
          addActivity(
            "User removed",
            `${student.name} (${student.email})`,
            "librarian",
            undefined,
            "user",
            studentId,
            student.name
          );
        }
        toast.success("Student deleted successfully!");
        fetchStudents(); // Refresh the list
      } else {
        toast.error("Failed to delete student");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student");
    }
  };

  const handleToggleStatus = async (studentId: string) => {
    try {
      const response = await fetch(`/api/users/${studentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "toggleStatus",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addActivity(
          "User updated",
          `${data.user.name} → ${data.user.status}`,
          "librarian",
          undefined,
          "user",
          studentId,
          data.user.name
        );
        toast.success(`Student status changed to ${data.user.status}`);
        fetchStudents(); // Refresh the list
        // Reset form data with all fields
        setFormData({
          name: "",
          email: "",
          department: "",
          password: "",
          confirmPassword: "",
        });
      } else {
        toast.error("Failed to update student status");
      }
    } catch (error) {
      console.error("Error updating student status:", error);
      toast.error("Failed to update student status");
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.studentId &&
        student.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.department &&
        student.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "suspended":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
        {(userRole === "admin" || userRole === "librarian") && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Student</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search students by name, email, or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Add/Edit Student Form */}
      {(showAddForm || editingStudent) && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingStudent ? "Edit Student" : "Add New Student"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isSubmitted && formErrors.name
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="Student name"
              />
              {isSubmitted && formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isSubmitted && formErrors.email
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300"
                } ${editingStudent ? "bg-gray-100" : ""}`}
                placeholder="student@example.com"
                disabled={!!editingStudent}
              />
              {isSubmitted && formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department *
              </label>
              <select
                value={formData.department}
                onChange={(e) =>
                  handleInputChange("department", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isSubmitted && formErrors.department
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300"
                }`}
              >
                <option value="">Select department</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">
                  Information Technology
                </option>
                <option value="Software Engineering">
                  Software Engineering
                </option>
                <option value="Data Science">Data Science</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Artificial Intelligence">
                  Artificial Intelligence
                </option>
              </select>
              {isSubmitted && formErrors.department && (
                <p className="mt-1 text-sm text-red-600">
                  {formErrors.department}
                </p>
              )}
            </div>

            {!editingStudent && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isSubmitted && formErrors.password
                          ? "border-red-300 focus:border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter password"
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
                  {isSubmitted && formErrors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isSubmitted && formErrors.confirmPassword
                          ? "border-red-300 focus:border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {isSubmitted && formErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="mt-6 flex space-x-3">
            <button
              onClick={editingStudent ? handleUpdateStudent : handleAddStudent}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading
                ? "Saving..."
                : editingStudent
                ? "Update Student"
                : "Add Student"}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingStudent(null);
                setFormData({
                  name: "",
                  email: "",
                  department: "",
                  password: "",
                  confirmPassword: "",
                });
                setFormErrors({});
                setIsSubmitted(false);
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Students List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6">
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <div
                key={student._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(student.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {student.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {student.email}{" "}
                      {student.studentId && `| ID: ${student.studentId}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {student.department ? `${student.department} | ` : ""}
                      Joined: {new Date(
                        student.joinDate
                      ).toLocaleDateString()}{" "}
                      | Books: {student.booksBorrowed} | Fines: ${student.fines}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                      student.status
                    )}`}
                  >
                    {student.status}
                  </span>
                  {(userRole === "admin" || userRole === "librarian") && (
                    <>
                      <button
                        onClick={() => handleEditStudent(student)}
                        className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(student._id)}
                        className={`px-3 py-1 text-xs rounded ${
                          student.status === "active"
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        } transition-colors`}
                      >
                        {student.status === "active" ? "Suspend" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student._id)}
                        className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No students found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
