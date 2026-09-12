import { Schema, model, Types, Document } from 'mongoose';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

categorySchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Category = model<ICategory>('Category', categorySchema);