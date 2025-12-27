import { UserRole } from "@/prisma/generated/enums";

export type AuthPayload = {
  dbUserId?: number;
  environment?: "development" | "production" | "local";
  role?: UserRole;
};
