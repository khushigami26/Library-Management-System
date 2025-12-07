"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  BookOpen,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { addActivity } from "@/lib/activity";

interface Book {
  _id?: string;
  id?: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  status: string;
  location: string;
  imageUrl?: string;
  rating?: number;
  ratingsCount?: number;
  pageCount?: number;
  language?: string;
  publishedYear?: number;
  publisher?: string;
  description?: string;
}

interface BookManagementProps {
  userRole: string;
  onBookChange?: () => void; // Callback for when books are added/updated
}

export default function BookManagement({
  userRole,
  onBookChange,
}: BookManagementProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    description: "",
    totalCopies: 1,
    location: "",
    imageUrl: "",
    rating: 0,
    ratingsCount: 0,
    pageCount: 0,
    language: "en",
    publishedYear: 0,
    publisher: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch books with caching and retries
  useEffect(() => {
    // Load cached books immediately if available
    try {
      const cachedData = localStorage.getItem("books_cache");
      if (cachedData) {
        const { books: cachedBooks, timestamp } = JSON.parse(cachedData);
        // Use cache if it's less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setBooks(cachedBooks);
        }
      }
    } catch (error) {
      console.error("Error loading cached books:", error);
    }

    // Fetch fresh data
    fetchBooks();

    // Set up polling interval for real-time updates
    const interval = setInterval(fetchBooks, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Cleanup image preview URLs when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const fetchBooks = async (retryCount = 3) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      // Create a timeout promise with longer timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 15000)
      );

      // Actual fetch request with credentials
      const fetchPromise = fetch("/api/books", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Race between timeout and fetch
      const response = (await Promise.race([
        fetchPromise,
        timeoutPromise,
      ])) as Response;

      if (response.ok) {
        const data = await response.json();
        setBooks(data.books);

        // Cache the books data
        try {
          localStorage.setItem(
            "books_cache",
            JSON.stringify({
              books: data.books,
              timestamp: Date.now(),
            })
          );
        } catch (error) {
          console.error("Error caching books:", error);
        }
      } else {
        throw new Error("Failed to fetch books");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Request timed out") {
        console.warn("Books fetch timed out - using cached data if available");
        // Try to use cached data
        try {
          const cached = localStorage.getItem("books_cache");
          if (cached) {
            const { books: cachedBooks } = JSON.parse(cached);
            if (cachedBooks && cachedBooks.length > 0) {
              setBooks(cachedBooks);
              toast.error("Using cached book data. Network is slow.");
              setIsLoading(false);
              return;
            }
          }
        } catch (cacheError) {
          console.error("Error reading cached books:", cacheError);
        }
      } else {
        console.error("Error fetching books:", error);
      }

      // Retry logic for failed requests
      if (retryCount > 0) {
        setTimeout(() => {
          fetchBooks(retryCount - 1);
        }, 2000); // Wait 2 seconds before retrying
      } else {
        toast.error("Failed to fetch books. Please try refreshing the page.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setSelectedImage(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const logActivity = async (
    action: string,
    details: string,
    entityId?: string,
    entityName?: string
  ) => {
    try {
      await addActivity(
        action,
        details,
        "librarian",
        undefined,
        "book",
        entityId,
        entityName
      );
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  const handleAddBook = async () => {
    if (!formData.title || !formData.author || !formData.isbn) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Create FormData for multipart/form-data submission
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("author", formData.author);
      formDataToSend.append("isbn", formData.isbn);
      formDataToSend.append("category", formData.category);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("totalCopies", formData.totalCopies.toString());
      formDataToSend.append("location", formData.location);

      // Append image if selected
      if (selectedImage) {
        formDataToSend.append("image", selectedImage);
      }

      const response = await fetch("/api/books/upload", {
        method: "POST",
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        // Add activity log
        await logActivity(
          "New book added",
          `"${formData.title}" by ${formData.author} added to catalog`,
          data.book?.id,
          formData.title
        );

        setFormData({
          title: "",
          author: "",
          isbn: "",
          category: "",
          description: "",
          totalCopies: 1,
          location: "",
          imageUrl: "",
          rating: 0,
          ratingsCount: 0,
          pageCount: 0,
          language: "en",
          publishedYear: 0,
          publisher: "",
        });
        setShowAddForm(false);
        toast.success("Book added successfully!");

        // Refresh the books list
        fetchBooks();
        onBookChange?.(); // Notify parent component
      } else {
        toast.error(data.error || "Failed to add book");
      }
    } catch (error) {
      console.error("Error adding book:", error);
      toast.error("Failed to add book");
    }
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      description: book.description || "",
      totalCopies: book.totalCopies,
      location: book.location,
      imageUrl: book.imageUrl || "",
      rating: book.rating || 0,
      ratingsCount: book.ratingsCount || 0,
      pageCount: book.pageCount || 0,
      language: book.language || "en",
      publishedYear: book.publishedYear || 0,
      publisher: book.publisher || "",
    });
  };

  const handleUpdateBook = async () => {
    if (!editingBook) return;

    const oldTitle = editingBook.title;
    const bookId = editingBook._id || editingBook.id;

    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          author: formData.author,
          isbn: formData.isbn,
          category: formData.category,
          description: formData.description,
          totalCopies: formData.totalCopies,
          location: formData.location,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add activity log
        await logActivity(
          "Book updated",
          `"${oldTitle}" updated to "${formData.title}"`,
          bookId,
          formData.title
        );

        setEditingBook(null);
        setFormData({
          title: "",
          author: "",
          isbn: "",
          category: "",
          description: "",
          totalCopies: 1,
          location: "",
          imageUrl: "",
          rating: 0,
          ratingsCount: 0,
          pageCount: 0,
          language: "en",
          publishedYear: 0,
          publisher: "",
        });
        toast.success("Book updated successfully!");

        // Refresh the books list
        fetchBooks();
        onBookChange?.(); // Notify parent component
      } else {
        toast.error(data.error || "Failed to update book");
      }
    } catch (error) {
      console.error("Error updating book:", error);
      toast.error("Failed to update book");
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    const bookToDelete = books.find((book) => (book._id || book.id) === bookId);
    if (!bookToDelete) return;

    if (confirm("Are you sure you want to delete this book?")) {
      try {
        const response = await fetch(`/api/books/${bookId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          // Add activity log
          await logActivity(
            "Book removed",
            `"${bookToDelete.title}" removed from catalog`,
            bookId,
            bookToDelete.title
          );
          toast.success("Book deleted successfully!");

          // Refresh the books list
          fetchBooks();
          onBookChange?.(); // Notify parent component
        } else {
          toast.error("Failed to delete book");
        }
      } catch (error) {
        console.error("Error deleting book:", error);
        toast.error("Failed to delete book");
      }
    }
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.isbn.includes(searchQuery)
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "borrowed":
        return <Users className="h-5 w-5 text-blue-600" />;
      case "overdue":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <BookOpen className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "borrowed":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Book Management</h2>
        <div className="flex space-x-2">
          {(userRole === "admin" || userRole === "librarian") && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add New Book</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search books by title, author, or ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Add/Edit Book Form */}
      {(showAddForm || editingBook) && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingBook ? "Edit Book" : "Add New Book"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Image Upload Section */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Book Cover Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <div className="relative w-full aspect-[2/3] mb-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="rounded-lg object-cover w-full h-full"
                      />
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Upload a cover image</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleImageSelect}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Book Details Section */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Book title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author *
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => handleInputChange("author", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Author name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ISBN *
                </label>
                <input
                  type="text"
                  value={formData.isbn}
                  onChange={(e) => handleInputChange("isbn", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ISBN number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    handleInputChange("category", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Programming">Programming</option>
                  <option value="Database">Database</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Literature">Literature</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Copies
                </label>
                <input
                  type="number"
                  value={formData.totalCopies}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = value === "" ? 1 : parseInt(value) || 1;
                    handleInputChange("totalCopies", numValue);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Shelf location"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex space-x-3">
            <button
              onClick={editingBook ? handleUpdateBook : handleAddBook}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingBook ? "Update Book" : "Add Book"}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingBook(null);
                const resetForm = () => {
                  setFormData({
                    title: "",
                    author: "",
                    isbn: "",
                    category: "",
                    description: "",
                    totalCopies: 1,
                    location: "",
                    imageUrl: "",
                    rating: 0,
                    ratingsCount: 0,
                    pageCount: 0,
                    language: "en",
                    publishedYear: 0,
                    publisher: "",
                  });
                  setSelectedImage(null);
                  setImagePreview(null);
                };
                resetForm();
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Books List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
            {filteredBooks.map((book) => (
              <div
                key={book._id || book.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                {/* Book Image Section */}
                <div className="relative h-80 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden flex items-center justify-center">
                  {book.imageUrl ? (
                    <img
                      src={book.imageUrl}
                      alt={book.title}
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = "none";
                        const nextElement =
                          target.nextElementSibling as HTMLElement;
                        if (nextElement) {
                          nextElement.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full flex items-center justify-center text-gray-400 ${
                      book.imageUrl ? "hidden" : "flex"
                    }`}
                  >
                    <div className="text-center">
                      <BookOpen className="h-16 w-16 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">No Image</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full shadow-sm ${getStatusColor(
                        book.status
                      )}`}
                    >
                      {book.status}
                    </span>
                  </div>

                  {/* Action Buttons Overlay */}
                  {(userRole === "admin" || userRole === "librarian") && (
                    <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditBook(book)}
                          className="p-2 bg-white/90 backdrop-blur-sm text-blue-700 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                          title="Edit book"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteBook(book._id || book.id || "")
                          }
                          className="p-2 bg-white/90 backdrop-blur-sm text-red-700 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                          title="Delete book"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Book Details Section */}
                <div className="p-5">
                  <div className="space-y-3">
                    {/* Title and Author */}
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2 mb-2">
                        {book.title}
                      </h3>
                      <p className="text-sm text-gray-600 font-medium">
                        By {book.author}
                      </p>
                    </div>

                    {/* Book Metadata */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                          ISBN
                        </span>
                        <span className="text-xs text-gray-700 font-mono">
                          {book.isbn}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                          Category
                        </span>
                        <span className="text-xs text-gray-700">
                          {book.category}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                          Copies
                        </span>
                        <span className="text-xs text-gray-700">
                          <span className="font-semibold text-green-600">
                            {book.availableCopies}
                          </span>
                          <span className="text-gray-400">
                            /{book.totalCopies}
                          </span>
                        </span>
                      </div>

                      {book.location && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 font-medium">
                            Location
                          </span>
                          <span className="text-xs text-gray-700">
                            {book.location}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Rating */}
                    {book.rating && (
                      <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center">
                          <span className="text-yellow-500 text-sm">★</span>
                          <span className="text-sm font-medium text-gray-700 ml-1">
                            {book.rating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          ({book.ratingsCount || 0} ratings)
                        </span>
                      </div>
                    )}

                    {/* Additional Details */}
                    {(book.pageCount ||
                      book.publishedYear ||
                      book.publisher) && (
                      <div className="pt-2 border-t border-gray-100 space-y-1">
                        {book.pageCount && (
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Pages:</span>{" "}
                            {book.pageCount}
                          </p>
                        )}
                        {book.publishedYear && (
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Published:</span>{" "}
                            {book.publishedYear}
                          </p>
                        )}
                        {book.publisher && (
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Publisher:</span>{" "}
                            {book.publisher}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredBooks.length === 0 && (
              <div className="col-span-full text-center py-16">
                <BookOpen className="h-20 w-20 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No books found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search criteria or add some books to get
                  started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
