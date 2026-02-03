import { NextFunction, Request, Response } from "express";

import { logger } from "@/lib/logger";

// Operations to exclude from logging
const EXCLUDED_OPERATIONS = new Set<string>([]);

export const logMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();
  let message: string;

  let operation: any;

  if (req.originalUrl === "/graphql") {
    const resolver = req.body?.operationName || req.headers["operationname"];
    message = `GraphQL Operation ${resolver}`;
    operation = {
      resolver,
    };
  } else {
    message = `Request ${req.method} ${req.originalUrl}`;
    operation = { path: req.originalUrl };
  }

  res.once("finish", () => {
    // Skip logging for excluded operations
    if (!EXCLUDED_OPERATIONS.has(operation.resolver)) {
      logger.info(message, {
        ...operation,
        responseTime: `${Date.now() - start} ms`,
        statusCode: res.statusCode,
        method: req.method,
        ip: req.ip,
      });
    }
  });
  next();
};
