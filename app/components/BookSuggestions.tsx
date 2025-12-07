"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  BookOpen, 
  Star, 
  Plus,
  ExternalLink,
  Loader2,
  AlertCircle
} from "lucide-react";
import { googleBooksAPI, GoogleBook } from "../services/googleBooksApi";

interface BookSuggestionsProps {
  onBookSelect: (book: any) => void;
  userRole: string;
}

export default function BookSuggestions({ onBookSelect, userRole }: BookSuggestionsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchType, setSearchType] = useState("general");
  const [popularBooks, setPopularBooks] = useState<GoogleBook[]>([]);
  const [newReleases, setNewReleases] = useState<GoogleBook[]>([]);

  // Load popular books and new releases on component mount
  useEffect(() => {
    loadPopularBooks();
    loadNewReleases();
  }, []);

  const loadPopularBooks = async () => {
    try {
      const response = await googleBooksAPI.getPopularBooks("Computer Science", 6);
      setPopularBooks(response.items || []);
    } catch (error) {
      console.error("Error loading popular books:", error);
    }
  };

  const loadNewReleases = async () => {
    try {
      const response = await googleBooksAPI.getNewReleases(6);
      setNewReleases(response || []);
    } catch (error) {
      console.error("Error loading new releases:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      let response;
      
      switch (searchType) {
        case "isbn":
          response = await googleBooksAPI.searchByISBN(searchQuery);
          break;
        case "author":
          response = await googleBooksAPI.searchByAuthor(searchQuery);
          break;
        case "title":
          response = await googleBooksAPI.searchByTitle(searchQuery);
          break;
        case "category":
          response = await googleBooksAPI.searchByCategory(searchQuery);
          break;
        default:
          const searchData = await googleBooksAPI.searchBooks(searchQuery);
          response = searchData.items || [];
      }

      setSearchResults(Array.isArray(response) ? response : []);
    } catch (error) {
      setError("Failed to fetch books. Please try again.");
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSelect = (book: GoogleBook) => {
    const localBook = googleBooksAPI.convertToLocalBook(book);
    onBookSelect(localBook);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const BookCard = ({ book, showAddButton = true }: { book: GoogleBook; showAddButton?: boolean }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex space-x-4">
        <div className="flex-shrink-0">
          {book.volumeInfo?.imageLinks?.thumbnail ? (
            <img 
              src={book.volumeInfo.imageLinks.thumbnail} 
              alt={book.volumeInfo?.title || 'Book cover'}
              className="w-24 h-32 object-contain rounded border"
            />
          ) : (
            <div className="w-24 h-32 bg-gray-200 rounded border flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
            {book.volumeInfo?.title || 'Unknown Title'}
          </h3>
          <p className="text-sm text-gray-600 mb-1">
            By {book.volumeInfo?.authors?.join(', ') || 'Unknown Author'}
          </p>
          
          {book.volumeInfo?.averageRating && (
            <div className="flex items-center space-x-1 mb-1">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span className="text-xs text-gray-600">
                {book.volumeInfo.averageRating.toFixed(1)} ({book.volumeInfo.ratingsCount || 0} ratings)
              </span>
            </div>
          )}
          
          {book.volumeInfo?.publishedDate && (
            <p className="text-xs text-gray-500 mb-1">
              Published: {new Date(book.volumeInfo.publishedDate).getFullYear()}
            </p>
          )}
          
          {book.volumeInfo?.categories && book.volumeInfo.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {book.volumeInfo.categories.slice(0, 2).map((category: string, index: number) => (
                <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  {category}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex space-x-2">
            {showAddButton && (userRole === 'admin' || userRole === 'librarian') && (
              <button
                onClick={() => handleBookSelect(book)}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>Add to Library</span>
              </button>
            )}
            
            <a
              href={`https://books.google.com/books?id=${book.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              <span>View on Google</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Book Suggestions & Search</h2>
        <p className="text-gray-600 mb-4">
          Search for books using Google Books API or browse popular titles and new releases
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Books</h3>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for books, authors, ISBN, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="general">General Search</option>
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="isbn">ISBN</option>
              <option value="category">Category</option>
            </select>
          </div>
          
          <button
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              Search Results ({searchResults.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Popular Books Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Computer Science Books</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </div>

      {/* New Releases Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">New Releases</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {newReleases.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </div>

      {/* API Information */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-3">
          <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Google Books API Integration</h4>
            <p className="text-sm text-blue-700 mt-1">
              This system integrates with Google Books API to provide comprehensive book information, 
              including covers, ratings, and detailed metadata. To use this feature in production, 
              you'll need to set up a Google Books API key in your environment variables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
