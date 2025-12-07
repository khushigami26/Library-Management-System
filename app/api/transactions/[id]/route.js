import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Transaction from "@/app/models/Transaction";
import Book from "@/app/models/Book";
import { TransactionError, ResourceNotFoundError, InvalidActionError } from "@/types/transactions";

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { action, returnDate, fineAmount, finePaid, renewDays } = body;
    
    if (!id) {
      return NextResponse.json({ 
        success: false,
        error: "Validation Error",
        details: {
          field: "id",
          message: "Transaction ID is required"
        }
      }, { status: 400 });
    }

    await dbConnect();
    
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      throw new ResourceNotFoundError('Transaction', id);
    }
    
    let updateData = {};
    
    if (action === 'return') {
      const returnDateObj = returnDate ? new Date(returnDate) : new Date();
      const dueDateObj = new Date(transaction.dueDate);
      
      updateData = {
        returnDate: returnDateObj,
        status: 'returned',
        type: 'return'
      };
      
      // Calculate fine if overdue
      if (returnDateObj > dueDateObj) {
        const daysLate = Math.ceil((returnDateObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));
        updateData.fineAmount = daysLate * 0.50; // $0.50 per day
      }
      
      // Update book availability
      await Book.findByIdAndUpdate(transaction.bookId, { $inc: { availableCopies: 1 } });
    } else if (action === 'renew') {
      const currentDueDate = new Date(transaction.dueDate);
      const renewDaysToAdd = renewDays || 14;
      const newDueDate = new Date(currentDueDate.getTime() + renewDaysToAdd * 24 * 60 * 60 * 1000);
      
      updateData = {
        dueDate: newDueDate,
        type: 'renew',
        status: 'active'
      };
    } else if (action === 'payFine') {
      updateData = {
        finePaid: finePaid !== undefined ? finePaid : true,
        finePaidDate: finePaid ? new Date() : null
      };
    }
    
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('bookId', 'title author isbn imageUrl category').lean();
    
    return NextResponse.json({ 
      success: true,
      transaction: {
        _id: updatedTransaction._id,
        id: updatedTransaction._id.toString(),
        bookId: updatedTransaction.bookId?._id,
        bookTitle: updatedTransaction.bookId?.title,
        bookAuthor: updatedTransaction.bookId?.author,
        borrowDate: new Date(updatedTransaction.borrowDate).toISOString().split('T')[0],
        dueDate: new Date(updatedTransaction.dueDate).toISOString().split('T')[0],
        returnDate: updatedTransaction.returnDate ? new Date(updatedTransaction.returnDate).toISOString().split('T')[0] : null,
        status: updatedTransaction.status,
        fineAmount: updatedTransaction.fineAmount || 0,
        finePaid: updatedTransaction.finePaid || false
      }
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({
        success: false,
        error: "Not Found",
        details: error.message
      }, { status: 404 });
    }
    
    if (error instanceof InvalidActionError) {
      return NextResponse.json({
        success: false,
        error: "Invalid Action",
        details: error.message
      }, { status: 400 });
    }
    
    if (error instanceof TransactionError) {
      return NextResponse.json({
        success: false,
        error: error.code,
        details: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: "Internal Server Error",
      details: "An unexpected error occurred while updating the transaction"
    }, { status: 500 });
  }
}


