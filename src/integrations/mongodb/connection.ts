import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/utft";

declare global {
  var mongooseCache: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
}

if (!global.mongooseCache) {
  global.mongooseCache = { conn: null, promise: null };
}

const cached = global.mongooseCache;

export async function connectDB() {
  if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
    return;
  }

  if (mongoose.connection.readyState >= 1) {
    return;
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).then(() => mongoose.connection);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export { mongoose };
