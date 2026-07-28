import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashed: string) {
  return bcrypt.compare(password, hashed);
}

export async function createUser(userData: { email: string; password: string; name?: string }) {
  const hashed = await hashPassword(userData.password);
  const user = await User.create({ ...userData, password: hashed });
  const token = generateToken(user._id);
  return { user: { id: String(user._id), email: user.email, name: user.name }, token };
}

export async function signInUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error("Invalid credentials");
    (error as any).status = 401;
    throw error;
  }
  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    const error = new Error("Invalid credentials");
    (error as any).status = 401;
    throw error;
  }
  const token = generateToken(user._id);
  return { user: { id: String(user._id), email: user.email, name: user.name }, token };
}

export function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}
