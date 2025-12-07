import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema({
  action: { 
    type: String, 
    required: [true, "Action is required"],
    maxlength: [100, "Action cannot be longer than 100 characters"],
    trim: true
  },
  details: { 
    type: String, 
    required: [true, "Details are required"],
    maxlength: [1000, "Details cannot be longer than 1000 characters"],
    trim: true
  },
  role: { 
    type: String, 
    default: "system",
    enum: {
      values: ["admin", "librarian", "student", "system"],
      message: "{VALUE} is not a valid role"
    }
  },
  actor: { 
    type: String, 
    default: "system",
    trim: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, { 
  timestamps: true,
  // Add index for better query performance
  indexes: [
    { timestamp: -1 },
    { action: 1 },
    { role: 1 }
  ]
});

export default mongoose.models.Activity || mongoose.model("Activity", ActivitySchema);
