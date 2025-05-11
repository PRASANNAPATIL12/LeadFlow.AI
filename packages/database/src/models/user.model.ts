// packages/database/src/models/user.model.ts
import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs'; // Changed from bcrypt to bcryptjs for wider Node.js compatibility without native compilation

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'user';
  organizationId: Schema.Types.ObjectId;
  lastLogin?: Date; // Made optional as default is null
  isActive: boolean;
  companyName?: string; // Added to align with auth.controller.ts usage
  title?: string;      // Added as it might be used by other parts (e.g. email agent)

  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'user'],
      default: 'user',
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    companyName: { // Added field
      type: String,
      trim: true,
    },
    title: { // Added field
        type: String,
        trim: true,
    }
  },
  {
    timestamps: true, // This adds createdAt and updatedAt fields
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser>('User', UserSchema);
