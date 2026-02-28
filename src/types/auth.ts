import { UserRole } from "@/prisma/generated/client";

export type AuthPayload = {
  dbUserId?: number;
  role?: UserRole;
};
