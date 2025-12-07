import dbConnect from "./db";
import Notification from "../app/models/Notification";

/**
 * Notification Service for creating and managing student notifications
 */
class NotificationService {
  /**
   * Create a due reminder notification
   */
  async createDueReminder(userId, bookId, bookTitle, dueDate) {
    try {
      await dbConnect();
      
      const daysUntilDue = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
      
      const notification = await Notification.create({
        userId,
        type: 'due_reminder',
        title: 'Book Due Soon',
        message: `Your book "${bookTitle}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. Please return it on time to avoid fines.`,
        bookId,
        bookTitle,
        dueDate: new Date(dueDate),
        priority: daysUntilDue <= 1 ? 'high' : 'medium',
        actionRequired: true,
        actionUrl: '/student/dashboard?tab=borrowed',
        expiresAt: new Date(dueDate)
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating due reminder:', error);
      throw error;
    }
  }

  /**
   * Create an overdue alert notification
   */
  async createOverdueAlert(userId, bookId, bookTitle, dueDate, fineAmount) {
    try {
      await dbConnect();
      
      const daysOverdue = Math.ceil((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
      
      const notification = await Notification.create({
        userId,
        type: 'overdue_alert',
        title: 'Book Overdue',
        message: `Your book "${bookTitle}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. Current fine: $${fineAmount.toFixed(2)}. Please return it immediately.`,
        bookId,
        bookTitle,
        dueDate: new Date(dueDate),
        fineAmount,
        priority: 'urgent',
        actionRequired: true,
        actionUrl: '/student/dashboard?tab=borrowed'
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating overdue alert:', error);
      throw error;
    }
  }

  /**
   * Create a borrow confirmation notification
   */
  async createBorrowConfirmation(userId, bookId, bookTitle, dueDate) {
    try {
      await dbConnect();
      
      const notification = await Notification.create({
        userId,
        type: 'borrow_confirmation',
        title: 'Book Borrowed Successfully',
        message: `You have successfully borrowed "${bookTitle}". Due date: ${new Date(dueDate).toLocaleDateString()}.`,
        bookId,
        bookTitle,
        dueDate: new Date(dueDate),
        priority: 'low',
        actionRequired: false,
        actionUrl: '/student/dashboard?tab=borrowed'
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating borrow confirmation:', error);
      throw error;
    }
  }

  /**
   * Create a return confirmation notification
   */
  async createReturnConfirmation(userId, bookTitle, fineAmount = 0) {
    try {
      await dbConnect();
      
      const message = fineAmount > 0 
        ? `You have successfully returned "${bookTitle}". Fine amount: $${fineAmount.toFixed(2)}.`
        : `You have successfully returned "${bookTitle}". Thank you for returning it on time!`;
      
      const notification = await Notification.create({
        userId,
        type: 'return_confirmation',
        title: 'Book Returned Successfully',
        message,
        bookTitle,
        fineAmount,
        priority: 'low',
        actionRequired: fineAmount > 0,
        actionUrl: fineAmount > 0 ? '/student/dashboard?tab=fines' : undefined
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating return confirmation:', error);
      throw error;
    }
  }

  /**
   * Create a fine notice notification
   */
  async createFineNotice(userId, bookTitle, fineAmount) {
    try {
      await dbConnect();
      
      const notification = await Notification.create({
        userId,
        type: 'fine_notice',
        title: 'Fine Notice',
        message: `You have a fine of $${fineAmount.toFixed(2)} for "${bookTitle}". Please pay it to continue borrowing books.`,
        bookTitle,
        fineAmount,
        priority: 'high',
        actionRequired: true,
        actionUrl: '/student/dashboard?tab=fines'
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating fine notice:', error);
      throw error;
    }
  }

  /**
   * Create a system alert notification
   */
  async createSystemAlert(userId, title, message, priority = 'medium', actionRequired = false, actionUrl = null) {
    try {
      await dbConnect();
      
      const notification = await Notification.create({
        userId,
        type: 'system_alert',
        title,
        message,
        priority,
        actionRequired,
        actionUrl
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating system alert:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, unreadOnly = false, limit = 50) {
    try {
      await dbConnect();
      
      let query = { userId };
      if (unreadOnly) {
        query.isRead = false;
      }
      
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);
      
      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      await dbConnect();
      
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true },
        { new: true }
      );
      
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId) {
    try {
      await dbConnect();
      
      await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    try {
      await dbConnect();
      
      const count = await Notification.countDocuments({
        userId,
        isRead: false
      });
      
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
