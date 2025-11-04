import mongoose, { Schema, Document, models, model } from "mongoose";

interface IBadge {
  id: string;
  name: string;
  dateEarned: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  role: "admin" | "organizer" | "manager" | "volunteer" | "public";
  phone?: string;
  avatarUrl?: string;
  points: number;
  badges: IBadge[];
  isActive: boolean;
  currentStatus: "available" | "busy" | "on_task" | "break";
  lastSeenAt?: Date;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  assignedTasks: mongoose.Types.ObjectId[];
  events: mongoose.Types.ObjectId[];
}

const BadgeSchema = new Schema<IBadge>(
  {
    id: String,
    name: String,
    dateEarned: Date,
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    role: {
      type: String,
      enum: ["admin", "organizer", "manager", "volunteer", "public"],
      default: "volunteer",
    },
    phone: String,
    avatarUrl: String,
    points: { type: Number, default: 0 },
    badges: [BadgeSchema],
    isActive: { type: Boolean, default: false },
    currentStatus: {
      type: String,
      enum: ["available", "busy", "on_task", "break"],
      default: "available",
    },
    lastSeenAt: Date,
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    assignedTasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ location: "2dsphere" });

export default models.User || model<IUser>("User", UserSchema);
