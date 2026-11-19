
require("dotenv").config();

const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { PrismaClient } = require("@prisma/client");
const path = require("path");

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

// HTTP Order routes
app.use("/orders", require("./routes/orderRoutes"));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    message: "Order Service is running",
  });
});

// gRPC configuration
const PROTO_PATH = path.join(__dirname, "../proto/order.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition).order;

async function getOrdersByUser(call, callback) {
  try {
    const { userId } = call.request;

    if (!userId) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: "userId is required",
      });
    }

    const orders = await prisma.order.findMany({
      where: { userId },
    });

    callback(null, {
      orders: orders.map((order) => ({
        id: order.id,
        userId: order.userId,
        product: order.product,
        amount: order.amount,
        status: order.status,
      })),
    });
  } catch (error) {
    console.error("GetOrdersByUser failed:", error.message);

    callback({
      code: grpc.status.INTERNAL,
      message: "Unable to fetch orders",
    });
  }
}

async function startServer() {
  await prisma.$connect();
  console.log("Order database connected (PostgreSQL)");

  // Start HTTP server
  const HTTP_PORT = process.env.HTTP_PORT || 3002;

  const httpServer = app.listen(HTTP_PORT, "0.0.0.0", () => {
    console.log(`Order HTTP API listening on ${HTTP_PORT}`);
  });

  // Start gRPC server
  const grpcServer = new grpc.Server();

  grpcServer.addService(proto.OrderService.service, {
    getOrdersByUser,
  });

  const GRPC_PORT = process.env.GRPC_PORT || 50051;

  grpcServer.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        console.error("gRPC server failed:", error);
        process.exit(1);
      }

      console.log(`Order gRPC server listening on ${port}`);
    }
  );

  // Graceful shutdown
  const shutdown = async () => {
    httpServer.close();

    grpcServer.tryShutdown(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch(async (error) => {
  console.error("Order Service startup failed:", error.message);
  await prisma.$disconnect();
  process.exit(1);
});
