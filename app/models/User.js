import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password
  role: { type: String, required: true, enum: ["student", "librarian", "admin"], default: "student" },
  studentId: { type: String, unique: true, sparse: true }, // Only for students, auto-generated
  librarianId: { type: String, unique: true, sparse: true }, // Only for librarians, auto-generated
  department: { type: String }, // For students and librarians
  joinDate: { type: Date, default: Date.now },
  status: { type: String, default: "active", enum: ["active", "suspended", "inactive"] },
  lastActive: { type: Date, default: Date.now },
  permissions: [{ type: String }], // For librarians and admins
  accessLevel: { type: String, default: "standard" }, // For librarians and admins
  booksBorrowed: { type: Number, default: 0 },
  fines: { type: Number, default: 0 }
}, { timestamps: true });

// Add indexes only once
// UserSchema.index({ email: 1 });
// UserSchema.index({ role: 1 });
// UserSchema.index({ studentId: 1 });

export default mongoose.models.User || mongoose.model("User", UserSchema);
