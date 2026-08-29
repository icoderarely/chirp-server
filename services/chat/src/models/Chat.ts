import mongoose, { Schema } from "mongoose";

export interface IChat {
  members: string[];

  lastMessage?: {
    text: string;
    sender: string;
  };

  updatedAt: Date;
  createdAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    members: {
      type: [String],
      required: true,
    },

    lastMessage: {
      text: {
        type: String,
      },
      sender: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  },
);

chatSchema.index({ members: 1 });

export default mongoose.model<IChat>("Chat", chatSchema);
