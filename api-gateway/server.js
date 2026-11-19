require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");

const verifyToken = require("./middleware/authMiddleware");
const rateLimit = require("express-rate-limit");

const app = express();

// Logging
app.use(morgan("dev"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

app.use(limiter);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    message: "API Gateway is running",
  });
});

// Public routes: Login and Register
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/auth${path}`,
  })
);

// Protected routes: User Service
app.use(
  "/api/users",
  verifyToken,
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/users${path}`,
  })
);

// Protected routes: Order Service
app.use(
  "/api/orders",
  verifyToken,
  createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/orders${path}`,
  })
);

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});