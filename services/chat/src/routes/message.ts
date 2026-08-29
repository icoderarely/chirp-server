import { Router } from "express";
import { getMessages, markAsSeen, sendMessage } from "@/controllers/message.js";
import { uploadImage } from "@/middlewares/multer.js";
import { authMiddleware } from "@/middlewares/auth.js";

const router = Router();

router.post("/", authMiddleware, uploadImage.single("image"), sendMessage);
router.get("/:chatId", authMiddleware, getMessages);
router.put("/:chatId/seen", authMiddleware, markAsSeen);

export default router;
