import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMemory extends Document {
  userId: Types.ObjectId;
  contextId: string;
  content: string;
  category?: string; // e.g., 'survey', 'quiz', 'notes'
  createdAt: Date;
  updatedAt: Date;
}

const MemorySchema = new Schema<IMemory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    contextId: {
      type: String,
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: 'general',
      enum: ['survey', 'quiz', 'notes', 'preferences', 'general']
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient memory lookups by user and context
MemorySchema.index({ userId: 1, contextId: 1 });

const Memory = mongoose.model<IMemory>('Memory', MemorySchema);

export default Memory;
