import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  teamId: string;
  senderId: string;
  senderName: string;
  text: string;
  isBroadcast: boolean;
  timestamp: Date;
}

const MessageSchema: Schema = new Schema({
  teamId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  text: { type: String, required: true },
  isBroadcast: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);