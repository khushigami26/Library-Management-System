import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['borrow', 'return', 'renew'], required: true },
  borrowDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnDate: Date,
  fineAmount: { type: Number, default: 0 },
  finePaid: { type: Boolean, default: false },
  finePaidDate: Date,
  status: { type: String, enum: ['active', 'returned', 'overdue'], default: 'active' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String
});

export default mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);
