import "dotenv/config";
import express from "express";
import { logger } from "@server/shared";
import { connectDB } from "@/config/db.js";
import chatRoutes from "@/routes/chat.js";
import messageRoutes from "@/routes/message.js";
import { app, server } from "@/config/socket.js";
const PORT = process.env.PORT || 3003;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use("/chat", chatRoutes);
app.use("/messages", messageRoutes);

server.listen(PORT, () => {
  logger.info(`Chat service is running on port ${PORT}`);
});

export default app;
