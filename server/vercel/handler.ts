import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../routes";
import { createServer } from "http";

const app = express();

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

app.set("trust proxy", 1);

let initPromise: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const dummyServer = createServer(app);
        await registerRoutes(dummyServer, app);

        app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
          const status = err.status || err.statusCode || 500;
          const message = err.message || "Internal Server Error";
          console.error("Express error:", err);
          if (res.headersSent) {
            return next(err);
          }
          return res.status(status).json({ message });
        });
      } catch (err) {
        initPromise = null;
        throw err;
      }
    })();
  }
  return initPromise;
}

export default async function handler(req: any, res: any) {
  try {
    await ensureInitialized();
    app(req, res);
  } catch (err: any) {
    console.error("Serverless handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal server error", detail: err.message });
    }
  }
}
