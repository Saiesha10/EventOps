import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IFeedback extends Document {
  event?: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
  },
  { timestamps: true }
);

export default models.Feedback || model<IFeedback>("Feedback", FeedbackSchema);
