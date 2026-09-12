import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  firmId?: mongoose.Types.ObjectId; // nullable until Phase 4
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    firmId: { type: Schema.Types.ObjectId, ref: "Firm", default: null },
  },
  { timestamps: true }
);

export const Organization = mongoose.model<IOrganization>("Organization", organizationSchema);