import { required } from "@server/shared";

export const env = {
  INTERNAL_SECRET: required("INTERNAL_SECRET"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: required("JWT_EXPIRES_IN"),
  PORT: required("PORT"),
  MONGODB_URI: required("MONGODB_URI"),
  USER_SERVICE_URL: required("USER_SERVICE_URL"),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  CLOUDINARY_CLOUD_NAME: required("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: required("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: required("CLOUDINARY_API_SECRET"),
};
