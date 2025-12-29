import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env["PORT"] || 3000;

export const ENV = process.env["NODE_ENV"] || "local";

export const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const REPLICA_URL = process.env["REPLICA_URL"] || DATABASE_URL;

export const ORIGINS = process.env["ORIGINS"]?.split(",") || [];

export const PEXELS_API_KEY = process.env["PEXELS_API_KEY"];

export const CLERK_SECRET_KEY = process.env["CLERK_SECRET_KEY"];

export const CLERK_PUBLISHABLE_KEY =
  process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"];
