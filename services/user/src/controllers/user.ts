import User from "@/model/User.js";
import { generateToken, publishToQueue, TryCatch } from "@server/shared";
import { type Request, type Response } from "express";
import redisClient from "@/config/redis.js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const LOGIN_MAX_ATTEMPTS = 3;
const LOGIN_WINDOW_SECONDS = 60;

const OTP_MAX_ATTEMPTS = 5;
const OTP_TTL_SECONDS = 60 * 5;

export const loginUser = TryCatch(async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ message: "Username and password are required" });
    return;
  }

  const normalizedUsername = String(username).toLowerCase().trim();
  const rateLimitKey = `login:attempts:${normalizedUsername}`;

  const attempts = await redisClient.incr(rateLimitKey);
  if (attempts === 1) {
    await redisClient.expire(rateLimitKey, LOGIN_WINDOW_SECONDS);
  }

  if (attempts > LOGIN_MAX_ATTEMPTS) {
    res
      .status(429)
      .json({ message: "Too many attempts. Please try again later." });
    return;
  }

  const user = await User.findOne({ username: normalizedUsername }).select(
    "+password",
  );
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  // Success — clear the counter so failed attempts before this don't linger.
  await redisClient.del(rateLimitKey);

  res.status(200).json({
    message: "Login successful",
    token: generateToken(user._id.toString()),
  });
});

export const registerUser = TryCatch(async (req: Request, res: Response) => {
  const { name, username, email, password } = req.body;
  if (!name || !username || !email || !password) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }
  if (password.length < 6) {
    res
      .status(400)
      .json({ message: "Password must be at least 6 characters long" });
    return;
  }

  const normalizedUsername = String(username).toLowerCase().trim();
  const normalizedEmail = String(email).toLowerCase().trim();

  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername) {
    res.status(400).json({ message: "Username already exists" });
    return;
  }

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    res.status(400).json({ message: "Email already exists" });
    return;
  }

  const otp = crypto.randomInt(100000, 1000000);
  const hashedPassword = await bcrypt.hash(password, 10);

  // Don't create the user yet — stash the pending registration in Redis
  // and only materialize it in Mongo once the OTP is verified.
  const pendingKey = `pending-registration:${normalizedUsername}`;
  await redisClient.set(
    pendingKey,
    JSON.stringify({
      name,
      username: normalizedUsername,
      email: normalizedEmail,
      hashedPassword,
    }),
    { EX: OTP_TTL_SECONDS },
  );

  const otpKey = `otp:${normalizedUsername}`;
  await redisClient.set(otpKey, otp, { EX: OTP_TTL_SECONDS });

  const message = {
    to: normalizedEmail,
    subject: "OTP for registration",
    body: `Your OTP for registration is ${otp}. It will expire in 5 minutes.`,
  };
  await publishToQueue("send-otp", message);

  res
    .status(200)
    .json({ message: "OTP sent. Please verify to complete registration." });
});

export const verifyOtp = TryCatch(async (req: Request, res: Response) => {
  const { username, otp } = req.body;
  if (!username || !otp) {
    res.status(400).json({ message: "Username and OTP are required" });
    return;
  }

  const normalizedUsername = String(username).toLowerCase().trim();

  const otpKey = `otp:${normalizedUsername}`;
  const attemptsKey = `otp:attempts:${normalizedUsername}`;
  const pendingKey = `pending-registration:${normalizedUsername}`;

  const storedOtp = await redisClient.get(otpKey);
  if (!storedOtp) {
    res.status(400).json({ message: "OTP expired or not found" });
    return;
  }

  // Cap brute-force guesses against the 6-digit OTP.
  const attempts = await redisClient.incr(attemptsKey);
  if (attempts === 1) {
    await redisClient.expire(attemptsKey, OTP_TTL_SECONDS);
  }
  if (attempts > OTP_MAX_ATTEMPTS) {
    res
      .status(429)
      .json({ message: "Too many attempts. Please restart registration." });
    return;
  }

  if (String(storedOtp) !== String(otp)) {
    res.status(400).json({ message: "Invalid OTP" });
    return;
  }

  const pendingData = await redisClient.get(pendingKey);
  if (!pendingData) {
    res
      .status(400)
      .json({ message: "Registration expired. Please register again." });
    return;
  }

  const {
    name,
    username: pendingUsername,
    email,
    hashedPassword,
  } = JSON.parse(pendingData);

  const newUser = await User.create({
    name,
    username: pendingUsername,
    email,
    password: hashedPassword,
    verified: true,
  });

  // Clean up so the OTP can't be replayed and the pending data doesn't linger.
  await redisClient.del(otpKey);
  await redisClient.del(attemptsKey);
  await redisClient.del(pendingKey);

  const userResponse = newUser.toObject();
  delete (userResponse as { password?: string }).password;

  res.status(200).json({
    message: "OTP verified successfully",
    user: userResponse,
    token: generateToken(newUser._id.toString()),
  });
});

export const myProfile = TryCatch(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({ user });
  },
);

export const updateUser = TryCatch(async (req: Request, res: Response) => {
  const { name, username } = req.body;
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const update: { name?: string; username?: string } = {};

  if (name !== undefined) {
    update.name = name;
  }

  if (username !== undefined) {
    update.username = username;
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({
      message: "Provide at least one field to update",
    });
    return;
  }

  const user = await User.findByIdAndUpdate(userId, update, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({
    message: "User updated successfully",
    user,
  });
});

export const getUserByUsername = TryCatch(
  async (req: Request, res: Response) => {
    const { username } = req.params;
    if (!username) {
      res.status(400).json({ message: "Username is required" });
      return;
    }
    const user = await User.findOne({ username }).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({ user });
  },
);
