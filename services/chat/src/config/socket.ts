import { Server, type Socket } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE_NAME, logger } from "@server/shared";
import { env } from "@/config/env.js";
import Chat from "@/models/Chat.js";
import Message from "@/models/Message.js";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const onlineCounts = new Map<string, number>();

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : undefined;
}

function getOnlineUserIds(): string[] {
  const ids: string[] = [];
  for (const [userId, count] of onlineCounts) {
    if (count > 0) {
      ids.push(userId);
    }
  }
  return ids;
}

export function isUserOnline(userId: string): boolean {
  return (onlineCounts.get(userId) ?? 0) > 0;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io.to("user:" + userId).emit(event, payload);
}

export function emitToUsers(userIds: string[], event: string, payload: unknown): void {
  for (const id of userIds) {
    emitToUser(id, event, payload);
  }
}

async function markDeliveredForUser(userId: string) {
  const chats = await Chat.find({ members: userId }).select("_id members").lean();
  if (chats.length === 0) return;

  const chatIds = chats.map((chat) => chat._id);
  const pending = await Message.find({
    chatId: { $in: chatIds },
    sender: { $ne: userId },
    delivered: { $ne: true },
  })
    .select("chatId")
    .lean();

  if (pending.length === 0) return;

  await Message.updateMany(
    {
      chatId: { $in: chatIds },
      sender: { $ne: userId },
      delivered: { $ne: true },
    },
    { $set: { delivered: true, deliveredAt: new Date() } },
  );

  const notified = new Set<string>();
  for (const row of pending) {
    const chatId = row.chatId.toString();
    if (notified.has(chatId)) continue;
    notified.add(chatId);
    const chat = chats.find((item) => item._id.toString() === chatId);
    if (!chat) continue;
    emitToUsers(
      chat.members.map((member) => String(member)),
      "message:delivered",
      { chatId, deliveredTo: userId },
    );
  }
}

io.use((socket, next) => {
  const cookieToken = readCookie(socket.handshake.headers.cookie, AUTH_COOKIE_NAME);
  const auth = socket.handshake.auth as { token?: string };
  const token = cookieToken ?? auth.token;

  if (!token) {
    next(new Error("Unauthorized"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId?: string };
    const userId = payload.userId;
    if (!userId) {
      next(new Error("Unauthorized"));
      return;
    }
    socket.data.userId = userId;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket: Socket) => {
  const userId = socket.data.userId as string;
  logger.info(`User connected: ${userId} (${socket.id})`);

  socket.join("user:" + userId);

  const prev = onlineCounts.get(userId) ?? 0;
  onlineCounts.set(userId, prev + 1);
  if (prev === 0) {
    io.emit("presence:update", { userId, online: true });
    void markDeliveredForUser(userId);
  }

  socket.emit("presence:list", getOnlineUserIds());

  socket.on("disconnect", () => {
    logger.info(`User disconnected: ${userId} (${socket.id})`);
    const current = onlineCounts.get(userId) ?? 0;
    const next = current - 1;
    if (next <= 0) {
      onlineCounts.delete(userId);
      io.emit("presence:update", { userId, online: false });
    } else {
      onlineCounts.set(userId, next);
    }
  });
});

export { app, server, io };
