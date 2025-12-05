import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
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

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  /**
   * Safe listen logic:
   * - Default host to 127.0.0.1 (Windows-friendly)
   * - Allow override with HOST env var (set HOST=0.0.0.0 to listen externally)
   * - Avoid `reusePort` on Windows platforms where it may be unsupported
   * - Provide helpful logging and fallback behavior
   */
  const defaultPort = parseInt(process.env.PORT || "5000", 10);
  const hostEnv = (process.env.HOST || "").trim();
  const defaultHost = hostEnv || "127.0.0.1";
  const port = Number.isFinite(defaultPort) ? defaultPort : 5000;

  // Build listen options conditionally
  const isWindows = process.platform === "win32";
  const listenOptions: any = { port, host: defaultHost };
  // only include reusePort when not on Windows
  if (!isWindows) {
    listenOptions.reusePort = true;
  }

  function attemptListen(opts: any) {
    try {
      httpServer.listen(opts, () => {
        log(`serving on http://${opts.host}:${opts.port}`);
      });

      // attach an error listener to log any async listen errors
      httpServer.on("error", (err: any) => {
        log(`httpServer error: ${err?.code || err?.message || err}`, "server");
      });
    } catch (err: any) {
      log(`listen() threw error: ${err?.code || err?.message || err}`, "server");
      throw err;
    }
  }

  // Try primary bind first. If it fails synchronously, handle fallback.
  try {
    attemptListen(listenOptions);
  } catch (err) {
    // If binding to the chosen host fails, try localhost without reusePort (safe fallback)
    log(
      `Primary bind to ${listenOptions.host}:${listenOptions.port} failed (${(err && err.code) ||
        err}). Attempting fallback to 127.0.0.1:${listenOptions.port}`,
      "server",
    );

    try {
      const fallback = { port: listenOptions.port, host: "127.0.0.1" };
      attemptListen(fallback);
    } catch (err2) {
      log(
        `Fallback bind to 127.0.0.1:${listenOptions.port} also failed: ${(err2 && err2.code) || err2}`,
        "server",
      );
      log(
        `You can try a different port by setting the PORT environment variable (e.g. PORT=5001).`,
        "server",
      );
      // Re-throw so the process exits with a failure code for supervisors to notice
      throw err2;
    }
  }
})();