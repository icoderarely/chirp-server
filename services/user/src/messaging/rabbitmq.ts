// import { logger } from "@server/shared";
// import amqp, { type Channel } from "amqplib";

// let channel: Channel | null = null;

// export const connectToRabbitMQ = async () => {
//   try {
//     const url = process.env.RABBITMQ_URL;
//     if (!url) {
//       throw new Error("RABBITMQ_URL is not defined");
//     }

//     const connection = await amqp.connect(url);
//     channel = await connection.createChannel();
//     logger.info("Connected to RabbitMQ");
//   } catch (error) {
//     logger.error(`Failed to connect to RabbitMQ: ${error}`);
//   }
// };

// export const publishToQueue = async (queue: string, message: unknown) => {
//   if (!channel) {
//     logger.error("RabbitMQ channel not found");
//     return;
//   }
//   await channel.assertQueue(queue, { durable: false });
//   channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
//     persistent: true,
//   });
//   logger.info(`Message sent to queue: ${queue}`);
// };
