import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";
import { authRouter } from "./routes/auth.js";
import { participantsRouter } from "./routes/participants.js";
import { scanRouter } from "./routes/scan.js";
import { passagesRouter } from "./routes/passages.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { alertsRouter } from "./routes/alerts.js";
import { badgesRouter } from "./routes/badges.js";
import { reportsRouter } from "./routes/reports.js";
import { exportsRouter } from "./routes/exports.js";
import { settingsRouter } from "./routes/settings.js";
import { usersRouter } from "./routes/users.js";
import { publicRouter } from "./routes/public.js";
import { errorHandler } from "./middleware/error.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") ?? true,
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Public uploads (read only)
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Rate-limit auth
app.use("/api/auth/login", rateLimit({ windowMs: 60_000, max: 10 }));

// API
app.use("/api/auth", authRouter);
app.use("/api/participants", participantsRouter);
app.use("/api/scan", scanRouter);
app.use("/api/passages", passagesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/badges", badgesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/exports", exportsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/users", usersRouter);
app.use("/api/public", publicRouter);
app.use("/", publicRouter); // /p/:qrToken, /badge/:qrToken

// Serve frontend (production, TanStack Start SSR)
const frontendDist = process.env.FRONTEND_DIST
  ? path.resolve(process.env.FRONTEND_DIST)
  : path.resolve(process.cwd(), "../client/dist");
const clientDist = path.join(frontendDist, "client");
const serverEntryPath = path.join(frontendDist, "server", "server.js");
type FrontendServer = { default: { fetch: (request: Request, env?: unknown, ctx?: unknown) => Promise<Response> } };
let frontendServerPromise: Promise<FrontendServer> | null = null;

app.use(express.static(clientDist));
app.get("*", async (req, res, next) => {
  try {
    frontendServerPromise ??= import(pathToFileURL(serverEntryPath).href) as Promise<FrontendServer>;
    const frontendServer = await frontendServerPromise;
    const requestHeaders = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) requestHeaders.set(key, value.join(", "));
      else if (value !== undefined) requestHeaders.set(key, value);
    }

    const response = await frontendServer.default.fetch(
      new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: req.method,
        headers: requestHeaders,
      }),
      {},
      {},
    );

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

const PORT = Number(process.env.APP_PORT || 3330);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[CIRT Badge Check] API + Web sur http://localhost:${PORT}`);
});
