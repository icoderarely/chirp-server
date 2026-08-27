import redis from "redis";
import { logger } from "@server/shared";
import "dotenv/config";

const redisClient = redis.createClient({
  url: process.env.REDIS_URL ?? "",
});

redisClient.on("connect", () => {
  logger.info("Connected to Redis");
});

redisClient.on("error", (error) => {
  logger.error("Redis error", error);
});

export default redisClient;
