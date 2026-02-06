import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      if (res.headersSent) {
        return next(err);
      }
      return res.status(status).json({ message });
    });

    initialized = true;
  }
}

export default async function handler(req: any, res: any) {
  try {
    await ensureInitialized();
    app(req, res);
  } catch (err: any) {
    console.error("Serverless handler error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
