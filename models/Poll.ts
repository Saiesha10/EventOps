import mongoose, { Schema, Document, models, model } from "mongoose";

interface IOption {
  id: string;
  text: string;
  votes: number;
}

export interface IPoll extends Document {
  event?: mongoose.Types.ObjectId;
  question: string;
  options: IOption[];
  voters: mongoose.Types.ObjectId[];
  endsAt?: Date;
}

const OptionSchema = new Schema<IOption>({
  id: String,
  text: String,
  votes: { type: Number, default: 0 },
});

const PollSchema = new Schema<IPoll>(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    question: String,
    options: [OptionSchema],
    voters: [{ type: Schema.Types.ObjectId, ref: "User" }],
    endsAt: Date,
  },
  { timestamps: true }
);

export default models.Poll || model<IPoll>("Poll", PollSchema);
