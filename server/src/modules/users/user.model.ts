import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "super_admin" | "org_owner" | "employee" | "customer";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organizationId?: mongoose.Types.ObjectId;
  mustChangePassword: boolean; 
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["super_admin", "org_owner", "employee", "customer"],
      default: "org_owner",
    },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);