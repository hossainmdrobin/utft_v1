import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/utft";

let connected = false;

export async function connectDB() {
  if (!connected && mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    connected = true;
  }
  return mongoose.connection;
}

export { mongoose };
