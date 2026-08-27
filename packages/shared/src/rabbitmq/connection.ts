import amqp, { type Channel, type ChannelModel } from "amqplib";
import { logger } from "../utils/logger.js";
import "dotenv/config";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export const connectToRabbitMQ = async (): Promise<void> => {
  const url = process.env.RABBITMQ_URL;

  if (!url) {
    throw new Error("RABBITMQ_URL is not defined");
  }

  connection = await amqp.connect(url);
  channel = await connection.createChannel();

  logger.info("Connected to RabbitMQ");
};

export const getChannel = (): Channel => {
  if (!channel) {
    throw new Error("RabbitMQ channel is not connected");
  }

  return channel;
};
