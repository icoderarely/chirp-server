import {
  loginUser,
  logoutUser,
  myProfile,
  registerUser,
  getUserById,
  getUserByUsername,
  updateUser,
  verifyOtp,
} from "@/controllers/user.js";
import { authMiddleware } from "@/middlewares/index.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/logout", logoutUser);
router.get("/my-profile", authMiddleware, myProfile);
router.put("/update-user", authMiddleware, updateUser);
router.get("/id/:userId", authMiddleware, getUserById);
router.get("/:username", authMiddleware, getUserByUsername);

export default router;
