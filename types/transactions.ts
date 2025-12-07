// Transaction-related TypeScript interfaces and error types

// Error types for more specific error handling
export class TransactionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class ResourceNotFoundError extends TransactionError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with ID ${id} not found`);
    this.name = 'ResourceNotFoundError';
  }
}

export class InvalidActionError extends TransactionError {
  constructor(action: string, reason: string) {
    super('INVALID_ACTION', `Invalid action "${action}": ${reason}`);
    this.name = 'InvalidActionError';
  }
}

// Response type for transaction endpoints
export interface TransactionResponse {
  success: boolean;
  transaction?: {
    _id: string;
    id: string;
    bookId: string;
    bookTitle: string;
    bookAuthor: string;
    borrowDate: string;
    dueDate: string;
    returnDate?: string | null;
    status: 'active' | 'returned' | 'overdue';
    fineAmount: number;
    finePaid: boolean;
    finePaidDate?: string | null;
    type: 'borrow' | 'return' | 'renew';
    notes?: string;
  };
  error?: string;
  details?: string | {
    [key: string]: any;
  };
}