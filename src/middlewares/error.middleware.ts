import { NextFunction, Request, Response } from "express";

import { logger } from "@/lib/logger";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error("[Error Middleware] Error occurred", {
    message: err.message,
    stack: err.stack,
    statusCode: res.statusCode,
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
    },
  });
  next(err);
};
