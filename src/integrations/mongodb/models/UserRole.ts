import { Schema, model, models } from "mongoose";

const userRoleSchema = new Schema({
  user_id: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], required: true },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

userRoleSchema.index({ user_id: 1, role: 1 }, { unique: true });

export const UserRole = models.UserRole || model("UserRole", userRoleSchema);
