import { Schema, model, Types, Document } from 'mongoose';

export type OrderStatus = 'pending' | 'confirmed' | 'fulfilled' | 'cancelled';

export interface IOrderItem {
  productId: Types.ObjectId;
  nameSnapshot: string;
  unitPriceSnapshot: number; // cents
  quantity: number;
  lineTotal: number; // cents
}

export interface IShippingAddressSnapshot {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  customerId: Types.ObjectId;
  createdBy: Types.ObjectId;
  items: IOrderItem[];
  status: OrderStatus;
  totalAmount: number;
  shippingAddressSnapshot?: IShippingAddressSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    nameSnapshot: { type: String, required: true },
    unitPriceSnapshot: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const shippingAddressSnapshotSchema = new Schema<IShippingAddressSnapshot>(
  {
    label: { type: String, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: 'Order must have at least one item',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'fulfilled', 'cancelled'],
      default: 'pending',
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingAddressSnapshot: {
      type: shippingAddressSnapshotSchema,
      required: false,
    },
  },
  { timestamps: true }
);

export const Order = model<IOrder>('Order', orderSchema);