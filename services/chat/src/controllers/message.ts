import { TryCatch } from "@server/shared";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import Message from "@/models/Message.js";
import Chat from "@/models/Chat.js";

export const sendMessage = TryCatch(async (req: Request, res: Response) => {
  const { chatId, text } = req.body;
  const image = req.file;
  const senderId = req.user?.userId;
  if (!senderId) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  if (!mongoose.isValidObjectId(chatId)) {
    res.status(400).json({
      message: "Invalid chat ID",
    });
    return;
  }

  if (!text && !image) {
    res.status(400).json({
      message: "Text or image is required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const isMember = chat.members.some(
    (member) => member.toString() === senderId,
  );
  if (!isMember) {
    res.status(403).json({
      message: "You are not a member of this chat",
    });
    return;
  }

  const otherMemberId = chat.members.find(
    (member) => member.toString() !== senderId,
  );

  // Socket setup

  let messageData = {
    chatId,
    sender: senderId,
    text: text ?? undefined,
    image: image
      ? {
          url: image.path,
          publicId: image.filename,
        }
      : undefined,
    messageType: image ? "image" : "text",
  };

  const message = new Message(messageData);
  const savedMessage = await message.save();
  const lastMessageText = image ? "Image sent" : (text ?? "");

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      lastMessage: {
        text: lastMessageText,
        sender: senderId,
      },
      updatedAt: new Date(),
    },
    { returnDocument: "after" },
  );
  console.log("updated chat:", updatedChat);

  // Emit to sockets

  res.status(201).json({
    message: {
      ...savedMessage.toObject(),
      otherMemberId,
    },
  });
});

export const getMessages = TryCatch(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { cursor, limit = "20" } = req.query;
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  if (!mongoose.isValidObjectId(chatId)) {
    res.status(400).json({
      message: "Invalid chat ID",
    });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const isMember = chat.members.some((member) => member.toString() === userId);
  if (!isMember) {
    res.status(403).json({
      message: "You are not a member of this chat",
    });
    return;
  }

  const pageSize = Math.min(parseInt(limit as string, 10) || 20, 50);

  const query: { chatId: mongoose.Types.ObjectId; createdAt?: { $lt: Date } } =
    {
      chatId: new mongoose.Types.ObjectId(chatId as string),
    };
  if (cursor && mongoose.isValidObjectId(cursor)) {
    // fetch createdAt of the cursor message, page strictly before it
    const cursorMessage = await Message.findById(cursor).select("createdAt");
    if (cursorMessage) {
      query.createdAt = { $lt: cursorMessage.createdAt };
    }
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(pageSize + 1); // fetch one extra to know if there's a next page

  const hasMore = messages.length > pageSize;
  const results = hasMore ? messages.slice(0, pageSize) : messages;
  const nextCursor = hasMore ? results[results.length - 1]!._id : null;

  res.status(200).json({
    messages: results.reverse(), // oldest-first for rendering
    nextCursor,
    hasMore,
  });
});

export const markAsSeen = TryCatch(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  if (!mongoose.isValidObjectId(chatId)) {
    res.status(400).json({
      message: "Invalid chat ID",
    });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const isMember = chat.members.some((member) => member.toString() === userId);
  if (!isMember) {
    res.status(403).json({
      message: "You are not a member of this chat",
    });
    return;
  }

  const result = await Message.updateMany(
    {
      chatId: new mongoose.Types.ObjectId(chatId as string),
      sender: { $ne: userId },
      seen: false,
    },
    { $set: { seen: true, seenAt: new Date() } },
  );

  // Emit to sockets — notify sender(s) their messages were seen

  res.status(200).json({
    message: "Messages marked as seen",
    modifiedCount: result.modifiedCount,
  });
});
