import mongoose, { Schema, Document, models, model } from "mongoose";

interface IMessage {
  sender: mongoose.Types.ObjectId;
  text: string;
  attachments?: { url: string; type: string }[];
  createdAt: Date;
}

export interface IChat extends Document {
  event?: mongoose.Types.ObjectId;
  room?: string;
  messages: IMessage[];
}

const MessageSchema = new Schema<IMessage>({
  sender: { type: Schema.Types.ObjectId, ref: "User" },
  text: String,
  attachments: [{ url: String, type: String }],
  createdAt: { type: Date, default: Date.now },
});

const ChatSchema = new Schema<IChat>(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    room: String,
    messages: [MessageSchema],
  },
  { timestamps: true }
);

export default models.Chat || model<IChat>("Chat", ChatSchema);
