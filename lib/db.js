import mongoose from "mongoose";

if (!process.env.DATABASE_URL) {
  throw new Error("Please add your Mongo URI to .env as DATABASE_URL");
}

const MONGODB_URI = process.env.DATABASE_URL;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      autoCreate: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        if (process.env.NODE_ENV === "development") {
          console.log("✅ MongoDB connected");
        }
        return mongoose;
      })
      .catch((error) => {
        console.error("MongoDB connection error:", error);
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
