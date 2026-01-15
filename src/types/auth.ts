import { UserRole } from "@/prisma/generated/client";

export type AuthPayload = {
  dbUserId?: number;
  environment?: "development" | "production" | "local";
  role?: UserRole;
};
