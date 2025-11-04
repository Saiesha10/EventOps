import mongoose, { Schema, Document, models, model } from "mongoose";

export interface ILocation extends Document {
  user: mongoose.Types.ObjectId;
  event?: mongoose.Types.ObjectId;
  loc: {
    type: "Point";
    coordinates: [number, number];
  };
  accuracy?: number;
  recordedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    loc: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    accuracy: Number,
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LocationSchema.index({ loc: "2dsphere" });

export default models.Location || model<ILocation>("Location", LocationSchema);
