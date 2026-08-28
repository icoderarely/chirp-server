import express from "express";
import { logger } from "@server/shared";
import "dotenv/config";
import { connectDB } from "./config/db.js";
import chatRoutes from "./routes/chat.js";

const PORT = process.env.PORT || 3003;

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use("/chat", chatRoutes);

app.listen(PORT, () => {
  logger.info(`Chat service is running on port ${PORT}`);
});

export default app;
