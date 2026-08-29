import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

const getJwtSecret = (): Secret => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
};

const getJwtExpiresIn = (): NonNullable<SignOptions["expiresIn"]> =>
  (process.env.JWT_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>) || "1h";

export const generateToken = (userId: string): string => {
  const options: SignOptions = {
    expiresIn: getJwtExpiresIn(),
  };
  return jwt.sign({ userId }, getJwtSecret(), options);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, getJwtSecret());
};
