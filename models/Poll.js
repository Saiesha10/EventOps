const mongoose = require("mongoose");

const { Schema, model, models } = mongoose;

/**
 * Option Schema
 */
const OptionSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  votes: {
    type: Number,
    default: 0,
  },
});

/**
 * Poll Schema
 */
const PollSchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
    },
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [OptionSchema],
      required: true,
    },
    voters: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    endsAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

/**
 * Export model safely (prevents OverwriteModelError)
 */
module.exports = models.Poll || model("Poll", PollSchema);
