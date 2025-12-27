import { Request, Response } from "express";

import { ExtendedPrismaClient } from "@/lib/prisma";
import { AuthPayload } from "@/types/auth";
import { BaseContext } from "@apollo/server";

export interface Context extends BaseContext {
  user?: AuthPayload;
  prisma: ExtendedPrismaClient;
  request?: Request;
  response?: Response;
}
