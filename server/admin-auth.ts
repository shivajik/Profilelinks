import { type Request, type Response, type NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId: string;
    adminUserId: string;
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminUserId) {
    return res.status(401).json({ message: "Admin authentication required" });
  }
  next();
}
