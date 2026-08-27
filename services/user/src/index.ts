import express from "express";
import { logger, connectToRabbitMQ } from "@server/shared";
import "dotenv/config";
import cors from "cors";

import connectDB from "@/config/db.js";
import redisClient from "@/config/redis.js";
import userRoutes from "@/routes/user.js";

const app = express();

connectDB();
redisClient.connect();
await connectToRabbitMQ();

const PORT = process.env.PORT ?? 3001;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

// Routes
app.use("/users", userRoutes);

app.listen(PORT, () => {
  logger.info(`User service is running on port ${PORT}`);
});
