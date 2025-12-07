// Book-related TypeScript interfaces
interface BookUploadRequest {
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies?: number;
  location?: string;
  addedBy: string;
  image?: File;
}

interface BookUploadResponse {
  message: string;
  book: {
    id: string;
    title: string;
    author: string;
    isbn: string;
    category: string;
  };
}

interface BookUploadErrorResponse {
  error: string;
  details?: string[] | {
    fields?: string[];
    existingBook?: {
      title: string;
      author: string;
      isbn: string;
    };
  };
}

export type { BookUploadRequest, BookUploadResponse, BookUploadErrorResponse };