import { type Channel } from "amqplib";
import { connectToRabbitMQ, getChannel, logger } from "@server/shared";
import "dotenv/config";
import { sendOtp } from "@/utils/index.js";

const QUEUE = "send-otp";
// const MAX_RETRIES = 3;

export const startOtpConsumer = async () => {
  try {
    await connectToRabbitMQ();
    const channel: Channel | null = getChannel();
    if (!channel) {
      throw new Error("RabbitMQ channel not found");
    }

    await channel.assertQueue(QUEUE, { durable: true });
    channel.prefetch(10);

    logger.info(`Waiting for messages in ${QUEUE}`);

    channel.consume(QUEUE, async (msg) => {
      if (msg) {
        const data = JSON.parse(msg.content.toString());
        await sendOtp(data);
        channel.ack(msg);
      }
    });
  } catch (error) {
    logger.error(`Failed to start OTP consumer: ${error}`);
  }
};
