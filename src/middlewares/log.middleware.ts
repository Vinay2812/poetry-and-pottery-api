import { NextFunction, Request, Response } from "express";

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
      console.log(message, {
        ...operation,
        responseTime: Date.now() - start,
        statusCode: res.statusCode,
        method: req.method,
        ip: req.ip,
        headers: {
          agent: req.headers["user-agent"],
          referer: req.headers["referer"],
          host: req.headers["host"],
          accept: req.headers["accept"],
          origin: req.headers["origin"],
          contentType: req.headers["content-type"],
          contentLength: req.headers["content-length"],
        },
        ...(req.body ? { body: req.body } : {}),
      });
    }
  });
  next();
};
