import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      required: true,
      enum: [
        "USER_ADDED",
        "USER_REMOVED",
        "USER_UPDATED",
        "BOOK_ADDED",
        "BOOK_REMOVED",
        "BOOK_UPDATED",
        "BOOK_BORROWED",
        "BOOK_RETURNED",
      ],
    },
    performedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
      userName: {
        type: String,
        required: true,
      },
      userRole: {
        type: String,
        required: true,
        enum: ["admin", "librarian", "student", "system"],
      },
    },
    targetEntity: {
      entityType: {
        type: String,
        required: true,
        enum: ["user", "book", "system"],
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
      },
      entityName: {
        type: String,
        required: true,
      },
      // Additional details about the entity
      additionalData: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    description: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Optional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ "performedBy.userRole": 1 });
activityLogSchema.index({ actionType: 1 });

// Create TTL index manually to ensure auto-deletion after 24 hours
activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

// Static method to log an activity
activityLogSchema.statics.logActivity = async function (activityData) {
  try {
    const log = new this(activityData);
    await log.save();
    return log;
  } catch (error) {
    console.error("Error logging activity:", error);
    throw error;
  }
};

// Static method to get recent activities
activityLogSchema.statics.getRecentActivities = async function (options = {}) {
  try {
    const {
      limit = 50,
      userRole = null,
      actionTypes = null,
      startDate = null,
      endDate = null,
    } = options;

    let query = {};

    // Filter by user role if specified
    if (userRole) {
      query["performedBy.userRole"] = userRole;
    }

    // Filter by action types if specified
    if (actionTypes && actionTypes.length > 0) {
      query.actionType = { $in: actionTypes };
    }

    // Filter by date range if specified
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const activities = await this.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate("performedBy.userId", "name email")
      .lean();

    return activities;
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    throw error;
  }
};

// Instance method to format activity for display
activityLogSchema.methods.toDisplayFormat = function () {
  return {
    id: this._id,
    action: this.actionType,
    performer: {
      name: this.performedBy.userName,
      role: this.performedBy.userRole,
    },
    target: {
      type: this.targetEntity.entityType,
      name: this.targetEntity.entityName,
    },
    description: this.description,
    timestamp: this.timestamp,
    timeAgo: this.getTimeAgo(),
  };
};

// Helper method to get human-readable time ago
activityLogSchema.methods.getTimeAgo = function () {
  const now = new Date();
  const diffMs = now - this.timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  return "Earlier today";
};

// Pre-save middleware to set description if not provided
activityLogSchema.pre("save", function (next) {
  if (!this.description) {
    this.description = this.generateDescription();
  }
  next();
});

// Method to generate description based on action type
activityLogSchema.methods.generateDescription = function () {
  const { actionType, performedBy, targetEntity } = this;

  switch (actionType) {
    case "USER_ADDED":
      return `${performedBy.userName} added new user "${targetEntity.entityName}"`;
    case "USER_REMOVED":
      return `${performedBy.userName} removed user "${targetEntity.entityName}"`;
    case "USER_UPDATED":
      return `${performedBy.userName} updated user "${targetEntity.entityName}"`;
    case "BOOK_ADDED":
      return `${performedBy.userName} added new book "${targetEntity.entityName}"`;
    case "BOOK_REMOVED":
      return `${performedBy.userName} removed book "${targetEntity.entityName}"`;
    case "BOOK_UPDATED":
      return `${performedBy.userName} updated book "${targetEntity.entityName}"`;
    case "BOOK_BORROWED":
      return `${performedBy.userName} borrowed book "${targetEntity.entityName}"`;
    case "BOOK_RETURNED":
      return `${performedBy.userName} returned book "${targetEntity.entityName}"`;
    default:
      return `${performedBy.userName} performed ${actionType} on ${targetEntity.entityName}`;
  }
};

const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
