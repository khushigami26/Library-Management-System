import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Transaction from "@/app/models/Transaction";
import Book from "@/app/models/Book";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status'); // 'active', 'returned', 'overdue', or null for all
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await dbConnect();
    
    // Build query
    let query = { userId };
    if (status) {
      query.status = status;
    }
    
    // Fetch transactions with book details
    const transactions = await Transaction.find(query)
      .populate('bookId', 'title author isbn imageUrl category')
      .sort({ borrowDate: -1 })
      .lean();
    
    const now = new Date();
    
    // Format transactions for frontend and update overdue status
    const formattedTransactions = await Promise.all(transactions.map(async (tx) => {
      // Check if transaction is overdue
      let status = tx.status;
      if (status === 'active' && tx.dueDate && new Date(tx.dueDate) < now && !tx.returnDate) {
        // Update status to overdue in database
        await Transaction.findByIdAndUpdate(tx._id, { status: 'overdue' });
        status = 'overdue';
      }
      
      return {
        _id: tx._id,
        id: tx._id.toString(),
        bookId: tx.bookId?._id || tx.bookId,
        bookTitle: tx.bookId?.title || 'Unknown Book',
        bookAuthor: tx.bookId?.author || 'Unknown Author',
        bookIsbn: tx.bookId?.isbn || '',
        bookImageUrl: tx.bookId?.imageUrl,
        bookCategory: tx.bookId?.category || '',
        borrowDate: tx.borrowDate ? new Date(tx.borrowDate).toISOString().split('T')[0] : '',
        dueDate: tx.dueDate ? new Date(tx.dueDate).toISOString().split('T')[0] : '',
        returnDate: tx.returnDate ? new Date(tx.returnDate).toISOString().split('T')[0] : null,
        status: status,
        fineAmount: tx.fineAmount || 0,
        finePaid: tx.finePaid || false,
        finePaidDate: tx.finePaidDate ? new Date(tx.finePaidDate).toISOString().split('T')[0] : null,
        type: tx.type,
        notes: tx.notes || ''
      };
    }));
    
    return NextResponse.json({ 
      success: true,
      transactions: formattedTransactions 
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { bookId, userId, type = 'borrow', dueDate } = body;
    
    if (!bookId || !userId) {
      return NextResponse.json({ error: "Book ID and User ID are required" }, { status: 400 });
    }

    await dbConnect();
    
    // Calculate due date if not provided (default 14 days)
    const calculatedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    
    // Create transaction
    const transaction = await Transaction.create({
      bookId,
      userId,
      type,
      borrowDate: new Date(),
      dueDate: calculatedDueDate,
      status: 'active'
    });
    
    // Update book availability
    await Book.findByIdAndUpdate(bookId, { $inc: { availableCopies: -1 } });
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('bookId', 'title author isbn imageUrl category')
      .lean();
    
    return NextResponse.json({ 
      success: true,
      transaction: {
        _id: populatedTransaction._id,
        id: populatedTransaction._id.toString(),
        bookId: populatedTransaction.bookId?._id,
        bookTitle: populatedTransaction.bookId?.title,
        bookAuthor: populatedTransaction.bookId?.author,
        borrowDate: new Date(populatedTransaction.borrowDate).toISOString().split('T')[0],
        dueDate: new Date(populatedTransaction.dueDate).toISOString().split('T')[0],
        status: populatedTransaction.status
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

