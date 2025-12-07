import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['due_reminder', 'overdue_alert', 'borrow_confirmation', 'return_confirmation', 'fine_notice', 'system_alert'] 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  bookTitle: { type: String },
  dueDate: { type: Date },
  fineAmount: { type: Number, default: 0 },
  isRead: { type: Boolean, default: false },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  actionRequired: { type: Boolean, default: false },
  actionUrl: { type: String },
  expiresAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Index for efficient queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired notifications

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
