"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
} from "lucide-react";
import { addActivity } from "@/lib/activity";
import toast from "react-hot-toast";

// Function to create notifications via API
const createNotification = async (notificationData: any) => {
  try {
    await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notificationData),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

interface Book {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  status: string;
  imageUrl?: string;
  description?: string;
  location?: string;
  rating?: number;
  ratingsCount?: number;
  pageCount?: number;
  language?: string;
  publishedYear?: number;
  publisher?: string;
}

interface Transaction {
  id: string;
  bookId?: string;
  bookTitle: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: string;
  fineAmount: number;
  finePaid: boolean;
}

interface BookOperationsProps {
  userId: string;
  onNotificationRefresh?: () => void;
}

export default function BookOperations({
  userId,
  onNotificationRefresh,
}: BookOperationsProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch books from API on first load
  useEffect(() => {
    if (books.length === 0) {
      fetchBooks();
    }
    // Fetch transactions to check borrowing limits
    if (userId && transactions.length === 0) {
      fetchTransactions();
    }
  }, [books.length, userId]);

  // Fetch transactions from API
  const fetchTransactions = async () => {
    // Get userId from props or localStorage
    const effectiveUserId =
      userId ||
      (() => {
        try {
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          return currentUser._id || currentUser.userId;
        } catch {
          return null;
        }
      })();

    if (!effectiveUserId) return;

    try {
      const response = await fetch(
        `/api/transactions?userId=${effectiveUserId}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.transactions) {
          // Convert to the format expected by the component
          const formattedTransactions = data.transactions.map((tx: any) => ({
            id: tx.id || tx._id,
            bookTitle: tx.bookTitle,
            borrowDate: tx.borrowDate,
            dueDate: tx.dueDate,
            returnDate: tx.returnDate,
            status: tx.status,
            fineAmount: tx.fineAmount || 0,
            finePaid: tx.finePaid || false,
          }));
          setTransactions(formattedTransactions);
        }
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      // Create a timeout promise to limit waiting time
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 8000)
      );

      // The actual fetch request
      const fetchPromise = fetch("/api/books");

      // Race between timeout and fetch
      const response = (await Promise.race([
        fetchPromise,
        timeoutPromise,
      ])) as Response;

      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || []);
      } else {
        console.error("Failed to fetch books");
        toast.error("Failed to load books");
      }
    } catch (error) {
      console.error("Error fetching books:", error);
      if ((error as Error).message === "Request timed out") {
        toast.error("Request timed out. Please try again later.");
      } else {
        toast.error("Error loading books");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load cached books from localStorage if available
  useEffect(() => {
    if (books.length === 0) {
      try {
        const cachedBooks = localStorage.getItem("cachedBooks");
        if (cachedBooks) {
          const parsedBooks = JSON.parse(cachedBooks);
          setBooks(parsedBooks);
          setIsLoading(false);

          // Still fetch fresh data in the background
          fetchBooks().catch(() => {});
        }
      } catch (error) {
        console.error("Error loading cached books:", error);
      }
    }
  }, []);

  // Cache books in localStorage when they're fetched
  useEffect(() => {
    if (books.length > 0) {
      try {
        localStorage.setItem("cachedBooks", JSON.stringify(books));
      } catch (error) {
        console.error("Error caching books:", error);
      }
    }
  }, [books]);

  const handleBorrowBook = async (bookId: string) => {
    const book = books.find((b) => b._id === bookId);
    if (!book || book.availableCopies === 0) return;

    // Get effective userId - try props first, then localStorage
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      try {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        effectiveUserId = currentUser._id || currentUser.userId;
      } catch (error) {
        console.error("Error reading user from localStorage:", error);
      }
    }

    if (!effectiveUserId) {
      toast.error("User ID not found. Please sign in again.");
      return;
    }

    // Check if student has overdue books
    const hasOverdue = transactions.some((t) => t.status === "overdue");
    if (hasOverdue) {
      toast.error(
        "You cannot borrow books while you have overdue books. Please return them first."
      );
      return;
    }

    // Check if student has reached borrowing limit (e.g., 5 books)
    const activeBooks = transactions.filter(
      (t) => t.status === "active"
    ).length;
    if (activeBooks >= 5) {
      toast.error(
        "You have reached the maximum borrowing limit (5 books). Please return some books first."
      );
      return;
    }

    try {
      // Save to database via API
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId,
          userId: effectiveUserId,
          type: "borrow",
          dueDate: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to borrow book");
      }

      const data = await response.json();
      if (data.success && data.transaction) {
        // Refresh transactions from database to get the complete data
        await fetchTransactions();

        // Refresh books list to update availability
        await fetchBooks();

        // Activity log
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        await addActivity(
          "Book borrowed",
          `${book.title} borrowed by ${currentUser.email || "student"}`,
          "student",
          currentUser.name,
          "book",
          book._id,
          book.title
        );

        // Create notification
        if (currentUser._id) {
          try {
            await createNotification({
              userId: currentUser._id,
              type: "borrow_confirmation",
              title: "Book Borrowed Successfully",
              message: `You have successfully borrowed "${book.title}". Due date: ${data.transaction.dueDate}.`,
              bookId: book._id,
              bookTitle: book.title,
              dueDate: data.transaction.dueDate,
              priority: "low",
              actionRequired: false,
              actionUrl: "/student/dashboard?tab=borrowed",
            });
          } catch (error) {
            console.error("Error creating borrow notification:", error);
          }
        }

        toast.success(
          `Successfully borrowed "${book.title}". Due date: ${data.transaction.dueDate}`
        );

        // Refresh notifications immediately
        if (onNotificationRefresh) {
          setTimeout(() => onNotificationRefresh(), 500);
        }
      }
    } catch (error) {
      console.error("Error borrowing book:", error);
      toast.error(
        (error as Error).message || "Failed to borrow book. Please try again."
      );
    }
  };

  const handleReturnBook = async (transactionId: string) => {
    const transaction = transactions.find((t) => t.id === transactionId);
    if (!transaction) return;

    try {
      // Update transaction in database via API
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "return",
          returnDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to return book");
      }

      const data = await response.json();
      if (data.success && data.transaction) {
        // Refresh transactions from database to get updated data
        await fetchTransactions();

        // Refresh books list to update availability
        await fetchBooks();

        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        await addActivity(
          "Book returned",
          `${transaction.bookTitle} returned by ${
            currentUser.email || "student"
          }${
            data.transaction.fineAmount > 0
              ? ` (fine $${data.transaction.fineAmount.toFixed(2)})`
              : ""
          }`,
          "student",
          currentUser.name,
          "book",
          transaction.bookId,
          transaction.bookTitle
        );

        // Create notification
        if (currentUser._id) {
          try {
            const message =
              data.transaction.fineAmount > 0
                ? `You have successfully returned "${
                    transaction.bookTitle
                  }". Fine amount: $${data.transaction.fineAmount.toFixed(2)}.`
                : `You have successfully returned "${transaction.bookTitle}". Thank you for returning it on time!`;

            await createNotification({
              userId: currentUser._id,
              type: "return_confirmation",
              title: "Book Returned Successfully",
              message,
              bookTitle: transaction.bookTitle,
              fineAmount: data.transaction.fineAmount || 0,
              priority: data.transaction.fineAmount > 0 ? "high" : "low",
              actionRequired: data.transaction.fineAmount > 0,
              actionUrl:
                data.transaction.fineAmount > 0
                  ? "/student/dashboard?tab=fines"
                  : undefined,
            });
          } catch (error) {
            console.error("Error creating return notification:", error);
          }
        }

        if (data.transaction.fineAmount > 0) {
          toast.error(
            `Book returned. You have a fine of $${data.transaction.fineAmount.toFixed(
              2
            )} for late return.`
          );
        } else {
          toast.success("Book returned successfully!");
        }

        // Refresh notifications immediately
        if (onNotificationRefresh) {
          setTimeout(() => onNotificationRefresh(), 500);
        }
      }
    } catch (error) {
      console.error("Error returning book:", error);
      toast.error(
        (error as Error).message || "Failed to return book. Please try again."
      );
    }
  };

  const handleRenew = async (transactionId: string) => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) return;

    try {
      // Renew transaction in database via API
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "renew",
          renewDays: 14,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to renew book");
      }

      const data = await response.json();
      if (data.success && data.transaction) {
        // Refresh transactions from database to get updated data
        await fetchTransactions();

        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        await addActivity(
          "Loan renewed",
          `${tx.bookTitle} renewed by ${currentUser.email || "student"} to ${
            data.transaction.dueDate
          }`,
          "student",
          currentUser.name,
          "book",
          tx.bookId,
          tx.bookTitle
        );

        // Create notification for book renewal
        if (currentUser._id) {
          try {
            // Find the book ID from the book title
            const book = books.find((b) => b.title === tx.bookTitle);
            const bookId = book ? book._id : undefined;

            await createNotification({
              userId: currentUser._id,
              type: "renewal_confirmation",
              title: "Book Loan Renewed",
              message: `You have successfully renewed "${
                tx.bookTitle
              }". New due date: ${new Date(
                data.transaction.dueDate
              ).toLocaleDateString()}.`,
              bookId,
              bookTitle: tx.bookTitle,
              dueDate: data.transaction.dueDate,
              priority: "low",
              actionRequired: false,
              actionUrl: "/student/dashboard?tab=borrowed",
            });

            toast.success(
              `Book loan renewed successfully. New due date: ${new Date(
                data.transaction.dueDate
              ).toLocaleDateString()}`
            );
          } catch (error) {
            console.error("Error creating renewal notification:", error);
          }
        }

        // Refresh notifications immediately
        if (onNotificationRefresh) {
          setTimeout(() => onNotificationRefresh(), 500);
        }
      }
    } catch (error) {
      console.error("Error renewing book:", error);
      toast.error(
        (error as Error).message || "Failed to renew book. Please try again."
      );
    }
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "borrowed":
        return <Clock className="h-5 w-5 text-blue-600" />;
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
      {/* Browse Books */}
      <div>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Browse Available Books
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search books by title, author, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading books...</p>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <BookOpen className="h-20 w-20 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No books found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search criteria or check back later for new
                  additions.
                </p>
              </div>
            ) : (
              filteredBooks.map((book) => (
                <div
                  key={book._id}
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

                    {/* Availability Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full shadow-sm ${
                          book.availableCopies > 0
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {book.availableCopies > 0
                          ? `${book.availableCopies} available`
                          : "Out of stock"}
                      </span>
                    </div>
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

                      {/* Borrow Button */}
                      <div className="pt-3">
                        <button
                          onClick={() => handleBorrowBook(book._id)}
                          disabled={book.availableCopies === 0}
                          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                            book.availableCopies > 0
                              ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          {book.availableCopies > 0
                            ? "Borrow Book"
                            : "No Copies Available"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
