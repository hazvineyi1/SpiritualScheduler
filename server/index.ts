import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { pool } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const MemoryStore = createMemoryStore(session);
const PgStore = connectPgSimple(session);
const isProd = app.get("env") === "production";
const sessionSecret = process.env.SESSION_SECRET || (isProd ? "" : "vashava-dev-secret");
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set in production");
}
app.set("trust proxy", 1);
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    // Sessions persist across restarts when a database is configured;
    // otherwise fall back to the original in-memory store for local dev.
    store: pool
      ? new PgStore({ pool, tableName: "session", createTableIfMissing: true })
      : new MemoryStore({ checkPeriod: 86400000 }),
    cookie: { httpOnly: true, sameSite: "lax", secure: isProd, maxAge: 7 * 24 * 60 * 60 * 1000 },
  }),
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await storage.initialize();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
