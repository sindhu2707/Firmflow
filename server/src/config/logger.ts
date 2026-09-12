import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.nodeEnv === "production" ? "info" : "debug",
  // level: env.nodeEnv === "test" ? "silent" : env.nodeEnv === "production" ? "info" : "debug", {prevents spamming the test in cmd}
  transport:
    env.nodeEnv === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});