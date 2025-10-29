import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface IChatHistory extends Document {
  userId: Types.ObjectId;
  contextId: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      required: true,
      enum: ['user', 'model']
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const ChatHistorySchema = new Schema<IChatHistory>(
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
    messages: {
      type: [ChatMessageSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient chat history lookups
ChatHistorySchema.index({ userId: 1, contextId: 1 }, { unique: true });

const ChatHistory = mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);

export default ChatHistory;
