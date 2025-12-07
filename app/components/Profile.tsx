"use client";

import { useState, useEffect } from "react";
import { User, Edit, Save, X, Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";

interface ProfileProps {
  user: any;
  onProfileUpdate?: (updatedUser: any) => void;
}

export default function Profile({ user, onProfileUpdate }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    department: user?.department || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Ensure we have the latest user data from props
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name || "",
        email: user.email || prev.email || "",
        department: user.department || prev.department || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate name
    if (!formData.name || formData.name.trim() === '') {
      toast.error("Name cannot be empty");
      return;
    }
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {
        name: formData.name,
        department: formData.department
      };

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const userId = user?._id || user?.userId;
      if (!userId) {
        toast.error("User ID not found. Please sign in again.");
        setIsLoading(false);
        return;
      }
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const responseData = await response.json();
      
      if (response.ok) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
        
        // Update local storage with complete user data
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const updatedUserData = { ...currentUser, ...responseData.user };
        localStorage.setItem("user", JSON.stringify(updatedUserData));
        
        // Call callback if provided
        if (onProfileUpdate) {
          onProfileUpdate(updatedUserData);
        }
        
        // Reset form data with new values and clear password fields
        setFormData(prev => ({
          ...prev,
          name: responseData.user.name || "",
          department: responseData.user.department || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
      } else {
        toast.error(responseData.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      department: user?.department || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "admin":
        return { label: "Administrator", color: "bg-red-100 text-red-800" };
      case "librarian":
        return { label: "Librarian", color: "bg-green-100 text-green-800" };
      case "student":
        return { label: "Student", color: "bg-blue-100 text-blue-800" };
      default:
        return { label: role, color: "bg-gray-100 text-gray-800" };
    }
  };

  const roleInfo = getRoleDisplay(user?.role);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6">
          {!isEditing ? (
            // View Mode
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{user?.name}</h3>
                  <span className={`inline-block px-3 py-1 text-sm rounded-full ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <p className="text-gray-900">{user?.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <p className="text-gray-900">{roleInfo.label}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <p className="text-gray-900">{user?.department || "Not specified"}</p>
                </div>

                {user?.studentId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student ID
                    </label>
                    <p className="text-gray-900 font-mono">{user.studentId}</p>
                  </div>
                )}

                {user?.librarianId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Librarian ID
                    </label>
                    <p className="text-gray-900 font-mono">{user.librarianId}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Join Date
                  </label>
                  <p className="text-gray-900">
                    {user?.joinDate ? new Date(user.joinDate).toLocaleDateString() : "Not specified"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    user?.status === "active" ? "bg-green-100 text-green-800" :
                    user?.status === "suspended" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {user?.status || "Unknown"}
                  </span>
                </div>
              </div>

              {user?.role === "student" && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Books Currently Borrowed
                      </label>
                      <p className="text-gray-900">{user?.booksBorrowed || 0}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Outstanding Fines
                      </label>
                      <p className="text-gray-900">${user?.fines || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Edit Mode
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Chemical Engineering">Chemical Engineering</option>
                    <option value="Business Administration">Business Administration</option>
                    <option value="Physics">Physics</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={roleInfo.label}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Change Password (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="Enter new password"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Leave password fields empty if you don't want to change your password
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isLoading ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
