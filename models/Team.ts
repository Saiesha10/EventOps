import mongoose, { Schema, Document, models, model } from "mongoose";

// This interface tells TypeScript what a Team looks like
export interface ITeam extends Document {
  name: string;
  active: boolean;
  members: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { 
      type: String, 
      required: [true, "Please provide a team name"],
      trim: true 
    },
    active: { 
      type: Boolean, 
      default: true 
    },
    members: [
      { 
        type: Schema.Types.ObjectId, 
        ref: "User" 
      }
    ],
  },
  { timestamps: true }
);

// This line is crucial for Next.js to prevent "OverwriteModelError"
const Team = models.Team || model<ITeam>("Team", TeamSchema);

export default Team;