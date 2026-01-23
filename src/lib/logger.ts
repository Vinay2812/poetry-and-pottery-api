import winston from "winston";

import { ENV } from "@/consts/env";

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.prettyPrint({
      colorize: true,
    }),
  ),
  transports: [
    new winston.transports.Console({
      silent: false,
    }),
  ],
});
