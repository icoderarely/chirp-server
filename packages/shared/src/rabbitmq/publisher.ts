import { getChannel } from "./connection.js";
import { logger } from "../utils/logger.js";

export const publishToQueue = async (
  queue: string,
  message: unknown,
): Promise<void> => {
  const channel = getChannel();

  await channel.assertQueue(queue, {
    durable: true,
  });

  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
  logger.info(`Message sent to queue: ${queue}`);
};
