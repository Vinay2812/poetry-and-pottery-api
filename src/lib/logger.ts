import winston from "winston";

import { ENV } from "@/consts/env";

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.splat(),
    winston.format.json(),
    ...(ENV === "development" || ENV === "local"
      ? [
          winston.format.prettyPrint({
            colorize: true,
          }),
        ]
      : []),
  ),
  transports: [
    new winston.transports.Console({
      silent: false,
    }),
  ],
});
