import { Schema, Types } from "mongoose";
import mongoose from "mongoose";

export interface IMessage {
  chatId: Types.ObjectId;
  sender: string;
  text?: string;
  image?: {
    url: string;
    publicId: string;
  };
  messageType: "text" | "image";
  seen: boolean;
  seenAt?: Date;
  updatedAt?: Date;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: String,
      required: true,
    },
    text: { type: String },
    image: {
      url: { type: String },
      publicId: { type: String },
    },
    messageType: {
      type: String,
      enum: ["text", "image"],
      required: true,
    },
    seen: {
      type: Boolean,
      default: false,
    },
    seenAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ chatId: 1, createdAt: -1 });

export default mongoose.model<IMessage>("Message", messageSchema);
