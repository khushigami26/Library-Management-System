// Google Books API types and service
export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

export interface GoogleBooksResponse {
  items?: GoogleBook[];
  totalItems: number;
}

class GoogleBooksAPI {
  private baseUrl = 'https://www.googleapis.com/books/v1/volumes';
  private maxResults = 10;
  private apiKey = process.env.GOOGLE_BOOKS_API_KEY || '';
  
  async searchBooks(query: string, maxResults: number = 10): Promise<GoogleBooksResponse> {
    try {
      const params = new URLSearchParams({
        q: query,
        maxResults: maxResults.toString(),
        printType: 'books'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching from Google Books API:', error);
      return {
        items: [],
        totalItems: 0
      };
    }
  }

  async getBookById(id: string): Promise<GoogleBook | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching book by ID from Google Books API:', error);
      return null;
    }
  }

  async getPopularBooks(subject: string = "fiction", maxResults: number = 10): Promise<GoogleBooksResponse> {
    try {
      const query = `subject:${subject}`;
      const params = new URLSearchParams({
        q: query,
        maxResults: maxResults.toString(),
        orderBy: 'relevance',
        printType: 'books'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching popular books from Google Books API:', error);
      return {
        items: [],
        totalItems: 0
      };
    }
  }

  async getNewReleases(maxResults: number = 10): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        q: 'subject:fiction',
        orderBy: 'newest',
        maxResults: maxResults.toString(),
        printType: 'books'
      });
      
      const response = await fetch(`${this.baseUrl}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch new releases');
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching new releases:', error);
      return [];
    }
  }

  async searchByISBN(isbn: string): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        q: `isbn:${isbn}`,
        printType: 'books'
      });
      
      const response = await fetch(`${this.baseUrl}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search by ISBN');
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error searching by ISBN:', error);
      return [];
    }
  }

  async searchByAuthor(author: string, maxResults: number = 10): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        q: `inauthor:${author}`,
        maxResults: maxResults.toString(),
        printType: 'books'
      });
      
      const response = await fetch(`${this.baseUrl}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search by author');
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error searching by author:', error);
      return [];
    }
  }

  async searchByTitle(title: string, maxResults: number = 10): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        q: `intitle:${title}`,
        maxResults: maxResults.toString(),
        printType: 'books'
      });
      
      const response = await fetch(`${this.baseUrl}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search by title');
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error searching by title:', error);
      return [];
    }
  }

  async getBookDetails(bookId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${bookId}`);
      if (!response.ok) {
        throw new Error('Failed to get book details');
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting book details:', error);
      return null;
    }
  }

  async searchByCategory(category: string, maxResults: number = 10): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        q: `subject:${category}`,
        maxResults: maxResults.toString(),
        printType: 'books'
      });
      
      const response = await fetch(`${this.baseUrl}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search by category');
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error searching by category:', error);
      return [];
    }
  }

  convertToLocalBook(googleBook: any): any {
    const { volumeInfo } = googleBook;
    
    return {
      id: googleBook.id,
      title: volumeInfo?.title || 'Unknown Title',
      authors: volumeInfo?.authors || ['Unknown Author'],
      publisher: volumeInfo?.publisher || 'Unknown Publisher',
      publishedDate: volumeInfo?.publishedDate || '',
      description: volumeInfo?.description || '',
      pageCount: volumeInfo?.pageCount || 0,
      categories: volumeInfo?.categories || [],
      averageRating: volumeInfo?.averageRating || 0,
      ratingsCount: volumeInfo?.ratingsCount || 0,
      imageLinks: volumeInfo?.imageLinks || {},
      industryIdentifiers: volumeInfo?.industryIdentifiers || [],
      language: volumeInfo?.language || 'en',
      googleBooksId: googleBook.id
    };
  }

  // Helper method to format book data for our application
  formatBookForLibrary(googleBook: GoogleBook) {
    const { volumeInfo } = googleBook;
    
    return {
      title: volumeInfo.title || 'Unknown Title',
      author: volumeInfo.authors?.join(', ') || 'Unknown Author',
      isbn: volumeInfo.industryIdentifiers?.find(id => 
        id.type === 'ISBN_13' || id.type === 'ISBN_10'
      )?.identifier || '',
      publisher: volumeInfo.publisher || 'Unknown Publisher',
      publishedDate: volumeInfo.publishedDate || '',
      pages: volumeInfo.pageCount || 0,
      category: volumeInfo.categories?.[0] || 'General',
      description: volumeInfo.description || '',
      imageUrl: volumeInfo.imageLinks?.thumbnail || '',
      googleBooksId: googleBook.id
    };
  }
}

export const googleBooksAPI = new GoogleBooksAPI();