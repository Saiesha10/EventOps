import { Model, Types } from "mongoose";

export interface IPollOption {
  id: string;
  text: string;
  votes: number;
}

export interface IPoll {
  _id: Types.ObjectId;
  event?: Types.ObjectId;
  question: string;
  options: IPollOption[];
  voters: Types.ObjectId[];
  endsAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

declare const Poll: Model<IPoll>;
export default Poll;
