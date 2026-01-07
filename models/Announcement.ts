import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IAnnouncement extends Document {
  text: string;
  createdAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    text: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.Announcement ||
  model<IAnnouncement>("Announcement", AnnouncementSchema);
