import mongoose, { Schema, Document, models, model } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  event?: mongoose.Types.ObjectId;
  assignee?: mongoose.Types.ObjectId;
  status: "pending" | "in_progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high";
  dueAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: String,
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "blocked"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

TaskSchema.index({ assignee: 1 });

export default models.Task || model<ITask>("Task", TaskSchema);
