import { Router } from "express";
import { createChat, getChats, getChat } from "@/controllers/chat.js";
import { authMiddleware } from "@/middlewares/auth.js";

const router = Router();

router.post("/:username", authMiddleware, createChat);
router.get("/", authMiddleware, getChats);
router.get("/:chatId", authMiddleware, getChat);

export default router;
