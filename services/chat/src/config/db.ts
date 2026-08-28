import mongoose from "mongoose";
import { logger } from "@server/shared";
import "dotenv/config";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI ?? "");
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};
