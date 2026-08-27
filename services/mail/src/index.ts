import express from "express";
import { logger } from "@server/shared";
import "dotenv/config";
import { startOtpConsumer } from "@/messaging/otpConsumer.js";

const app = express();

const PORT = process.env.PORT ?? 3002;

startOtpConsumer();

app.listen(PORT, () => {
  logger.info(`Mail service is running on port ${PORT}`);
});
