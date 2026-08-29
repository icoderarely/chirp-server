import multer from "multer";
import cloudinary from "@/config/cloudinary.js";
import { randomUUID } from "crypto";
import CloudinaryStorage from "multer-storage-cloudinary";

const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "gif", "webp"] as const;

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "chat-images",
    allowed_formats: [...ALLOWED_FORMATS],
    public_id: () => randomUUID(),
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});
