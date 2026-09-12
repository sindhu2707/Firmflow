import { Schema, model, Types, Document } from 'mongoose';

export interface IProduct extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  sku: string;
  description?: string;
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const productSchema = new Schema<IProduct>(
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
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'price must be an integer (cents)',
      },
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'stock must be an integer',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// sku unique per org, not globally
productSchema.index({ organizationId: 1, sku: 1 }, { unique: true });

export const Product = model<IProduct>('Product', productSchema);