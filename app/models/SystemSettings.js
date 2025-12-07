import mongoose from "mongoose";

const SystemSettingsSchema = new mongoose.Schema(
  {
    libraryName: { type: String, default: "University Library" },
    maxBooksPerUser: { type: Number, default: 5 },
    loanPeriodDays: { type: Number, default: 14 },
    sessionTimeoutMinutes: { type: Number, default: 30 },
    passwordPolicy: {
      type: String,
      enum: ["strong", "medium", "basic"],
      default: "strong",
    },
    twoFactorAuthMode: {
      type: String,
      enum: ["required_admins", "optional", "disabled"],
      default: "required_admins",
    },
  },
  { timestamps: true }
);

export default mongoose.models.SystemSettings ||
  mongoose.model("SystemSettings", SystemSettingsSchema);




