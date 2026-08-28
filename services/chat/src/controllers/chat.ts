import { TryCatch } from "@server/shared";
import type { Request, Response } from "express";
import axios from "axios";
import Chat from "@/models/Chat.js";
import mongoose from "mongoose";

export const createChat = TryCatch(async (req: Request, res: Response) => {
  const myUserId = req.user?.userId;
  const username = req.params.username;
  if (!username) {
    res.status(400).json({
      message: "Username is required",
    });
    return;
  }

  const normalizedUsername = String(username).toLowerCase().trim();

  // Ask User Service to resolve username -> userId
  const userResponse = await axios.get(
    `${process.env.USER_SERVICE_URL}/users/${normalizedUsername}`,
  );
  const otherUserId = userResponse.data.userId;

  const existingChat = await Chat.findOne({
    members: {
      $all: [myUserId, otherUserId],
    },
  });

  if (existingChat) {
    res.status(200).json({
      message: "Chat already exists",
      chat: existingChat._id.toString(),
    });
    return;
  }

  const chat = await Chat.create({
    members: [myUserId, otherUserId],
  });

  res.status(201).json({
    message: "Chat created successfully",
    chat: chat._id.toString(),
  });
});

export const getChats = TryCatch(async (req: Request, res: Response) => {
  const myUserId = req.user?.userId;
  if (!myUserId) {
    res.status(404).json({
      message: "User not found",
    });
    return;
  }

  const chats = await Chat.find({
    members: myUserId,
  }).sort({ updatedAt: -1 });

  res.status(200).json({
    message: "Chats fetched successfully",
    chats: chats.map((chat) => chat._id.toString()),
  });
});

export const getChat = TryCatch(async (req: Request, res: Response) => {
  const myUserId = req.user?.userId;
  const { chatId } = req.params;
  if (!myUserId) {
    res.status(404).json({
      message: "User not found",
    });
    return;
  }

  if (!mongoose.isValidObjectId(chatId)) {
    res.status(400).json({
      message: "Invalid chat ID",
    });
    return;
  }

  const chat = await Chat.findOne({
    _id: chatId,
    members: {
      $in: [myUserId],
    },
  });

  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  res.status(200).json({
    message: "Chat fetched successfully",
    chat,
  });
});
