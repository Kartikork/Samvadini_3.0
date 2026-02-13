const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const compression = require("compression");
const path = require("path");
const redisClient = require("./utils/redisClient");

dotenv.config();
const app = express();

// -------------------- Middleware --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false, // relax CSP for React
  })
);
app.use(morgan("dev"));
// Enable gzip/deflate compression for responses
app.use(
  compression({
    threshold: 1024,
  })
);

// -------------------- Expo Static --------------------

// Serve static assets for /_expo
app.use(
  "/_expo",
  express.static(path.join(__dirname, "dist/_expo"), {
    etag: true,
    lastModified: true,
    maxAge: "1y",
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  })
);

// Handle GET requests to /_expo/*
app.get("/_expo/*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Handle POST requests to /_expo/*
app.post("/_expo/*", (req, res) => {
  console.log("POST /_expo hit");
  console.log("Body:", req.body);
  res.json({ status: "ok", received: req.body });
});

// Logger for /expo
app.use("/expo", (req, res, next) => {
  next();
});

// Serve nested assets (dist/assets/assets)
app.use(
  "/expo/assets",
  express.static(path.join(__dirname, "dist/assets/assets"), {
    etag: true,
    lastModified: true,
    maxAge: "1y",
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  })
);

// Serve assets at the root path expected by React
app.use(
  "/assets",
  express.static(path.join(__dirname, "dist/assets"), {
    etag: true,
    lastModified: true,
    maxAge: "1y",
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  }) 
);

// Explicit asset hand
app.get("/assets/*", (req, res, next) => {
  const requestedPath = req.path.replace(/^\/assets\//, "");
  const filePath = path.join(__dirname, "dist/assets", requestedPath);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(filePath, (err) => {
    if (err) return next();
  });
});

// Serve main dist files (index.html, favicon, metadata.json, etc.)
app.use(
  "/expo",
  express.static(path.join(__dirname, "dist"), {
    etag: true,
    lastModified: true,
    maxAge: "1h",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    },
  })
);

// Always return index.html for React routes under /expo
app.get("/expo/*", (req, res) => {
  const startNs = process.hrtime.bigint();
  res.sendFile(path.join(__dirname, "dist", "index.html"), (err) => {
    const endNs = process.hrtime.bigint();
    const durationMs = Number(endNs - startNs) / 1e6;
    try {
      res.setHeader("Server-Timing", `html;dur=${durationMs.toFixed(1)}`);
    } catch (_) {}
    console.log(`⏱️ /expo HTML server time: ${durationMs.toFixed(1)} ms`);
    if (err) {
      console.error("Error sending /expo index.html:", err);
    }
  });
});

// -------------------- Other Static Folders --------------------
app.use(express.static("html"));
app.use(express.static(path.join(__dirname, "public")));

// -------------------- MongoDB --------------------
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/anuvadini_language",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// -------------------- API Routes --------------------
const routes = require("./routes");
app.use("/api", routes);

// -------------------- Skribble Game --------------------
app.get("/skribble", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "skribble.html"));
});

app.get("/api/skribble-url", (req, res) => {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? process.env.BASE_URL || req.protocol + "://" + req.get("host")
      : "http://localhost:" + PORT;

  res.json({
    url: `${baseUrl}/skribble`,
  }); 
});

// -------------------- Privacy Policy --------------------
app.get("/privacypolicy", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "privacypolicy.html"));
});

// -------------------- React SPA Fallback --------------------
// Any non-API, non-assets route should return index.html
app.get("*", (req, res, next) => {
  if (
    req.originalUrl.startsWith("/api") ||
    req.originalUrl.startsWith("/assets")
  ) {
    return next();
  }
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// -------------------- Error Handling --------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// -------------------- Start Server --------------------
const { setupWebSocket } = require("./server");
const PORT = process.env.PORT || 7273;
const startAntaksharServer = require("./antakshariserver");
const { startServer } = require("./skribbleserver");

const server = app.listen(PORT,  () => {
  // console.log(`🚀 Server is running on port ${PORT}`);
  // setupWebSocket(server);

  // console.log("🎮 Skribble game server initialized");

  // Start Antakshari WS server on the same HTTP server at path /antakshari
  
  startAntaksharServer(server, { path: "/antak" });
  console.log("🎵 Antakshari WebSocket server attached");
  // startServer(server);
});



module.exports = { app, server };