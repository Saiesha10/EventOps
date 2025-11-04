import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description?: string;
  organizer?: mongoose.Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
  venue: {
    name?: string;
    address?: string;
    coordinates: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  public: boolean;
  status: "draft" | "scheduled" | "running" | "completed" | "cancelled";
  volunteers: mongoose.Types.ObjectId[];
  teams: {
    name: string;
    members: mongoose.Types.ObjectId[];
  }[];
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: String,
    organizer: { type: Schema.Types.ObjectId, ref: "User" },
    startDate: Date,
    endDate: Date,
    venue: {
      name: String,
      address: String,
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
    public: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["draft", "scheduled", "running", "completed", "cancelled"],
      default: "draft",
    },
    volunteers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    teams: [
      {
        name: String,
        members: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
    ],
  },
  { timestamps: true }
);

EventSchema.index({ "venue.coordinates": "2dsphere" });

export default models.Event || model<IEvent>("Event", EventSchema);
