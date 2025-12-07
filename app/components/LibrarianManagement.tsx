"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  User,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

interface Librarian {
  _id: string;
  name: string;
  email: string;
  librarianId: string;
  department: string;
  status: string;
  joinDate: string;
  lastActive: string;
  permissions: string[];
  accessLevel: string;
}

interface LibrarianManagementProps {
  userRole: string;
}

export default function LibrarianManagement({
  userRole,
}: LibrarianManagementProps) {
  const [librarians, setLibrarians] = useState<Librarian[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLibrarian, setEditingLibrarian] = useState<Librarian | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    accessLevel: "standard",
    permissions: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch librarians from API
  useEffect(() => {
    fetchLibrarians();
  }, []);

  const fetchLibrarians = async () => {
    try {
      const response = await fetch("/api/users?role=librarian");
      if (response.ok) {
        const data = await response.json();
        setLibrarians(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching librarians:", error);
      toast.error("Failed to fetch librarians");
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePermissionToggle = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleAddLibrarian = async () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.department
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate password
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          role: "librarian",
        }),
      });

      if (response.ok) {
        toast.success("Librarian added successfully!");
        setFormData({
          name: "",
          email: "",
          password: "",
          department: "",
          accessLevel: "standard",
          permissions: [],
        });
        setShowAddForm(false);
        fetchLibrarians(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add librarian");
      }
    } catch (error) {
      console.error("Error adding librarian:", error);
      toast.error("Failed to add librarian");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLibrarian = (librarian: Librarian) => {
    setEditingLibrarian(librarian);
    setFormData({
      name: librarian.name,
      email: librarian.email,
      password: "", // Don't populate password when editing
      department: librarian.department,
      accessLevel: librarian.accessLevel || "standard",
      permissions: librarian.permissions || [],
    });
  };

  const handleUpdateLibrarian = async () => {
    if (!editingLibrarian) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${editingLibrarian._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          department: formData.department,
          accessLevel: formData.accessLevel,
          permissions: formData.permissions,
        }),
      });

      if (response.ok) {
        toast.success("Librarian updated successfully!");
        setEditingLibrarian(null);
        setFormData({
          name: "",
          email: "",
          password: "",
          department: "",
          accessLevel: "standard",
          permissions: [],
        });
        fetchLibrarians(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update librarian");
      }
    } catch (error) {
      console.error("Error updating librarian:", error);
      toast.error("Failed to update librarian");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLibrarian = async (librarianId: string) => {
    if (confirm("Are you sure you want to delete this librarian?")) {
      try {
        const response = await fetch(`/api/users/${librarianId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast.success("Librarian deleted successfully!");
          fetchLibrarians(); // Refresh the list
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to delete librarian");
        }
      } catch (error) {
        console.error("Error deleting librarian:", error);
        toast.error("Failed to delete librarian");
      }
    }
  };

  const handleToggleStatus = async (
    librarianId: string,
    currentStatus: string
  ) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";

    try {
      const response = await fetch(`/api/users/${librarianId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        toast.success(`Librarian ${newStatus} successfully!`);
        fetchLibrarians(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const filteredLibrarians = librarians.filter(
    (librarian) =>
      librarian.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      librarian.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      librarian.librarianId.toLowerCase().includes(searchQuery.toLowerCase())
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

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case "senior":
        return "bg-purple-100 text-purple-800";
      case "standard":
        return "bg-blue-100 text-blue-800";
      case "junior":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const permissionLabels: Record<string, string> = {
    "Book Management": "Book Management",
    "Student Management": "Student Management",
    Transactions: "Transactions",
    Reports: "Reports",
    "System Settings": "System Settings",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Librarian Management
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Add New Librarian</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search librarians by name, email, or librarian ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Add/Edit Librarian Form */}
      {(showAddForm || editingLibrarian) && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingLibrarian ? "Edit Librarian" : "Add New Librarian"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Librarian full name"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="librarian@email.com"
                disabled={isLoading || !!editingLibrarian}
              />
              {editingLibrarian && (
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              )}
            </div>
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
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter password"
                  disabled={isLoading || !!editingLibrarian}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading || !!editingLibrarian}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {editingLibrarian && (
                <p className="text-xs text-gray-500 mt-1">
                  Password cannot be changed here
                </p>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="">Select department</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Engineering">Engineering</option>
                <option value="Business">Business</option>
                <option value="Science">Science</option>
                <option value="Medical">Medical</option>
                <option value="Law">Law</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Level
              </label>
              <select
                value={formData.accessLevel}
                onChange={(e) =>
                  handleInputChange("accessLevel", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="junior">Junior</option>
                <option value="standard">Standard</option>
                <option value="senior">Senior</option>
              </select>
            </div>
          </div>

          {/* Permissions */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(permissionLabels).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(key)}
                    onChange={() => handlePermissionToggle(key)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              onClick={
                editingLibrarian ? handleUpdateLibrarian : handleAddLibrarian
              }
              disabled={isLoading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isLoading
                ? "Processing..."
                : editingLibrarian
                ? "Update Librarian"
                : "Add Librarian"}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingLibrarian(null);
                setFormData({
                  name: "",
                  email: "",
                  password: "",
                  department: "",
                  accessLevel: "standard",
                  permissions: [],
                });
              }}
              disabled={isLoading}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Librarians List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6">
          <div className="space-y-4">
            {filteredLibrarians.map((librarian) => (
              <div
                key={librarian._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(librarian.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {librarian.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      <User className="inline h-4 w-4 mr-1" />
                      {librarian.email} | ID: {librarian.librarianId}
                    </p>
                    <p className="text-xs text-gray-500">
                      {librarian.department} | Joined:{" "}
                      {new Date(librarian.joinDate).toLocaleDateString()} | Last
                      Active: {librarian.lastActive || "Unknown"}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getAccessLevelColor(
                          librarian.accessLevel || "standard"
                        )}`}
                      >
                        {librarian.accessLevel || "standard"}
                      </span>
                      {(librarian.permissions || []).map((permission) => (
                        <span
                          key={permission}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {permissionLabels[permission] || permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                      librarian.status
                    )}`}
                  >
                    {librarian.status}
                  </span>
                  <button
                    onClick={() => handleEditLibrarian(librarian)}
                    className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      handleToggleStatus(librarian._id, librarian.status)
                    }
                    className={`p-2 rounded transition-colors ${
                      librarian.status === "active"
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {librarian.status === "active" ? "Suspend" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDeleteLibrarian(librarian._id)}
                    className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {filteredLibrarians.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No librarians found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
