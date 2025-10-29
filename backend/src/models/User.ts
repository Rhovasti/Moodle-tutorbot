import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  ltiUserId: string;
  name: string;
  email?: string;
  roles: string[];
  contextId: string;
  contextLabel?: string;
  contextTitle?: string;
  platformId: string;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    ltiUserId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      default: ''
    },
    roles: {
      type: [String],
      default: []
    },
    contextId: {
      type: String,
      required: true,
      index: true
    },
    contextLabel: {
      type: String,
      default: ''
    },
    contextTitle: {
      type: String,
      default: ''
    },
    platformId: {
      type: String,
      required: true,
      index: true
    },
    clientId: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient user lookups
UserSchema.index({ ltiUserId: 1, platformId: 1, contextId: 1 }, { unique: true });

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
