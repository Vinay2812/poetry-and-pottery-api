import { Request, Response } from "express";

export const errorMiddleware = (err: Error, req: Request, res: Response) => {
  console.error(err);
  res.status(500).json({
    status: "error",
    success: false,
    message: "Internal server error",
  });
};
